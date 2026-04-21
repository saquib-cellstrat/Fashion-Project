"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Circle } from "react-konva";
import type { HairstyleTemplate, Variation } from "@/types/editor";
import type Konva from "konva";
import { normalizeHairAnchor } from "@/config/hair-anchors";
import { detectFaceLandmarksNormalized, type NormalizedLandmark } from "@/lib/image/face-landmarks";
import { computeCorrespondenceOverlay } from "@/lib/image/hair-correspondence-fit";
import { FaceLandmarkDots } from "./FaceLandmarkDots";
import { useHairAutoFit } from "./use-hair-auto-fit";
import { MLSWarpCanvas } from "./MLSWarpCanvas";
import { type Point2 } from "@/lib/image/mlsWarp";
import { SEMANTIC_LANDMARK_INDICES, type SemanticLandmarkId, FACE_OVAL_INDICES } from "@/lib/image/face-landmarks";

type Props = {
  hairstyle: HairstyleTemplate | null;
  selectedVariation: Variation | null;
  selectedColorHex: string | null;
  sourceProfileImageUrl: string | null;
  onExportReady?: ((exportFn: (() => void) | null) => void) | undefined;
  fitEngine?: "affine" | "mls";
  title?: string;
};

export function EditorCanvas({
  hairstyle,
  selectedVariation,
  selectedColorHex,
  sourceProfileImageUrl,
  onExportReady,
  fitEngine = "mls",
  title,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [manualTransform, setManualTransform] = useState<{ x: number; y: number; scale: number; rotation: number } | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [baseLandmarks, setBaseLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [showFaceLandmarks, setShowFaceLandmarks] = useState(false);
  const [showHairLandmarks, setShowHairLandmarks] = useState(false);
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
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
    if (fitEngine !== "mls" || !hairstyle?.calibrationPoints || !baseLandmarks?.length || !imgProps || !activeOverlayImage) return null;
    
    const src: Point2[] = [];
    const dst: Point2[] = [];
    const calib = hairstyle.calibrationPoints;
    const usedIndices = new Set<number>();

    if (calib.leftEar && calib.rightEar && calib.forehead && calib.chin) {
      const hLeftX = calib.leftEar.x * hairNaturalW;
      const hRightX = calib.rightEar.x * hairNaturalW;
      const hTopY = calib.forehead.y * hairNaturalH;
      const hBotY = calib.chin.y * hairNaturalH;
      
      const hCenterX = (hLeftX + hRightX) / 2;
      const hCenterY = (hTopY + hBotY) / 2;
      const hRadiusX = Math.abs(hRightX - hLeftX) / 2;
      const hRadiusY = Math.abs(hBotY - hTopY) / 2;

      const uLeftLm = baseLandmarks[SEMANTIC_LANDMARK_INDICES.leftEar];
      const uRightLm = baseLandmarks[SEMANTIC_LANDMARK_INDICES.rightEar];
      const uTopLm = baseLandmarks[SEMANTIC_LANDMARK_INDICES.forehead];
      const uBotLm = baseLandmarks[SEMANTIC_LANDMARK_INDICES.chin];
      
      if (uLeftLm && uRightLm && uTopLm && uBotLm) {
        const uCenterX = (uLeftLm.x + uRightLm.x) / 2;
        const uCenterY = (uTopLm.y + uBotLm.y) / 2;
        
        for (const idx of FACE_OVAL_INDICES) {
          const lm = baseLandmarks[idx];
          if (!lm) continue;
          
          const targetX = imgProps.x + lm.x * imgProps.width;
          const targetY = imgProps.y + lm.y * imgProps.height;
          
          const angle = Math.atan2(lm.y - uCenterY, lm.x - uCenterX);
          
          const sourceX = hCenterX + hRadiusX * Math.cos(angle);
          const sourceY = hCenterY + hRadiusY * Math.sin(angle);
          
          src.push({ x: sourceX, y: sourceY });
          dst.push({ x: targetX, y: targetY });
          usedIndices.add(idx);
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
  }, [fitEngine, hairstyle?.calibrationPoints, baseLandmarks, imgProps, activeOverlayImage, hairNaturalW, hairNaturalH]);

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
  const hasHairCalibrationPoints = !!hairstyle?.calibrationPoints && Object.keys(hairstyle.calibrationPoints).length > 0;

  const isManualAdjust = manualTransform != null;

  const currentDrawImage = isMlsReady ? warpedCanvas : activeOverlayImage;
  const currentDrawWidth = isMlsReady ? dimensions.width : overlayWidth;
  const currentDrawHeight = isMlsReady ? dimensions.height : overlayHeight;
  const currentOffsetX = isMlsReady ? baseCenterX : overlayWidth / 2;
  const currentOffsetY = isMlsReady ? baseCenterY : overlayHeight / 2;
  const currentScaleX = isMlsReady ? activeScale : 1;
  const currentScaleY = isMlsReady ? activeScale : 1;

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
                  hairstyle?.calibrationPoints &&
                  Object.values(hairstyle.calibrationPoints).map((point, index) => {
                    if (!point) return null;
                    const localX = (point.x - 0.5) * overlayWidth;
                    const localY = (point.y - 0.5) * overlayHeight;
                    const theta = (activeRotation * Math.PI) / 180;
                    const rx = localX * Math.cos(theta) - localY * Math.sin(theta);
                    const ry = localX * Math.sin(theta) + localY * Math.cos(theta);
                    const cx = baseCenterX + activeOffsetX + rx;
                    const cy = baseCenterY + activeOffsetY + ry;
                    return (
                      <Circle
                        key={`hair-lm-${index}`}
                        x={cx}
                        y={cy}
                        radius={4}
                        fill="#7c3aed"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        listening={false}
                      />
                    );
                  })}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Overlays */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2">
            {sourceProfileImageUrl && (
              <button
                type="button"
                onClick={() => setShowFaceLandmarks((v) => !v)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold shadow-lg transition-colors ${
                  showFaceLandmarks
                    ? "bg-violet-600 text-white"
                    : "bg-white/80 text-slate-700 backdrop-blur-md dark:bg-slate-900/80 dark:text-slate-200"
                }`}
                aria-pressed={showFaceLandmarks}
                aria-label={showFaceLandmarks ? "Hide face landmarks" : "Show face landmarks"}
              >
                <span className="material-symbols-outlined text-base">scatter_plot</span>
                {showFaceLandmarks ? "Hide face landmarks" : "Show face landmarks"}
              </button>
            )}
            {hasHairCalibrationPoints && (
              <button
                type="button"
                onClick={() => setShowHairLandmarks((v) => !v)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold shadow-lg transition-colors ${
                  showHairLandmarks
                    ? "bg-indigo-600 text-white"
                    : "bg-white/80 text-slate-700 backdrop-blur-md dark:bg-slate-900/80 dark:text-slate-200"
                }`}
                aria-pressed={showHairLandmarks}
                aria-label={showHairLandmarks ? "Hide hair landmarks" : "Show hair landmarks"}
              >
                <span className="material-symbols-outlined text-base">join_inner</span>
                {showHairLandmarks ? "Hide hair landmarks" : "Show hair landmarks"}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setOverlayOpacity((prev) => Math.max(0.2, prev - 0.1))}
            className="flex size-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-900 shadow-lg hover:bg-white transition-colors dark:bg-slate-900/80 dark:text-white"
            aria-label="Decrease hair layer opacity"
          >
            <span className="material-symbols-outlined">visibility_off</span>
          </button>
          <button
            type="button"
            onClick={() => setOverlayOpacity((prev) => Math.min(1, prev + 0.1))}
            className="flex size-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-900 shadow-lg hover:bg-white transition-colors dark:bg-slate-900/80 dark:text-white"
            aria-label="Increase hair layer opacity"
          >
            <span className="material-symbols-outlined">visibility</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setManualTransform(null);
              setOverlayOpacity(1);
            }}
            className="flex size-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-slate-900 shadow-lg hover:bg-white transition-colors dark:bg-slate-900/80 dark:text-white"
            aria-label="Reset hair layer transform"
          >
            <span className="material-symbols-outlined">
              {autoFitTransform || useMlsFit || useCorrespondenceFit ? "auto_fix_high" : "refresh"}
            </span>
          </button>
        </div>
      </div>

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
    </div>
  );
}

function createTintedHairMask(image: HTMLImageElement | HTMLCanvasElement, hex: string) {
  const canvas = document.createElement("canvas");
  canvas.width = (image as any).naturalWidth || image.width;
  canvas.height = (image as any).naturalHeight || image.height;
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
