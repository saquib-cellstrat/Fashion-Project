"use client";

/**
 * useFaceMesh.ts
 *
 * Hook: runs MediaPipe FaceLandmarker on a static image (IMAGE mode) or a
 * live video element (VIDEO mode) and returns 468 landmarks + the 4×4
 * facial transformation matrix for head pose.
 *
 * Deliberately reuses the existing getMediaPipeFaceLandmarker() singleton
 * so no model is loaded twice.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getMediaPipeFaceLandmarker, withSuppressedTfliteInfo } from "@/lib/image/face-detection";
import type { NormalizedLandmark } from "@/lib/image/face-landmarks";

export type FaceMeshData = {
  /** Full 468 landmarks in normalized [0–1] image space (with z depth). */
  landmarks: NormalizedLandmark[];
  /**
   * 16-element column-major matrix from MediaPipe facial_transformation_matrix.
   * Encodes pitch / yaw / roll + translation + scale in camera space.
   * null if the model didn't return one (e.g. no face detected).
   */
  transformMatrix: Float32Array | null;
  /** true when a face was found in the last inference */
  detected: boolean;
  /** true while async inference is running */
  loading: boolean;
};

const EMPTY: FaceMeshData = {
  landmarks: [],
  transformMatrix: null,
  detected: false,
  loading: false,
};

// ---------------------------------------------------------------------------
// IMAGE mode hook
// ---------------------------------------------------------------------------

/**
 * Runs face mesh detection once whenever `image` changes.
 *
 * @param image  HTMLImageElement to detect on (null to skip)
 * @returns FaceMeshData
 */
export function useFaceMeshImage(image: HTMLImageElement | null): FaceMeshData {
  const [data, setData] = useState<FaceMeshData>(EMPTY);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!image) {
      setData(EMPTY);
      return;
    }

    cancelRef.current = false;
    setData((prev) => ({ ...prev, loading: true }));

    let canvas: HTMLCanvasElement | null = null;

    const run = async () => {
      const landmarker = await getMediaPipeFaceLandmarker();
      if (!landmarker || cancelRef.current) return;

      try {
        // Downscale for performance inside a canvas
        const maxDim = 512;
        let w = image.naturalWidth || image.width || maxDim;
        let h = image.naturalHeight || image.height || maxDim;
        if (w > maxDim || h > maxDim) {
          const scale = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        canvas = document.createElement("canvas");
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext("2d");
        if (!ctx || cancelRef.current) return;
        ctx.drawImage(image, 0, 0, w, h);

        const result = await withSuppressedTfliteInfo(async () =>
          landmarker.detect(canvas!)
        );

        if (cancelRef.current) return;

        const rawLandmarks = result.faceLandmarks?.[0];
        if (!rawLandmarks || rawLandmarks.length < 400) {
          setData({ landmarks: [], transformMatrix: null, detected: false, loading: false });
          return;
        }

        const landmarks: NormalizedLandmark[] = rawLandmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }));

        // Extract 4×4 facial transformation matrix (row-major from MediaPipe)
        // MediaPipe returns data as a MatrixData object with a flat `data` Float32Array
        let transformMatrix: Float32Array | null = null;
        const rawMatrix = result.facialTransformationMatrixes?.[0];
        if (rawMatrix?.data && rawMatrix.data.length === 16) {
          // MediaPipe gives row-major; we store as-is and transpose in shader usage
          transformMatrix = new Float32Array(rawMatrix.data);
        }

        setData({ landmarks, transformMatrix, detected: true, loading: false });
      } catch (err) {
        console.error("[useFaceMesh] Detection failed:", err);
        if (!cancelRef.current) {
          setData({ landmarks: [], transformMatrix: null, detected: false, loading: false });
        }
      }
    };

    run();

    return () => {
      cancelRef.current = true;
    };
  }, [image]);

  return data;
}

// ---------------------------------------------------------------------------
// VIDEO mode hook (webcam / live feed)
// ---------------------------------------------------------------------------

export type VideoFaceMeshOptions = {
  /** Target frames per second for inference. Default 15. */
  targetFps?: number;
};

/**
 * Runs face mesh detection on every frame of a video element.
 *
 * @param videoRef  React ref pointing to an HTMLVideoElement
 * @param enabled   Whether to actively process frames
 * @param options   Optional FPS target
 */
export function useFaceMeshVideo(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean,
  options: VideoFaceMeshOptions = {}
): FaceMeshData {
  const { targetFps = 15 } = options;
  const [data, setData] = useState<FaceMeshData>(EMPTY);
  const rafRef = useRef<number>(0);
  const lastTimestamp = useRef<number>(0);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      setData(EMPTY);
      return;
    }

    let landmarker: Awaited<ReturnType<typeof getMediaPipeFaceLandmarker>> = null;

    const init = async () => {
      landmarker = await getMediaPipeFaceLandmarker();
      if (!landmarker || !runningRef.current) return;
      loop();
    };

    const intervalMs = 1000 / targetFps;

    const loop = () => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame((now) => {
        if (now - lastTimestamp.current < intervalMs) {
          loop();
          return;
        }
        lastTimestamp.current = now;

        const video = videoRef.current;
        if (!video || video.readyState < 2 || !landmarker) {
          loop();
          return;
        }

        try {
          // VIDEO mode: pass timestamp for temporal filtering
          const result = landmarker.detectForVideo(video, now);

          const rawLandmarks = result.faceLandmarks?.[0];
          if (!rawLandmarks || rawLandmarks.length < 400) {
            setData((prev) => ({ ...prev, detected: false, loading: false }));
            loop();
            return;
          }

          const landmarks: NormalizedLandmark[] = rawLandmarks.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
          }));

          let transformMatrix: Float32Array | null = null;
          const rawMatrix = result.facialTransformationMatrixes?.[0];
          if (rawMatrix?.data && rawMatrix.data.length === 16) {
            transformMatrix = new Float32Array(rawMatrix.data);
          }

          setData({ landmarks, transformMatrix, detected: true, loading: false });
        } catch {
          /* silently skip frames on error */
        }

        loop();
      });
    };

    runningRef.current = true;
    init();

    return stop;
  }, [enabled, targetFps, stop, videoRef]);

  return data;
}
