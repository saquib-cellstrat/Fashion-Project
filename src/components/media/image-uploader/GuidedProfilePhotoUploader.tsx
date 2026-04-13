"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadConfig } from "@/config/upload";
import { cn } from "@/lib/utils/cn";
import type { OnboardingPhotoInput } from "@/features/auth/schemas/onboarding.schema";
import {
  analyzeFaceFrontal,
  detectFaceBox,
  type DetectedFaceBox as FaceBox,
} from "@/lib/image/face-detection";

type Props = {
  initialPhoto: OnboardingPhotoInput | null;
  onSave: (photo: OnboardingPhotoInput) => void;
};

const VIEWPORT = { width: 320, height: 420 };
const OUTPUT = { width: 1024, height: 1344 };

export function GuidedProfilePhotoUploader({ initialPhoto, onSave }: Props) {
  const [imageDataUrl, setImageDataUrl] = useState(initialPhoto?.originalDataUrl ?? "");
  const [mimeType, setMimeType] = useState(initialPhoto?.mimeType ?? "image/jpeg");
  const [imageSize, setImageSize] = useState({
    width: initialPhoto?.width ?? 0,
    height: initialPhoto?.height ?? 0,
  });
  const [zoom, setZoom] = useState(initialPhoto?.crop.zoom ?? 1);
  const [panX, setPanX] = useState(initialPhoto?.crop.panX ?? 0);
  const [panY, setPanY] = useState(initialPhoto?.crop.panY ?? 0);
  const [rotation, setRotation] = useState(initialPhoto?.crop.rotation ?? 0);
  const [faceDetected, setFaceDetected] = useState(initialPhoto?.quality.faceDetected ?? false);
  const [detectedFaceBox, setDetectedFaceBox] = useState<FaceBox | null>(null);
  const [brightnessScore, setBrightnessScore] = useState(initialPhoto?.quality.brightnessScore ?? 0);
  const [guidance, setGuidance] = useState<string[]>(initialPhoto?.quality.guidance ?? []);
  const [savedPreview, setSavedPreview] = useState(initialPhoto?.processedDataUrl ?? "");
  const [error, setError] = useState("");
  const [autoDetectionAvailable, setAutoDetectionAvailable] = useState(true);
  const [manualFaceConfirmed, setManualFaceConfirmed] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [frontalScore, setFrontalScore] = useState(0);
  const [isFrontalFace, setIsFrontalFace] = useState(true);
  const [detectedFaceOptions, setDetectedFaceOptions] = useState<FaceBox[]>([]);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(0);
  const [analysisReason, setAnalysisReason] = useState<string | null>(null);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const livePlacement = useMemo(() => {
    if (!detectedFaceBox || !loadedImage) return null;
    return computeFacePlacement(loadedImage, detectedFaceBox, { zoom, panX, panY });
  }, [detectedFaceBox, loadedImage, panX, panY, zoom]);

  const effectiveCenterScore = faceDetected
    ? livePlacement
      ? livePlacement.centerScore
      : estimateCenterScoreFromCrop(panX, panY)
    : 0;

  const realTimeGuidance = useMemo(() => {
    if (!faceDetected || !livePlacement) return [];
    const hints: string[] = [];
    if (livePlacement.offsetX > 14) hints.push("Move face slightly left.");
    if (livePlacement.offsetX < -14) hints.push("Move face slightly right.");
    if (livePlacement.offsetY < -16) hints.push("Move face a bit lower.");
    if (livePlacement.offsetY > 16) hints.push("Move face a bit higher.");
    if (livePlacement.faceWidthRatio < 0.32) hints.push("Zoom in a little so face fills more of the oval.");
    if (livePlacement.faceWidthRatio > 0.5) hints.push("Zoom out slightly to fit hairline and chin.");
    if (Math.abs(rotation) > 3) hints.push("Keep the face more upright (reduce rotation).");
    if (!hints.length) hints.push("Excellent alignment. Keep this framing and save.");
    return hints;
  }, [faceDetected, livePlacement, rotation]);

  const combinedGuidance = useMemo(
    () => Array.from(new Set([...realTimeGuidance, ...guidance])),
    [realTimeGuidance, guidance]
  );

  const mustUseDifferentPhoto = useMemo(() => {
    const selectedFace = detectedFaceOptions[selectedFaceIndex] ?? detectedFaceBox;
    if (faceCount > 1 && !selectedFace) return true;
    if (selectedFace && !isFrontalFace) return true;
    if (faceDetected && livePlacement && livePlacement.faceWidthRatio > 0.62) return true;
    if (selectedFace && loadedImage) {
      const selectedCoverage = (selectedFace.width * selectedFace.height) / (loadedImage.naturalWidth * loadedImage.naturalHeight);
      if (selectedCoverage < 0.045) return true;
    }
    return false;
  }, [faceCount, faceDetected, isFrontalFace, livePlacement, detectedFaceOptions, selectedFaceIndex, detectedFaceBox, loadedImage]);

  const qualityBadge = useMemo(() => {
    if (!imageDataUrl) return "Upload a front-facing photo";
    if (mustUseDifferentPhoto) return "Use a different photo";
    if (!faceDetected) return "Face confirmation needed";
    if (effectiveCenterScore < 0.75) return "Center your face in the oval";
    if (brightnessScore < 75) return "Improve lighting";
    return "Photo quality looks good";
  }, [imageDataUrl, faceDetected, effectiveCenterScore, brightnessScore, mustUseDifferentPhoto]);

  const runQualityChecks = useCallback(async (img: HTMLImageElement) => {
    const nextGuidance: string[] = [];
    const brightness = getBrightnessScore(img);
    setBrightnessScore(brightness);
    if (brightness < 75) nextGuidance.push("Lighting is low. Use brighter, even light.");
    if (img.naturalWidth < 600 || img.naturalHeight < 600) {
      nextGuidance.push("Use a higher-resolution photo for better AI edits.");
    }

    const faceResult = await detectFaceBox(img);
    setFaceCount(faceResult.faceCount);
    setDetectedFaceOptions(faceResult.boxes);
    const selectedFace = faceResult.boxes[selectedFaceIndex] ?? faceResult.box;
    setAnalysisReason(null);
    if (!faceResult.box) {
      setAutoDetectionAvailable(faceResult.supported);
      setDetectedFaceBox(null);
      setFaceDetected(manualFaceConfirmed);
      if (faceResult.supported) {
        nextGuidance.push("Could not auto-detect your face. Adjust crop and confirm face visibility.");
      } else {
        nextGuidance.push("Your browser does not support automatic face detection. Confirm manually below.");
      }
      setGuidance(nextGuidance);
      return;
    }

    setAutoDetectionAvailable(true);
    setFaceDetected(true);
    setDetectedFaceBox(selectedFace);
    if (selectedFace) {
      const frontal = await analyzeFaceFrontal(img, selectedFace);
      setFrontalScore(frontal.frontalScore);
      setIsFrontalFace(frontal.isFrontal);
      if (!frontal.isFrontal) {
        setAnalysisReason("Side/3-4 face detected");
        nextGuidance.push("This looks like a side or 3/4 face. Upload a straight front-facing photo.");
      }
    }
    if (faceResult.faceCount > 1) {
      nextGuidance.push("Multiple faces detected. Select the correct person below.");
      if (!selectedFace) setAnalysisReason("Group photo requires selecting one person");
    }
    if (selectedFace && selectedFace.width < img.naturalWidth * 0.2) {
      nextGuidance.push("Move a little closer so your face fills more of the frame.");
    }
    if (selectedFace) {
      const selectedCoverage = (selectedFace.width * selectedFace.height) / (img.naturalWidth * img.naturalHeight);
      if (selectedCoverage < 0.045) {
        setAnalysisReason("Selected person is too small in source photo");
        nextGuidance.push("Selected person is too small in this photo. Please use a different photo.");
      }
    }
    setGuidance(nextGuidance.length ? nextGuidance : ["Great framing. Continue to crop and save."]);
  }, [manualFaceConfirmed, selectedFaceIndex]);

  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = async () => {
      setLoadedImage(img);
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      await runQualityChecks(img);
    };
  }, [imageDataUrl, runQualityChecks]);

  async function onSelectFile(file: File | null) {
    setError("");
    setSavedPreview("");
    setManualFaceConfirmed(false);
    setLoadedImage(null);
    setDetectedFaceBox(null);
    setDetectedFaceOptions([]);
    setSelectedFaceIndex(0);
    setFaceCount(0);
    setFrontalScore(0);
    setIsFrontalFace(true);
    setAnalysisReason(null);
    if (!file) return;

    const maxBytes = uploadConfig.maxFileSizeMb * 1024 * 1024;
    if (!uploadConfig.allowedMimeTypes.includes(file.type as (typeof uploadConfig.allowedMimeTypes)[number])) {
      setError("Unsupported file type. Please upload JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`File is too large. Maximum is ${uploadConfig.maxFileSizeMb}MB.`);
      return;
    }

    const dataUrl = await toDataUrl(file);
    setMimeType((file.type || "image/jpeg") as OnboardingPhotoInput["mimeType"]);
    setImageDataUrl(dataUrl);
  }

  function savePhoto() {
    if (!loadedImage || !imageDataUrl) {
      setError("Please upload a photo first.");
      return;
    }
    const processedDataUrl = exportCroppedImage(loadedImage, {
      zoom,
      panX,
      panY,
      rotation,
    });
    setSavedPreview(processedDataUrl);

    onSave({
      originalDataUrl: imageDataUrl,
      processedDataUrl,
      mimeType,
      width: imageSize.width,
      height: imageSize.height,
      crop: {
        panX,
        panY,
        zoom,
        rotation,
        viewportWidth: VIEWPORT.width,
        viewportHeight: VIEWPORT.height,
        outputWidth: OUTPUT.width,
        outputHeight: OUTPUT.height,
      },
      quality: {
        faceDetected,
        centerScore: effectiveCenterScore,
        brightnessScore,
        guidance: combinedGuidance,
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Upload portrait photo
          <input
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            type="file"
            accept={uploadConfig.allowedMimeTypes.join(",")}
            onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Use a clear front-facing, passport-style photo with neutral lighting and no heavy head tilt.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <QualityRow
            label="Frontal face check"
            ok={faceDetected}
            value={faceDetected ? "Detected" : autoDetectionAvailable ? "Not auto-detected" : "Manual confirm required"}
          />
          <QualityRow
            label="Face orientation"
            ok={isFrontalFace && faceDetected}
            value={faceDetected ? `${Math.round(frontalScore * 100)}% frontal` : "--"}
          />
          <QualityRow
            label="People in frame"
            ok={faceCount <= 1}
            value={faceCount === 0 ? "--" : `${faceCount} detected`}
          />
          <QualityRow
            label="Center alignment"
            ok={faceDetected && effectiveCenterScore >= 0.75}
            value={faceDetected ? `${Math.round(effectiveCenterScore * 100)}%` : "--"}
          />
          <QualityRow
            label="Lighting score"
            ok={brightnessScore >= 75}
            value={`${Math.round(brightnessScore)}/255`}
          />
        </div>
        {faceCount > 1 && detectedFaceOptions.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Choose person in group photo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detectedFaceOptions.map((_, index) => (
                <button
                  key={`face-option-${index}`}
                  type="button"
                  onClick={() => setSelectedFaceIndex(index)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    selectedFaceIndex === index
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"
                      : "border-slate-300 text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                  )}
                >
                  Person {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/80 p-3 dark:border-blue-800/60 dark:bg-blue-900/20">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Live guidance
          </p>
          <p className="mt-1 text-sm font-bold text-blue-900 dark:text-blue-100">{qualityBadge}</p>
        </div>
        {mustUseDifferentPhoto && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            Please use a different photo{analysisReason ? `: ${analysisReason}.` : "."}
          </p>
        )}
        {!faceDetected && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
              checked={manualFaceConfirmed}
              onChange={(event) => setManualFaceConfirmed(event.target.checked)}
            />
            <span>I confirm this is a clear, front-facing photo of my face</span>
          </label>
        )}
        <ol className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/50">
          {combinedGuidance.map((line, index) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <div>
            <div className="relative mx-auto overflow-hidden rounded-3xl bg-slate-900" style={VIEWPORT}>
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt="Uploaded portrait preview"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-xs text-slate-300">
                  Upload a photo to start framing your face.
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-black/25" />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border-2 border-blue-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                aria-hidden
              />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Keep eyes level and face fully inside the oval.
            </p>
          </div>

          <div className="space-y-4">
            <RangeControl
              label="Zoom"
              min={1}
              max={2.2}
              step={0.01}
              value={zoom}
              onChange={setZoom}
            />
            <RangeControl
              label="Horizontal position"
              min={-180}
              max={180}
              step={1}
              value={panX}
              onChange={setPanX}
            />
            <RangeControl
              label="Vertical position"
              min={-180}
              max={180}
              step={1}
              value={panY}
              onChange={setPanY}
            />
            <RangeControl
              label="Rotation"
              min={-10}
              max={10}
              step={0.5}
              value={rotation}
              onChange={setRotation}
            />

            <button
              type="button"
              onClick={savePhoto}
              className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!imageDataUrl || mustUseDifferentPhoto}
            >
              Save photo for AI editor
            </button>

            {savedPreview && (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Saved output preview
                </p>
                <img
                  src={savedPreview}
                  alt="Saved profile output"
                  className="h-48 w-full rounded-lg object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function RangeControl({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span>{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn("h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700")}
      />
    </label>
  );
}

function QualityRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
      <span className={cn("text-xs font-semibold", ok ? "text-emerald-600" : "text-amber-600")}>
        {value}
      </span>
    </div>
  );
}

function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function estimateCenterScoreFromCrop(panX: number, panY: number) {
  const xScore = Math.max(0, 1 - Math.abs(panX) / 180);
  const yScore = Math.max(0, 1 - Math.abs(panY) / 180);
  return Number(((xScore + yScore) / 2).toFixed(2));
}

function computeFacePlacement(
  image: HTMLImageElement,
  face: FaceBox,
  controls: { zoom: number; panX: number; panY: number }
) {
  const baseScale = Math.max(VIEWPORT.width / image.naturalWidth, VIEWPORT.height / image.naturalHeight);
  const scaledWidth = image.naturalWidth * baseScale * controls.zoom;
  const scaledHeight = image.naturalHeight * baseScale * controls.zoom;
  const imageLeft = (VIEWPORT.width - scaledWidth) / 2 + controls.panX;
  const imageTop = (VIEWPORT.height - scaledHeight) / 2 + controls.panY;

  const faceCenterX = imageLeft + (face.x + face.width / 2) * baseScale * controls.zoom;
  const faceCenterY = imageTop + (face.y + face.height / 2) * baseScale * controls.zoom;
  const targetCenterX = VIEWPORT.width / 2;
  const targetCenterY = VIEWPORT.height * 0.48;
  const offsetX = faceCenterX - targetCenterX;
  const offsetY = faceCenterY - targetCenterY;

  const centerScore = Math.max(
    0,
    1 - (Math.abs(offsetX) / (VIEWPORT.width / 2) + Math.abs(offsetY) / (VIEWPORT.height / 2)) / 2
  );

  const faceWidthRatio = (face.width * baseScale * controls.zoom) / VIEWPORT.width;
  const faceHeightRatio = (face.height * baseScale * controls.zoom) / VIEWPORT.height;

  return {
    centerScore: Number(centerScore.toFixed(2)),
    offsetX,
    offsetY,
    faceWidthRatio,
    faceHeightRatio,
  };
}

function getBrightnessScore(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / (data.length / 4);
}

function exportCroppedImage(
  image: HTMLImageElement,
  controls: { zoom: number; panX: number; panY: number; rotation: number }
) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT.width;
  canvas.height = OUTPUT.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, OUTPUT.width, OUTPUT.height);

  const baseScale = Math.max(VIEWPORT.width / image.naturalWidth, VIEWPORT.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * baseScale * controls.zoom;
  const drawHeight = image.naturalHeight * baseScale * controls.zoom;
  const scaleX = OUTPUT.width / VIEWPORT.width;
  const scaleY = OUTPUT.height / VIEWPORT.height;

  const x = ((VIEWPORT.width - drawWidth) / 2 + controls.panX) * scaleX;
  const y = ((VIEWPORT.height - drawHeight) / 2 + controls.panY) * scaleY;

  ctx.save();
  ctx.translate(OUTPUT.width / 2, OUTPUT.height / 2);
  ctx.rotate((controls.rotation * Math.PI) / 180);
  ctx.translate(-OUTPUT.width / 2, -OUTPUT.height / 2);
  ctx.drawImage(image, x, y, drawWidth * scaleX, drawHeight * scaleY);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.92);
}

