"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Circle } from "react-konva";
import type { HairstyleTemplate, Variation } from "@/types/editor";
import type Konva from "konva";
import { normalizeHairAnchor } from "@/config/hair-anchors";
import {
  detectFaceLandmarksNormalized,
  estimateSkullTopY,
  extractLandmarkGroups,
  FACE_CONTOUR_36_INDICES,
  HEAD_CAP_INDICES,
  type NormalizedLandmark,
  type NormalizedPoint2,
} from "@/lib/image/face-landmarks";
import { computeCorrespondenceOverlay } from "@/lib/image/hair-correspondence-fit";
import { detectFaceBox } from "@/lib/image/face-detection";
import { FaceLandmarkDots } from "./FaceLandmarkDots";
import { useHairAutoFit } from "./use-hair-auto-fit";
import { MLSWarpCanvas } from "./MLSWarpCanvas";
import { type Point2 } from "@/lib/image/mlsWarp";
import { SEMANTIC_LANDMARK_INDICES, type SemanticLandmarkId } from "@/lib/image/face-landmarks";
import { useOpenCvReady } from "@/lib/image/use-opencv-ready";

type Props = {
  hairstyle: HairstyleTemplate | null;
  selectedVariation: Variation | null;
  selectedColorHex: string | null;
  sourceProfileImageUrl: string | null;
  showFaceLandmarks?: boolean;
  showHairLandmarks?: boolean;
  showFaceContourDebug?: boolean;
  showHairContourDebug?: boolean;
  onOverlayControlsReady?: (
    controls:
      | {
          decreaseOpacity: () => void;
          increaseOpacity: () => void;
          resetOverlay: () => void;
        }
      | null
  ) => void;
  onExportReady?: ((exportFn: (() => void) | null) => void) | undefined;
  fitEngine?: "affine" | "mls";
  title?: string;
  poissonBlendApplied?: boolean;
};

export function EditorCanvas({
  hairstyle,
  selectedVariation,
  selectedColorHex,
  sourceProfileImageUrl,
  showFaceLandmarks = false,
  showHairLandmarks = false,
  showFaceContourDebug = false,
  showHairContourDebug = false,
  onOverlayControlsReady,
  onExportReady,
  fitEngine = "mls",
  title,
  poissonBlendApplied = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [manualTransform, setManualTransform] = useState<{ x: number; y: number; scale: number; rotation: number } | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [baseLandmarks, setBaseLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [overlayOval36Detected, setOverlayOval36Detected] = useState<NormalizedPoint2[] | null>(null);
  const [overlayHeadCapDetected, setOverlayHeadCapDetected] = useState<NormalizedPoint2[] | null>(null);
  const [baseFaceBoxNorm, setBaseFaceBoxNorm] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
  const { ready: isOpenCvReady, error: openCvError } = useOpenCvReady();
  const mlsImageRef = useRef<Konva.Image>(null);

  const handleCanvasReady = useCallback((c: HTMLCanvasElement) => {
    setWarpedCanvas(c);
    if (mlsImageRef.current) {
      mlsImageRef.current.getLayer()?.batchDraw();
    }
  }, []);

  // Resize canvas to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(container);
    // Initial size
    setDimensions({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    return () => observer.disconnect();
  }, []);

  // Load source profile image (base layer)
  useEffect(() => {
    if (!sourceProfileImageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    let isActive = true;
    img.src = sourceProfileImageUrl;
    img.onload = () => {
      if (isActive) setBaseImage(img);
    };
    return () => {
      isActive = false;
    };
  }, [sourceProfileImageUrl]);

  // Full landmark mesh for overlay + correspondence fit (same normalized space as head auto-fit).
  useEffect(() => {
    const img = sourceProfileImageUrl ? baseImage : null;
    if (!img) {
      queueMicrotask(() => setBaseLandmarks(null));
      return;
    }
    let cancelled = false;
    void detectFaceLandmarksNormalized(img).then((res) => {
      if (!cancelled) setBaseLandmarks(res?.landmarks ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceProfileImageUrl, baseImage]);

  // Secondary detection signal: face box, used to infer top-of-head coverage.
  useEffect(() => {
    const img = sourceProfileImageUrl ? baseImage : null;
    if (!img) {
      queueMicrotask(() => setBaseFaceBoxNorm(null));
      return;
    }
    let cancelled = false;
    void detectFaceBox(img).then((result) => {
      if (cancelled || !result.box) {
        if (!cancelled) setBaseFaceBoxNorm(null);
        return;
      }
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      setBaseFaceBoxNorm({
        x: result.box.x / w,
        y: result.box.y / h,
        width: result.box.width / w,
        height: result.box.height / h,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sourceProfileImageUrl, baseImage]);

  // Load selected hairstyle variation (mock overlay layer)
  useEffect(() => {
    if (!selectedVariation?.thumbnailUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    let isActive = true;
    img.src = selectedVariation.thumbnailUrl;
    img.onload = () => {
      if (isActive) setOverlayImage(img);
    };
    return () => {
      isActive = false;
    };
  }, [selectedVariation?.thumbnailUrl]);

  // Fallback: detect dual contour groups directly on current hair image when template metadata is unavailable.
  useEffect(() => {
    const overlayForDetection = selectedVariation ? overlayImage : null;
    if (!overlayForDetection || (hairstyle?.templateOval36?.length && hairstyle?.templateHeadCap?.length)) {
      queueMicrotask(() => {
        setOverlayOval36Detected(null);
        setOverlayHeadCapDetected(null);
      });
      return;
    }
    let cancelled = false;
    void detectFaceLandmarksNormalized(overlayForDetection).then((res) => {
      if (cancelled) return;
      const groups = extractLandmarkGroups(res?.landmarks ?? null);
      setOverlayOval36Detected(groups.oval36.length ? groups.oval36 : null);
      setOverlayHeadCapDetected(groups.headCap.length ? groups.headCap : null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedVariation, overlayImage, hairstyle?.templateOval36, hairstyle?.templateHeadCap]);

  useEffect(() => {
    queueMicrotask(() => {
      setManualTransform(null);
      setOverlayOpacity(1);
      setWarpedCanvas(null);
    });
  }, [selectedVariation?.id]);

  // Keep portrait centered without cutting head/hair.
  const getImageProps = useCallback(() => {
    if (!baseImage) return null;

    const frameWidth = dimensions.width * 0.82;
    const frameHeight = dimensions.height * 0.9;
    const canvasRatio = frameWidth / frameHeight;
    const imgRatio = baseImage.width / baseImage.height;

    let drawWidth: number;
    let drawHeight: number;

    if (imgRatio > canvasRatio) {
      drawWidth = frameWidth;
      drawHeight = drawWidth / imgRatio;
    } else {
      drawHeight = frameHeight;
      drawWidth = drawHeight * imgRatio;
    }

    const drawX = (dimensions.width - drawWidth) / 2;
    const drawY = (dimensions.height - drawHeight) / 2;

    return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
  }, [baseImage, dimensions]);

  const imgProps = useMemo(() => getImageProps(), [getImageProps]);

  const activeBaseImage = sourceProfileImageUrl ? baseImage : null;
  const activeOverlayImage = selectedVariation ? overlayImage : null;

  const { autoFitTransform, isDetecting, isDetected, fitSource } = useHairAutoFit(
    activeBaseImage,
    hairstyle ? normalizeHairAnchor(hairstyle.anchor) : null,
    imgProps,
    activeOverlayImage
  );

  const baseCenterX = imgProps ? imgProps.x + imgProps.width / 2 : 0;
  const baseCenterY = imgProps ? imgProps.y + imgProps.height / 2 : 0;
  const referenceWidth = imgProps ? imgProps.width : 500;

  const hairNaturalW = activeOverlayImage ? activeOverlayImage.naturalWidth || activeOverlayImage.width : 1;
  const hairNaturalH = activeOverlayImage ? activeOverlayImage.naturalHeight || activeOverlayImage.height : 1;

  const correspondenceTransform = useMemo(() => {
    if (fitEngine !== "affine" || !imgProps || !activeOverlayImage || !hairstyle) return null;
    return computeCorrespondenceOverlay(
      hairstyle.calibrationPoints,
      baseLandmarks,
      imgProps,
      hairNaturalW,
      hairNaturalH,
      referenceWidth,
      baseCenterX,
      baseCenterY
    );
  }, [
    fitEngine,
    hairstyle,
    baseLandmarks,
    imgProps,
    activeOverlayImage,
    hairNaturalW,
    hairNaturalH,
    referenceWidth,
    baseCenterX,
    baseCenterY,
  ]);

  const mlsPoints = useMemo(() => {
    if (fitEngine !== "mls" || !hairstyle || !baseLandmarks?.length || !imgProps || !activeOverlayImage) return null;

    const src: Point2[] = [];
    const dst: Point2[] = [];
    const calib = hairstyle.calibrationPoints ?? {};
    const usedIndices = new Set<number>();
    const baseGroups = extractLandmarkGroups(baseLandmarks);
    const hairOval = hairstyle.templateOval36?.length ? hairstyle.templateOval36 : overlayOval36Detected;
    const hairHeadCap = hairstyle.templateHeadCap?.length ? hairstyle.templateHeadCap : overlayHeadCapDetected;

    const pairGroup = (
      srcGroup: NormalizedPoint2[] | null | undefined,
      dstGroup: NormalizedPoint2[],
      groupIndices: readonly number[],
      repeat = 1
    ) => {
      if (!srcGroup?.length || !dstGroup.length) return;
      const n = Math.min(srcGroup.length, dstGroup.length);
      for (let i = 0; i < n; i++) {
        const s = srcGroup[i];
        const d = dstGroup[i];
        for (let r = 0; r < repeat; r++) {
          src.push({ x: s.x * hairNaturalW, y: s.y * hairNaturalH });
          dst.push({
            x: imgProps.x + d.x * imgProps.width,
            y: imgProps.y + d.y * imgProps.height,
          });
        }
        usedIndices.add(groupIndices[i] ?? -1);
      }
    };

    const pickByIds = (
      points: NormalizedPoint2[] | null | undefined,
      allIds: readonly number[],
      keepIds: readonly number[]
    ): { id: number; point: NormalizedPoint2 }[] => {
      if (!points?.length) return [];
      const out: { id: number; point: NormalizedPoint2 }[] = [];
      for (const id of keepIds) {
        const idx = allIds.indexOf(id);
        if (idx < 0 || idx >= points.length) continue;
        const point = points[idx];
        if (!point) continue;
        out.push({ id, point });
      }
      return out;
    };

    // T-zone focused oval points: temples + upper cheeks + forehead arc (jaw/chin removed).
    const keptOvalIds = [127, 109, 67, 10, 338, 297, 356, 103, 332, 54] as const;
    const srcOvalPairs = pickByIds(hairOval, FACE_CONTOUR_36_INDICES, keptOvalIds);
    const dstOvalPairs = pickByIds(baseGroups.oval36, FACE_CONTOUR_36_INDICES, keptOvalIds);
    const dstOvalById = new Map(dstOvalPairs.map((entry) => [entry.id, entry.point]));
    const srcOvalById = new Map(srcOvalPairs.map((entry) => [entry.id, entry.point]));

    for (const { id, point: s } of srcOvalPairs) {
      const d = dstOvalById.get(id);
      if (!d) continue;
      const repeat = id === 109 || id === 338 ? 4 : id === 10 ? 3 : 2;
      for (let r = 0; r < repeat; r++) {
        src.push({ x: s.x * hairNaturalW, y: s.y * hairNaturalH });
        dst.push({
          x: imgProps.x + d.x * imgProps.width,
          y: imgProps.y + d.y * imgProps.height,
        });
      }
      usedIndices.add(id);
    }

    // Reduced head-cap points (max 5): top-center, upper corners, temples.
    const keptHeadCapIds = [10, 67, 297, 109, 338] as const;
    const srcHeadCapPairs = pickByIds(hairHeadCap, HEAD_CAP_INDICES, keptHeadCapIds);
    const dstHeadCapPairs = pickByIds(baseGroups.headCap, HEAD_CAP_INDICES, keptHeadCapIds);
    const skullTopY = estimateSkullTopY(baseLandmarks);
    const eyeLineY = (() => {
      const left = baseLandmarks[33];
      const right = baseLandmarks[263];
      return left && right ? (left.y + right.y) * 0.5 : null;
    })();

    // Optional temple/corner smoothing around the eye-line to prevent bumpy domes.
    const smoothedDstById = new Map<number, NormalizedPoint2>();
    for (const entry of dstHeadCapPairs) {
      smoothedDstById.set(entry.id, { ...entry.point });
    }
    if (eyeLineY != null) {
      const leftCorner = smoothedDstById.get(67);
      const rightCorner = smoothedDstById.get(297);
      if (leftCorner && rightCorner) {
        const avgOffset = ((leftCorner.y - eyeLineY) + (rightCorner.y - eyeLineY)) * 0.5;
        leftCorner.y = eyeLineY + avgOffset;
        rightCorner.y = eyeLineY + avgOffset;
      }
      const leftTemple = smoothedDstById.get(109);
      const rightTemple = smoothedDstById.get(338);
      if (leftTemple && rightTemple) {
        const avgOffset = ((leftTemple.y - eyeLineY) + (rightTemple.y - eyeLineY)) * 0.5;
        leftTemple.y = eyeLineY + avgOffset;
        rightTemple.y = eyeLineY + avgOffset;
      }
    }

    for (const { id, point: s } of srcHeadCapPairs) {
      const d = smoothedDstById.get(id);
      if (!d) continue;
      const repeat = id === 10 || id === 109 || id === 338 ? 5 : 2;
      for (let r = 0; r < repeat; r++) {
        src.push({ x: s.x * hairNaturalW, y: s.y * hairNaturalH });
        dst.push({
          x: imgProps.x + d.x * imgProps.width,
          y: imgProps.y + d.y * imgProps.height,
        });
      }
      usedIndices.add(id);
    }

    // Synthetic crown pull: keep hairline pinned while stretching only upper hair volume.
    if (skullTopY != null) {
      const leftTempleX = smoothedDstById.get(109)?.x ?? dstOvalById.get(109)?.x;
      const rightTempleX = smoothedDstById.get(338)?.x ?? dstOvalById.get(338)?.x;
      const hasTempleCenter = leftTempleX != null && rightTempleX != null;
      const crownCenterX = hasTempleCenter
        ? (leftTempleX + rightTempleX) * 0.5
        : ((baseLandmarks[109]?.x ?? 0.5) + (baseLandmarks[338]?.x ?? 0.5)) * 0.5;

      for (let i = 0; i < 8; i++) {
        src.push({
          x: 0.5 * hairNaturalW,
          y: 0.02 * hairNaturalH,
        });
        dst.push({
          x: imgProps.x + crownCenterX * imgProps.width,
          y: imgProps.y + skullTopY * imgProps.height,
        });
      }
    }

    // Safety fallback if no head-cap data exists: still enforce a strong crown anchor.
    if (!srcHeadCapPairs.length && skullTopY != null) {
      const leftTempleX = dstOvalById.get(109)?.x ?? baseLandmarks[109]?.x;
      const rightTempleX = dstOvalById.get(338)?.x ?? baseLandmarks[338]?.x;
      if (leftTempleX != null && rightTempleX != null) {
        const crownCenterX = (leftTempleX + rightTempleX) * 0.5;
        for (let i = 0; i < 8; i++) {
          src.push({
            x: 0.5 * hairNaturalW,
            y: 0.02 * hairNaturalH,
          });
          dst.push({
            x: imgProps.x + crownCenterX * imgProps.width,
            y: imgProps.y + skullTopY * imgProps.height,
          });
        }
      }
    }

    for (const id of Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[]) {
      const pt = calib[id];
      if (!pt) continue;
      const idx = SEMANTIC_LANDMARK_INDICES[id];
      if (usedIndices.has(idx)) continue;
      
      const lm = baseLandmarks[idx];
      if (!lm) continue;

      src.push({
        x: pt.x * hairNaturalW,
        y: pt.y * hairNaturalH,
      });

      dst.push({
        x: imgProps.x + lm.x * imgProps.width,
        y: imgProps.y + lm.y * imgProps.height,
      });
    }

    if (src.length < 2) return null;
    return { src, dst };
  }, [
    fitEngine,
    hairstyle,
    baseLandmarks,
    baseFaceBoxNorm,
    imgProps,
    activeOverlayImage,
    hairNaturalW,
    hairNaturalH,
    overlayOval36Detected,
    overlayHeadCapDetected,
  ]);

  const useMlsFit = mlsPoints != null;
  const useCorrespondenceFit = correspondenceTransform != null;
  const isMlsReady = useMlsFit && warpedCanvas != null;

  const tintedOverlayImage = useMemo(() => {
    const img = isMlsReady ? warpedCanvas : overlayImage;
    if (!img || !selectedColorHex) return null;
    return createTintedHairMask(img, selectedColorHex);
  }, [isMlsReady, warpedCanvas, overlayImage, selectedColorHex]);

  const baseTransform = useMemo(() => {
    if (useMlsFit) {
      return { x: 0, y: 0, scale: 1, rotation: 0 };
    }
    if (useCorrespondenceFit) {
      return {
        x: correspondenceTransform!.offsetX,
        y: correspondenceTransform!.offsetY,
        scale: correspondenceTransform!.scale,
        rotation: correspondenceTransform!.rotation,
      };
    }
    return autoFitTransform;
  }, [useMlsFit, useCorrespondenceFit, correspondenceTransform, autoFitTransform]);

  const activeOffsetX = manualTransform?.x ?? baseTransform?.x ?? 0;
  const activeOffsetY = manualTransform?.y ?? baseTransform?.y ?? 0;
  const activeScale = manualTransform?.scale ?? baseTransform?.scale ?? 1;
  const activeRotation = manualTransform?.rotation ?? baseTransform?.rotation ?? 0;

  const hairRatio = activeOverlayImage ? activeOverlayImage.height / activeOverlayImage.width : 1;
  const heightStretch = hairstyle ? normalizeHairAnchor(hairstyle.anchor).heightStretch : 1;
  const overlayWidth = referenceWidth * activeScale;
  const overlayHeight = overlayWidth * hairRatio * (useMlsFit || useCorrespondenceFit ? 1 : heightStretch);
  const isManualAdjust = manualTransform != null;
  const baseLandmarkGroups = useMemo(() => extractLandmarkGroups(baseLandmarks), [baseLandmarks]);
  const poissonBlendStatusLabel = poissonBlendApplied
    ? "Poisson Blend: Applied"
    : isOpenCvReady
      ? "Poisson Blend: Off"
      : openCvError?.includes("does not expose seamlessClone")
        ? "Poisson Blend: Unsupported OpenCV build"
        : "Poisson Blend: Unavailable";
  const poissonBlendStatusClass = poissonBlendApplied
    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : isOpenCvReady
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : "bg-slate-500/15 text-slate-700 dark:text-slate-300";

  const currentDrawImage = isMlsReady ? warpedCanvas : activeOverlayImage;
  const currentDrawWidth = isMlsReady ? dimensions.width : overlayWidth;
  const currentDrawHeight = isMlsReady ? dimensions.height : overlayHeight;
  const currentOffsetX = isMlsReady ? baseCenterX : overlayWidth / 2;
  const currentOffsetY = isMlsReady ? baseCenterY : overlayHeight / 2;
  const currentScaleX = isMlsReady ? activeScale : 1;
  const currentScaleY = isMlsReady ? activeScale : 1;
  const mapHairNormalizedPointsToCanvas = useCallback(
    (points: NormalizedPoint2[] | null | undefined): NormalizedPoint2[] | null => {
      if (!points?.length || !imgProps) return null;

      if (useMlsFit && mlsPoints?.src.length && mlsPoints.dst.length) {
        const normalized: NormalizedPoint2[] = [];
        for (const p of points) {
          const px = p.x * hairNaturalW;
          const py = p.y * hairNaturalH;
          let bestIdx = -1;
          let bestDist = Number.POSITIVE_INFINITY;
          for (let i = 0; i < mlsPoints.src.length; i++) {
            const s = mlsPoints.src[i];
            const dist = (s.x - px) ** 2 + (s.y - py) ** 2;
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = i;
            }
          }
          if (bestIdx < 0) continue;
          const d = mlsPoints.dst[bestIdx];
          normalized.push({
            x: (d.x - imgProps.x) / imgProps.width,
            y: (d.y - imgProps.y) / imgProps.height,
          });
        }
        return normalized;
      }

      const theta = (activeRotation * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const drawX = baseCenterX + activeOffsetX;
      const drawY = baseCenterY + activeOffsetY;

      return points.map((p) => {
        const lx = p.x * currentDrawWidth;
        const ly = p.y * currentDrawHeight;
        const dx = (lx - currentOffsetX) * currentScaleX;
        const dy = (ly - currentOffsetY) * currentScaleY;
        const cx = drawX + dx * cos - dy * sin;
        const cy = drawY + dx * sin + dy * cos;
        return {
          x: (cx - imgProps.x) / imgProps.width,
          y: (cy - imgProps.y) / imgProps.height,
        };
      });
    },
    [
      imgProps,
      useMlsFit,
      mlsPoints,
      hairNaturalW,
      hairNaturalH,
      activeRotation,
      baseCenterX,
      baseCenterY,
      activeOffsetX,
      activeOffsetY,
      currentDrawWidth,
      currentDrawHeight,
      currentOffsetX,
      currentOffsetY,
      currentScaleX,
      currentScaleY,
    ]
  );

  const mappedHairOvalPoints = useMemo(() => {
    const oval = hairstyle?.templateOval36?.length ? hairstyle.templateOval36 : overlayOval36Detected;
    return mapHairNormalizedPointsToCanvas(oval);
  }, [hairstyle, overlayOval36Detected, mapHairNormalizedPointsToCanvas]);

  const mappedHairHeadCapPoints = useMemo(() => {
    const headCap = hairstyle?.templateHeadCap?.length ? hairstyle.templateHeadCap : overlayHeadCapDetected;
    return mapHairNormalizedPointsToCanvas(headCap);
  }, [hairstyle, overlayHeadCapDetected, mapHairNormalizedPointsToCanvas]);

  const mappedHairCalibrationPoints = useMemo(() => {
    const calibration = hairstyle?.calibrationPoints;
    if (!calibration || !imgProps) return null;
    const points = Object.values(calibration).filter((p): p is { x: number; y: number } => Boolean(p));
    return mapHairNormalizedPointsToCanvas(points);
  }, [hairstyle?.calibrationPoints, imgProps, mapHairNormalizedPointsToCanvas]);

  const handleOverlayWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    if (!selectedVariation) return;
    const delta = event.evt.deltaY;
    const isRotateMode = event.evt.shiftKey;

    if (isRotateMode) {
      const nextRotation = activeRotation + (delta > 0 ? 2 : -2);
      setManualTransform({
        x: activeOffsetX,
        y: activeOffsetY,
        scale: activeScale,
        rotation: Math.max(-45, Math.min(45, nextRotation))
      });
      return;
    }

    const scaleStep = delta > 0 ? -0.04 : 0.04;
    const nextScale = activeScale + scaleStep;
    setManualTransform({
      x: activeOffsetX,
      y: activeOffsetY,
      scale: Math.max(0.55, Math.min(1.8, nextScale)),
      rotation: activeRotation
    });
  };

  useEffect(() => {
    if (!onOverlayControlsReady) return;
    onOverlayControlsReady({
      decreaseOpacity: () => setOverlayOpacity((prev) => Math.max(0.2, prev - 0.1)),
      increaseOpacity: () => setOverlayOpacity((prev) => Math.min(1, prev + 0.1)),
      resetOverlay: () => {
        setManualTransform(null);
        setOverlayOpacity(1);
      },
    });
    return () => onOverlayControlsReady(null);
  }, [onOverlayControlsReady]);

  useEffect(() => {
    if (!onExportReady) return;

    const register = () => {
      onExportReady(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const exportCanvas = stage.toCanvas({ pixelRatio: 2 });
        const composed = document.createElement("canvas");
        composed.width = exportCanvas.width;
        composed.height = exportCanvas.height;
        const cctx = composed.getContext("2d");
        if (!cctx) return;
        // Force opaque background so saved images do not appear black in viewers.
        cctx.fillStyle = "#ffffff";
        cctx.fillRect(0, 0, composed.width, composed.height);
        cctx.drawImage(exportCanvas, 0, 0);
        const dataUrl = composed.toDataURL("image/png");
        const ts = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const fileName = `hair-tryon-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.png`;
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    };

    if (stageRef.current) {
      register();
      return () => onExportReady(null);
    }

    const frame = window.requestAnimationFrame(() => {
      if (stageRef.current) register();
      else onExportReady(null);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      onExportReady(null);
    };
  }, [onExportReady]);

  return (
    <div className="relative flex-1 rounded-3xl bg-white shadow-xl overflow-hidden flex items-center justify-center border border-slate-200 group dark:bg-slate-900 dark:border-slate-800">
      {/* MLS Render Canvas (Hidden) */}
      {useMlsFit && activeOverlayImage && mlsPoints && (
        <MLSWarpCanvas
          image={activeOverlayImage}
          srcPoints={mlsPoints.src}
          dstPoints={mlsPoints.dst}
          outputWidth={dimensions.width}
          outputHeight={dimensions.height}
          warpType="affine"
          onCanvasReady={handleCanvasReady}
        />
      )}

      {/* Konva canvas */}
      <div ref={containerRef} className="absolute inset-0">
        <Stage ref={stageRef} width={dimensions.width} height={dimensions.height}>
          <Layer>
            {activeBaseImage && imgProps && (
              <KonvaImage
                image={activeBaseImage}
                x={imgProps.x}
                y={imgProps.y}
                width={imgProps.width}
                height={imgProps.height}
                opacity={1}
              />
            )}
            {showFaceLandmarks && imgProps && (
              <FaceLandmarkDots landmarks={baseLandmarks} imgProps={imgProps} />
            )}
            {showFaceContourDebug && imgProps && baseLandmarkGroups.oval36.length > 0 && (
              <FaceLandmarkDots
                points={baseLandmarkGroups.oval36}
                imgProps={imgProps}
                color="rgba(16,185,129,0.85)"
                radius={3.5}
              />
            )}
            {showFaceContourDebug && imgProps && baseLandmarkGroups.headCap.length > 0 && (
              <FaceLandmarkDots
                points={baseLandmarkGroups.headCap}
                imgProps={imgProps}
                color="rgba(14,165,233,0.9)"
                radius={3.3}
              />
            )}
            {activeOverlayImage && currentDrawImage && imgProps && (
              <>
                <KonvaImage
                  ref={mlsImageRef}
                  image={currentDrawImage}
                  x={baseCenterX + activeOffsetX}
                  y={baseCenterY + activeOffsetY}
                  width={currentDrawWidth}
                  height={currentDrawHeight}
                  offsetX={currentOffsetX}
                  offsetY={currentOffsetY}
                  scaleX={currentScaleX}
                  scaleY={currentScaleY}
                  rotation={activeRotation}
                  opacity={overlayOpacity}
                  draggable
                  onWheel={handleOverlayWheel}
                  onDragMove={(event) => {
                    const node = event.target;
                    setManualTransform({
                      x: node.x() - baseCenterX,
                      y: node.y() - baseCenterY,
                      scale: activeScale,
                      rotation: activeRotation
                    });
                  }}
                />
                {tintedOverlayImage && (
                  <KonvaImage
                    image={tintedOverlayImage}
                    x={baseCenterX + activeOffsetX}
                    y={baseCenterY + activeOffsetY}
                    width={currentDrawWidth}
                    height={currentDrawHeight}
                    offsetX={currentOffsetX}
                    offsetY={currentOffsetY}
                    scaleX={currentScaleX}
                    scaleY={currentScaleY}
                    rotation={activeRotation}
                    opacity={0.42}
                    listening={false}
                  />
                )}
                {showHairLandmarks &&
                  mappedHairCalibrationPoints?.map((point, index) => (
                    <Circle
                      key={`hair-lm-${index}`}
                      x={point.x}
                      y={point.y}
                      radius={4}
                      fill="#7c3aed"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      listening={false}
                    />
                  ))}
                {showHairContourDebug && mappedHairOvalPoints?.length && (
                  <FaceLandmarkDots
                    points={mappedHairOvalPoints}
                    imgProps={imgProps}
                    color="rgba(236,72,153,0.95)"
                    radius={3.6}
                  />
                )}
                {showHairContourDebug && mappedHairHeadCapPoints?.length && (
                  <FaceLandmarkDots
                    points={mappedHairHeadCapPoints}
                    imgProps={imgProps}
                    color="rgba(249,115,22,0.95)"
                    radius={3.2}
                  />
                )}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Overlays */}
      <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none" />

      {/* Fit mode indicator */}
      {!isDetecting &&
        sourceProfileImageUrl &&
        selectedVariation &&
        isManualAdjust && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10">
            <span className="material-symbols-outlined text-sm">pan_tool</span>
            Manual adjust
          </div>
        )}
      {!isDetecting &&
        !isManualAdjust &&
        (useMlsFit || useCorrespondenceFit) &&
        sourceProfileImageUrl &&
        selectedVariation && (
          <div
            className={`absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10 animate-in fade-in zoom-in duration-300 ${
              hairstyle?.calibrationQuality === "low"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : useMlsFit ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" : "bg-violet-500/15 text-violet-700 dark:text-violet-300"
            }`}
          >
            <span className="material-symbols-outlined text-sm">hub</span>
            {hairstyle?.calibrationQuality === "low"
              ? "Review points"
              : useMlsFit ? "MLS Warp" : "Affine Fit"}
          </div>
        )}
      {!isDetecting &&
        !isManualAdjust &&
        !useMlsFit &&
        !useCorrespondenceFit &&
        isDetected &&
        sourceProfileImageUrl &&
        fitSource === "landmarks" &&
        selectedVariation && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10 animate-in fade-in zoom-in duration-300">
            <span className="material-symbols-outlined text-sm">face</span>
            Auto-Fit (landmarks)
          </div>
        )}
      {!isDetecting &&
        !isManualAdjust &&
        !useMlsFit &&
        !useCorrespondenceFit &&
        isDetected &&
        sourceProfileImageUrl &&
        fitSource === "faceBox" &&
        selectedVariation && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10 animate-in fade-in zoom-in duration-300">
            <span className="material-symbols-outlined text-sm">crop_free</span>
            Auto-Fit (face box)
          </div>
        )}
      {!isDetecting &&
        !isDetected &&
        sourceProfileImageUrl &&
        selectedVariation &&
        !useMlsFit &&
        !useCorrespondenceFit && (
          <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-500/10 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10">
            <span className="material-symbols-outlined text-sm">touch_app</span>
            Face not detected — drag to fit
          </div>
        )}
      {isDetecting && (
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          Detecting Face...
        </div>
      )}

      {/* AI Render badge */}
      <div className="absolute top-6 left-6 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg z-10 flex items-center gap-2">
        {title && <span className="opacity-80 border-r border-white/30 pr-2">{title}</span>}
        {sourceProfileImageUrl ? "Base Photo" : "Add Photo"}
      </div>

      {/* Poisson blending indicator */}
      {sourceProfileImageUrl && selectedVariation && (
        <div
          className={`absolute bottom-6 right-6 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10 ${poissonBlendStatusClass}`}
        >
          {poissonBlendStatusLabel}
        </div>
      )}
    </div>
  );
}

function createTintedHairMask(image: HTMLImageElement | HTMLCanvasElement, hex: string) {
  const canvas = document.createElement("canvas");
  const width = image instanceof HTMLImageElement ? image.naturalWidth || image.width : image.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight || image.height : image.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}
