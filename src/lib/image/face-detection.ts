import {
  FaceDetector,
  FaceLandmarker,
  FilesetResolver,
  type Detection,
} from "@mediapipe/tasks-vision";

export type DetectedFaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FaceDetectionResult = {
  box: DetectedFaceBox | null;
  boxes: DetectedFaceBox[];
  supported: boolean;
  faceCount: number;
};

let detectorPromise: Promise<FaceDetector | null> | null = null;
let landmarkerPromise: Promise<FaceLandmarker | null> | null = null;

export async function withSuppressedTfliteInfo<T>(task: () => Promise<T>) {
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;
  const shouldSuppress = (args: unknown[]) => {
    const first = args[0];
    return (
      typeof first === "string" &&
      first.includes("Created TensorFlow Lite XNNPACK delegate for CPU")
    );
  };
  console.info = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalInfo(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalError(...args);
  };
  console.log = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalLog(...args);
  };

  try {
    return await task();
  } finally {
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
    console.log = originalLog;
  }
}

async function getMediaPipeFaceDetector() {
  if (typeof window === "undefined") return null;
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        return await withSuppressedTfliteInfo(async () => {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
          );

          return await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
            },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.45,
          });
        });
      } catch {
        return null;
      }
    })();
  }
  return detectorPromise;
}

export async function getMediaPipeFaceLandmarker() {
  if (typeof window === "undefined") return null;
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      try {
        return await withSuppressedTfliteInfo(async () => {
          const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
          );

          return await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            },
            runningMode: "IMAGE",
            numFaces: 2,
          });
        });
      } catch {
        return null;
      }
    })();
  }
  return landmarkerPromise;
}

function mapDetectionToBox(detection: Detection | undefined): DetectedFaceBox | null {
  const box = detection?.boundingBox;
  if (!box) return null;
  return {
    x: box.originX,
    y: box.originY,
    width: box.width,
    height: box.height,
  };
}

export async function detectFaceBox(image: HTMLImageElement): Promise<FaceDetectionResult> {
  if (typeof window === "undefined") {
    return { box: null, boxes: [], supported: false, faceCount: 0 };
  }

  const mpDetector = await getMediaPipeFaceDetector();
  if (mpDetector) {
    try {
      const result = await withSuppressedTfliteInfo(async () => mpDetector.detect(image));
      const detections = result.detections ?? [];
      const sorted = detections
        .slice()
        .sort(
          (a, b) =>
            (b.boundingBox?.width ?? 0) * (b.boundingBox?.height ?? 0) -
            (a.boundingBox?.width ?? 0) * (a.boundingBox?.height ?? 0)
        );
      const boxes = sorted.map((item) => mapDetectionToBox(item)).filter((item): item is DetectedFaceBox => Boolean(item));
      const box = boxes[0] ?? null;
      const faceCount = detections.length;

      return {
        box,
        boxes,
        supported: true,
        faceCount,
      };
    } catch {
      // Fall through to native detector below.
    }
  }

  const FaceDetectorCtor = (
    window as Window & {
      FaceDetector?: new (...args: unknown[]) => {
        detect: (
          source: HTMLImageElement | ImageBitmap
        ) => Promise<Array<{ boundingBox: { x: number; y: number; width: number; height: number } }>>;
      };
    }
  ).FaceDetector;

  if (!FaceDetectorCtor) {
    return { box: null, boxes: [], supported: false, faceCount: 0 };
  }

  try {
    const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 } as never);
    const faces = await withSuppressedTfliteInfo(async () => detector.detect(image));
    const first = faces[0];
    if (!first) return { box: null, boxes: [], supported: true, faceCount: 0 };
    const primaryBox = {
      x: first.boundingBox.x,
      y: first.boundingBox.y,
      width: first.boundingBox.width,
      height: first.boundingBox.height,
    };
    return {
      box: primaryBox,
      boxes: [primaryBox],
      supported: true,
      faceCount: faces.length,
    };
  } catch {
    return { box: null, boxes: [], supported: true, faceCount: 0 };
  }
}

export async function analyzeFaceFrontal(
  image: HTMLImageElement,
  box: DetectedFaceBox
): Promise<{ isFrontal: boolean; frontalScore: number }> {
  const landmarker = await getMediaPipeFaceLandmarker();
  if (!landmarker) return { isFrontal: true, frontalScore: 0.6 };

  try {
    const crop = cropFaceRegion(image, box);
    const result = await withSuppressedTfliteInfo(async () => landmarker.detect(crop));
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks || landmarks.length < 264) return { isFrontal: true, frontalScore: 0.6 };

    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseTip = landmarks[1];
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeDist = Math.abs(rightEye.x - leftEye.x);
    if (eyeDist < 0.001) return { isFrontal: true, frontalScore: 0.6 };

    const yawNorm = Math.abs(noseTip.x - eyeMidX) / eyeDist;
    const rollNorm = Math.abs(leftEye.y - rightEye.y) / eyeDist;
    const frontalScore = Math.max(0, 1 - (yawNorm * 1.6 + rollNorm * 0.8));
    return {
      isFrontal: frontalScore >= 0.62,
      frontalScore: Number(frontalScore.toFixed(2)),
    };
  } catch {
    return { isFrontal: true, frontalScore: 0.6 };
  }
}

function cropFaceRegion(image: HTMLImageElement, box: DetectedFaceBox) {
  const pad = 0.35;
  const x = Math.max(0, box.x - box.width * pad);
  const y = Math.max(0, box.y - box.height * pad);
  const w = Math.min(image.naturalWidth - x, box.width * (1 + pad * 2));
  const h = Math.min(image.naturalHeight - y, box.height * (1 + pad * 2));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

