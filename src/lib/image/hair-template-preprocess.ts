import {
  SEMANTIC_LANDMARK_INDICES,
  detectFaceLandmarksNormalized,
  type HairCalibrationPoints,
} from "@/lib/image/face-landmarks";

export type HairCalibrationQuality = "high" | "medium" | "low";

export type HairTemplatePreprocessResult = {
  imageUrl: string;
  sourceImageUrl?: string;
  calibrationPoints?: HairCalibrationPoints;
  calibrationConfidence?: number;
  calibrationQuality?: HairCalibrationQuality;
  calibrationWarnings?: string[];
  isAutoCalibrated: boolean;
};

export type HairDetachMode = "balanced" | "highAccuracy";

type MpHairSegmenter = {
  segment: (...args: unknown[]) => unknown;
};

let mpHairSegmenterPromise: Promise<MpHairSegmenter | null> | null = null;

type Rect = { x: number; y: number; width: number; height: number };
type LandmarkPoint = { x: number; y: number };

const EPS = 1e-6;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / Math.max(EPS, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function toDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/png");
}

async function getMediaPipeHairSegmenter(): Promise<MpHairSegmenter | null> {
  if (typeof window === "undefined") return null;
  if (!mpHairSegmenterPromise) {
    mpHairSegmenterPromise = (async () => {
      try {
        const vision = (await import("@mediapipe/tasks-vision")) as unknown as {
          FilesetResolver: {
            forVisionTasks: (basePath: string) => Promise<unknown>;
          };
          ImageSegmenter: {
            createFromOptions: (
              fileset: unknown,
              options: Record<string, unknown>
            ) => Promise<MpHairSegmenter>;
          };
        };
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );
        return await vision.ImageSegmenter.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite",
          },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });
      } catch {
        return null;
      }
    })();
  }
  return mpHairSegmenterPromise;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function isCalibrationPointMap(candidate: unknown): candidate is HairCalibrationPoints {
  if (!candidate || typeof candidate !== "object") return false;
  for (const value of Object.values(candidate as Record<string, unknown>)) {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    if (typeof v.x !== "number" || typeof v.y !== "number") return false;
  }
  return true;
}

function computeFallbackCrop(image: HTMLImageElement): Rect {
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;
  return { x: 0, y: 0, width: w, height: h };
}

function cropFromLandmarks(image: HTMLImageElement, points: Record<string, LandmarkPoint>): Rect {
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;

  const leftEar = points.leftEar;
  const rightEar = points.rightEar;
  const forehead = points.forehead;
  const chin = points.chin;

  const earSpan = Math.max(EPS, Math.abs(rightEar.x - leftEar.x));
  const faceHeight = Math.max(EPS, Math.abs(chin.y - forehead.y));

  const xCenter = (leftEar.x + rightEar.x) / 2;
  const yCenter = (forehead.y + chin.y) / 2;

  const cropW = clamp(earSpan * 1.95, 0.3, 1) * w;
  const cropH = clamp(faceHeight * 1.9, 0.35, 1) * h;

  const x = clamp(xCenter * w - cropW / 2, 0, Math.max(0, w - cropW));
  const y = clamp(yCenter * h - cropH * 0.5, 0, Math.max(0, h - cropH));

  return { x, y, width: cropW, height: cropH };
}

function rgbToHsv01(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > EPS) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  const s = max <= EPS ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function skinLikelihood(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const { h, s, v } = rgbToHsv01(r, g, b);

  // Broad skin-likeness prior in RGB + HSV space.
  const rgbGate =
    r > 45 &&
    g > 30 &&
    b > 15 &&
    max - min > 12 &&
    Math.abs(r - g) > 8 &&
    r > g &&
    r > b;
  if (!rgbGate) return 0;

  const hueScore = 1 - smoothstep(40, 75, Math.abs(h - 25));
  const satScore = 1 - smoothstep(0.6, 0.95, s);
  const valScore = smoothstep(0.15, 0.95, v);
  return clamp01(0.45 * hueScore + 0.3 * satScore + 0.25 * valScore);
}

function boxBlurAlpha(alpha: Uint8ClampedArray, width: number, height: number, radius: number) {
  if (radius <= 0) return alpha;
  const out = new Uint8ClampedArray(alpha.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          sum += alpha[yy * width + xx];
          count++;
        }
      }
      out[y * width + x] = Math.round(sum / Math.max(1, count));
    }
  }
  return out;
}

function normalizeMaskValue(value: number, isUintMask: boolean) {
  if (!isUintMask) return clamp01(value);
  if (value <= 1) return value;
  return clamp01(value / 255);
}

function resizeMaskBilinear(
  maskValues: ArrayLike<number>,
  maskWidth: number,
  maskHeight: number,
  outWidth: number,
  outHeight: number,
  isUintMask: boolean
): Float32Array {
  const matte = new Float32Array(outWidth * outHeight);
  const xScale = maskWidth / Math.max(1, outWidth);
  const yScale = maskHeight / Math.max(1, outHeight);

  for (let y = 0; y < outHeight; y++) {
    const sy = Math.min(maskHeight - 1, Math.max(0, (y + 0.5) * yScale - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(maskHeight - 1, y0 + 1);
    const wy = sy - y0;

    for (let x = 0; x < outWidth; x++) {
      const sx = Math.min(maskWidth - 1, Math.max(0, (x + 0.5) * xScale - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(maskWidth - 1, x0 + 1);
      const wx = sx - x0;

      const p00 = normalizeMaskValue(maskValues[y0 * maskWidth + x0] ?? 0, isUintMask);
      const p01 = normalizeMaskValue(maskValues[y0 * maskWidth + x1] ?? 0, isUintMask);
      const p10 = normalizeMaskValue(maskValues[y1 * maskWidth + x0] ?? 0, isUintMask);
      const p11 = normalizeMaskValue(maskValues[y1 * maskWidth + x1] ?? 0, isUintMask);

      const top = p00 + (p01 - p00) * wx;
      const bottom = p10 + (p11 - p10) * wx;
      matte[y * outWidth + x] = top + (bottom - top) * wy;
    }
  }

  return matte;
}

function toGuidanceLuma(rgba: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const idx = i * 4;
    out[i] = (0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2]) / 255;
  }
  return out;
}

function boxFilterFast(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius <= 0) return src.slice();

  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);

  for (let y = 0; y < height; y++) {
    const rowStart = y * width;
    let sum = 0;

    for (let i = -radius; i <= radius; i++) {
      const xx = clamp(i, 0, width - 1);
      sum += src[rowStart + xx];
    }

    for (let x = 0; x < width; x++) {
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(width - 1, x + radius);
      tmp[rowStart + x] = sum / Math.max(1, xMax - xMin + 1);

      const addX = Math.min(width - 1, x + radius + 1);
      const subX = Math.max(0, x - radius);
      sum += src[rowStart + addX] - src[rowStart + subX];
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      const yy = clamp(i, 0, height - 1);
      sum += tmp[yy * width + x];
    }

    for (let y = 0; y < height; y++) {
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(height - 1, y + radius);
      out[y * width + x] = sum / Math.max(1, yMax - yMin + 1);

      const addY = Math.min(height - 1, y + radius + 1);
      const subY = Math.max(0, y - radius);
      sum += tmp[addY * width + x] - tmp[subY * width + x];
    }
  }

  return out;
}

function guidedFilterSingleChannel(
  guidance: Float32Array,
  inputMatte: Float32Array,
  width: number,
  height: number,
  radius: number,
  eps: number
): Float32Array {
  const n = width * height;
  const ii = new Float32Array(n);
  const ip = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const iv = guidance[i];
    const pv = inputMatte[i];
    ii[i] = iv * iv;
    ip[i] = iv * pv;
  }

  const meanI = boxFilterFast(guidance, width, height, radius);
  const meanP = boxFilterFast(inputMatte, width, height, radius);
  const corrI = boxFilterFast(ii, width, height, radius);
  const corrIp = boxFilterFast(ip, width, height, radius);

  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = Math.max(0, corrI[i] - meanI[i] * meanI[i]);
    const covIp = corrIp[i] - meanI[i] * meanP[i];
    const ai = covIp / Math.max(EPS, varI + eps);
    a[i] = ai;
    b[i] = meanP[i] - ai * meanI[i];
  }

  const meanA = boxFilterFast(a, width, height, radius);
  const meanB = boxFilterFast(b, width, height, radius);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    q[i] = clamp01(meanA[i] * guidance[i] + meanB[i]);
  }
  return q;
}

function matteToAlpha8(
  matte: Float32Array,
  low = 0.04,
  high = 0.96,
  gamma = 0.95
): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(matte.length);
  for (let i = 0; i < matte.length; i++) {
    const t = clamp01((matte[i] - low) / Math.max(EPS, high - low));
    alpha[i] = Math.round(255 * Math.pow(t, gamma));
  }
  return alpha;
}

function refineMaskWithGuidedFilter(
  maskValues: ArrayLike<number>,
  maskWidth: number,
  maskHeight: number,
  fullWidth: number,
  fullHeight: number,
  sourceRgba: Uint8ClampedArray,
  isUintMask: boolean
): Uint8ClampedArray {
  const upsampledMatte = resizeMaskBilinear(
    maskValues,
    maskWidth,
    maskHeight,
    fullWidth,
    fullHeight,
    isUintMask
  );
  const guidance = toGuidanceLuma(sourceRgba);
  const minDim = Math.max(1, Math.min(fullWidth, fullHeight));
  const radius = clamp(Math.round(minDim * 0.01), 2, 16);
  const eps = 0.0035;
  const refined = guidedFilterSingleChannel(
    guidance,
    upsampledMatte,
    fullWidth,
    fullHeight,
    radius,
    eps
  );
  return matteToAlpha8(refined);
}

function inferMaskDimensions(maskLength: number, fullW: number, fullH: number) {
  const bestGuessW = Math.max(
    1,
    Math.round(Math.sqrt(maskLength * (fullW / Math.max(1, fullH))))
  );
  const bestGuessH = Math.max(1, Math.round(maskLength / Math.max(1, bestGuessW)));
  if (bestGuessW * bestGuessH === maskLength) return { maskWidth: bestGuessW, maskHeight: bestGuessH };

  const side = Math.max(1, Math.round(Math.sqrt(maskLength)));
  const altHeight = Math.max(1, Math.round(maskLength / side));
  return { maskWidth: side, maskHeight: altHeight };
}

function maskToAlpha(
  maskValues: ArrayLike<number>,
  maskWidth: number,
  maskHeight: number,
  outWidth: number,
  outHeight: number,
  isUintMask: boolean
): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(outWidth * outHeight);
  for (let y = 0; y < outHeight; y++) {
    const sy = Math.min(
      maskHeight - 1,
      Math.max(0, Math.round((y / Math.max(1, outHeight - 1)) * (maskHeight - 1)))
    );
    for (let x = 0; x < outWidth; x++) {
      const sx = Math.min(
        maskWidth - 1,
        Math.max(0, Math.round((x / Math.max(1, outWidth - 1)) * (maskWidth - 1)))
      );
      const v = normalizeMaskValue(maskValues[sy * maskWidth + sx] ?? 0, isUintMask);
      alpha[y * outWidth + x] = Math.round(v * 255);
    }
  }
  return alpha;
}

async function tryExtractWithHeavyModel(image: HTMLImageElement, crop: Rect): Promise<HTMLCanvasElement | null> {
  const segmenter = await getMediaPipeHairSegmenter();
  if (!segmenter) return null;
  try {
    const fullW = image.naturalWidth || image.width || 1;
    const fullH = image.naturalHeight || image.height || 1;

    const result = await new Promise<unknown>((resolve) => {
      const maybe = (segmenter.segment as (...args: unknown[]) => unknown)(image, (res: unknown) => resolve(res));
      if (maybe !== undefined) resolve(maybe);
    });

    const categoryMask =
      (result as { categoryMask?: { getAsFloat32Array?: () => Float32Array; getAsUint8Array?: () => Uint8Array } })
        ?.categoryMask ?? null;
    if (!categoryMask) return null;

    const uintMask = categoryMask.getAsUint8Array?.() ?? null;
    const floatMask = categoryMask.getAsFloat32Array?.() ?? null;
    const maskValues = uintMask ?? floatMask;
    if (!maskValues) return null;

    const source = document.createElement("canvas");
    source.width = fullW;
    source.height = fullH;
    const sctx = source.getContext("2d");
    if (!sctx) return null;
    sctx.drawImage(image, 0, 0, fullW, fullH);

    const srcImg = sctx.getImageData(0, 0, fullW, fullH);
    const srcData = srcImg.data;
    const maskLen = maskValues.length;
    const { maskWidth, maskHeight } = inferMaskDimensions(maskLen, fullW, fullH);
    const alphaMask =
      maskWidth * maskHeight === maskLen
        ? refineMaskWithGuidedFilter(
            maskValues,
            maskWidth,
            maskHeight,
            fullW,
            fullH,
            srcData,
            Boolean(uintMask)
          )
        : maskToAlpha(maskValues, Math.max(1, maskWidth), Math.max(1, maskHeight), fullW, fullH, Boolean(uintMask));

    for (let i = 0; i < fullW * fullH; i++) {
      const idx = i * 4;
      const matte = alphaMask[i] / 255;
      srcData[idx + 3] = Math.round(srcData[idx + 3] * matte);
    }

    sctx.putImageData(srcImg, 0, 0);

    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(crop.width));
    out.height = Math.max(1, Math.round(crop.height));
    const outCtx = out.getContext("2d");
    if (!outCtx) return null;
    outCtx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height);
    return out;
  } catch {
    return null;
  }
}

type ExtractHairAlphaOptions = {
  detachMode?: HairDetachMode;
};

function extractHairLikeAlpha(
  image: HTMLImageElement,
  crop: Rect,
  points: Record<string, LandmarkPoint> | null,
  options: ExtractHairAlphaOptions = {}
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(crop.width));
  out.height = Math.max(1, Math.round(crop.height));
  const ctx = out.getContext("2d");
  if (!ctx) return out;

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height);
  if (!points) return out;

  const leftEye = points.leftEye;
  const rightEye = points.rightEye;
  const noseTip = points.noseTip;
  const forehead = points.forehead;
  const chin = points.chin;
  const leftEar = points.leftEar;
  const rightEar = points.rightEar;

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const faceW = Math.max(EPS, Math.abs(rightEar.x - leftEar.x));
  const faceH = Math.max(EPS, Math.abs(chin.y - forehead.y));

  const ellipseCx = eyeMidX;
  const ellipseCy = eyeMidY + faceH * 0.24;
  const ellipseRx = faceW * 0.46;
  const ellipseRy = faceH * 0.56;
  const jawGateY = noseTip.y + faceH * 0.1;

  const img = ctx.getImageData(0, 0, out.width, out.height);
  const data = img.data;
  const alphaMask = new Uint8ClampedArray(out.width * out.height);

  const fadeStartY = eyeMidY - faceH * 0.04;
  const fadeEndY = noseTip.y + faceH * 0.24;
  const detachMode = options.detachMode ?? "balanced";
  const isHighAccuracy = detachMode === "highAccuracy";

  for (let py = 0; py < out.height; py++) {
    for (let px = 0; px < out.width; px++) {
      const idx = (py * out.width + px) * 4;
      const aidx = py * out.width + px;
      const ox = (crop.x + px) / Math.max(1, image.naturalWidth || image.width);
      const oy = (crop.y + py) / Math.max(1, image.naturalHeight || image.height);

      const dx = (ox - ellipseCx) / Math.max(EPS, ellipseRx);
      const dy = (oy - ellipseCy) / Math.max(EPS, ellipseRy);
      const ellipseNorm = dx * dx + dy * dy;
      const insideFaceEllipse = ellipseNorm <= 1;

      const baseAlpha = data[idx + 3] / 255;
      if (baseAlpha <= 0) {
        alphaMask[aidx] = 0;
        continue;
      }

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const skin = skinLikelihood(r, g, b);

      // Preserve upper hair strongly; progressively suppress face/neck area.
      const topPreserve = 1 - smoothstep(eyeMidY, eyeMidY + faceH * 0.12, oy);
      const faceSuppression = insideFaceEllipse ? smoothstep(fadeStartY, fadeEndY, oy) : 0;
      const chinSuppression = insideFaceEllipse && oy > jawGateY ? smoothstep(jawGateY, chin.y, oy) : 0;

      // Penalize skin-like pixels more in lower face region; keep non-skin texture (hair strands).
      const skinPenalty = skin * (isHighAccuracy ? 0.35 + 0.9 * faceSuppression : 0.25 + 0.75 * faceSuppression);

      const geometryPenalty = clamp01(
        faceSuppression * (isHighAccuracy ? 0.8 : 0.6) + chinSuppression * (isHighAccuracy ? 1 : 0.8)
      );
      const shapePenalty = ellipseNorm > 1 ? 0 : smoothstep(0.75, 1.2, ellipseNorm) * 0.25;
      const retain = clamp01(
        1 -
          skinPenalty -
          geometryPenalty -
          shapePenalty +
          topPreserve * (isHighAccuracy ? 0.28 : 0.35)
      );

      alphaMask[aidx] = Math.round(255 * baseAlpha * retain);
    }
  }

  // Feather the matte edges to reduce hard artifacts.
  const featherRadius = Math.max(
    1,
    Math.round(Math.min(out.width, out.height) * (isHighAccuracy ? 0.004 : 0.006))
  );
  const blurred = boxBlurAlpha(alphaMask, out.width, out.height, featherRadius);
  for (let i = 0; i < blurred.length; i++) {
    data[i * 4 + 3] = blurred[i];
  }

  ctx.putImageData(img, 0, 0);
  return out;
}

function remapCalibrationPointsToCrop(
  points: Record<string, LandmarkPoint>,
  crop: Rect,
  image: HTMLImageElement
): HairCalibrationPoints {
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;

  const calibration: HairCalibrationPoints = {};
  for (const [id, index] of Object.entries(SEMANTIC_LANDMARK_INDICES)) {
    const p = points[id];
    if (!p) continue;
    if (typeof index !== "number") continue;
    const px = p.x * w;
    const py = p.y * h;
    const nx = clamp01((px - crop.x) / Math.max(EPS, crop.width));
    const ny = clamp01((py - crop.y) / Math.max(EPS, crop.height));
    calibration[id as keyof HairCalibrationPoints] = { x: nx, y: ny };
  }
  return calibration;
}

function remapSemanticToLocalCrop(
  points: Record<string, LandmarkPoint>,
  crop: Rect,
  image: HTMLImageElement
): Record<string, LandmarkPoint> {
  const w = image.naturalWidth || image.width || 1;
  const h = image.naturalHeight || image.height || 1;
  const local: Record<string, LandmarkPoint> = {};
  for (const [id, p] of Object.entries(points)) {
    const px = p.x * w;
    const py = p.y * h;
    local[id] = {
      x: clamp01((px - crop.x) / Math.max(EPS, crop.width)),
      y: clamp01((py - crop.y) / Math.max(EPS, crop.height)),
    };
  }
  return local;
}

export function validateCalibrationPoints(points: HairCalibrationPoints): {
  ok: boolean;
  warnings: string[];
  confidencePenalty: number;
} {
  const warnings: string[] = [];
  let confidencePenalty = 0;

  for (const [key, value] of Object.entries(points)) {
    if (!value) continue;
    if (value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1) {
      warnings.push(`${key} is outside normalized bounds`);
      confidencePenalty += 0.2;
    }
  }

  if (points.leftEye && points.rightEye && points.leftEye.x >= points.rightEye.x) {
    warnings.push("Left/right eye ordering looks inconsistent");
    confidencePenalty += 0.2;
  }
  if (points.leftEar && points.rightEar && points.leftEar.x >= points.rightEar.x) {
    warnings.push("Left/right ear ordering looks inconsistent");
    confidencePenalty += 0.2;
  }

  if (points.forehead && points.chin) {
    const spreadY = Math.abs(points.chin.y - points.forehead.y);
    if (spreadY < 0.12) {
      warnings.push("Forehead/chin spread is too small");
      confidencePenalty += 0.25;
    }
  }

  if (points.leftEye && points.rightEye) {
    const eyeSpread = Math.abs(points.rightEye.x - points.leftEye.x);
    if (eyeSpread < 0.08) {
      warnings.push("Eye spread is too small");
      confidencePenalty += 0.2;
    }
  }

  const pointCount = Object.keys(points).length;
  if (pointCount < 2) {
    warnings.push("Not enough calibration points for correspondence fit");
    confidencePenalty += 0.8;
  } else if (pointCount < 4) {
    warnings.push("Limited calibration points may reduce fit quality");
    confidencePenalty += 0.25;
  }

  return {
    ok: pointCount >= 2,
    warnings,
    confidencePenalty,
  };
}

function qualityFromConfidence(value: number): HairCalibrationQuality {
  if (value >= 0.8) return "high";
  if (value >= 0.55) return "medium";
  return "low";
}

function extractSemanticPointMap(landmarks: Array<{ x: number; y: number }>) {
  const out: Record<string, LandmarkPoint> = {};
  for (const [id, index] of Object.entries(SEMANTIC_LANDMARK_INDICES)) {
    const lm = landmarks[index];
    if (!lm) continue;
    out[id] = { x: lm.x, y: lm.y };
  }
  return out;
}

export async function preprocessUploadedHairTemplate(file: File): Promise<HairTemplatePreprocessResult> {
  const originalDataUrl = await fileToDataUrl(file);
  return preprocessUploadedHairTemplateFromDataUrl(originalDataUrl, "balanced");
}

export async function preprocessUploadedHairTemplateFromDataUrl(
  originalDataUrl: string,
  detachMode: HairDetachMode = "balanced"
): Promise<HairTemplatePreprocessResult> {
  const image = await loadHtmlImage(originalDataUrl);

  const detection = await detectFaceLandmarksNormalized(image);
  if (!detection?.landmarks?.length) {
    return {
      imageUrl: originalDataUrl,
      sourceImageUrl: originalDataUrl,
      isAutoCalibrated: false,
      calibrationWarnings: ["No face landmarks detected in template photo"],
      calibrationQuality: "low",
      calibrationConfidence: 0.2,
    };
  }

  const semantic = extractSemanticPointMap(detection.landmarks);
  const crop = cropFromLandmarks(image, semantic);
  const heavyModelCanvas = await tryExtractWithHeavyModel(image, crop);
  const extracted = heavyModelCanvas ?? extractHairLikeAlpha(image, crop, semantic, { detachMode });
  if (heavyModelCanvas && semantic) {
    // Secondary pass cleans residual face skin while preserving model matte edges.
    const tmp = loadHtmlImage(toDataUrl(extracted));
    const cleanImage = await tmp;
    const cleaned = extractHairLikeAlpha(
      cleanImage,
      { x: 0, y: 0, width: cleanImage.naturalWidth, height: cleanImage.naturalHeight },
      remapSemanticToLocalCrop(semantic, crop, image),
      { detachMode }
    );
    extracted.width = cleaned.width;
    extracted.height = cleaned.height;
    const ectx = extracted.getContext("2d");
    if (ectx) {
      ectx.clearRect(0, 0, extracted.width, extracted.height);
      ectx.drawImage(cleaned, 0, 0);
    }
  }
  const extractedDataUrl = toDataUrl(extracted);
  const remappedPoints = remapCalibrationPointsToCrop(semantic, crop, image);
  const validation = validateCalibrationPoints(remappedPoints);

  const baseConfidence = 0.86;
  const confidence = clamp01(baseConfidence - validation.confidencePenalty);
  const quality = qualityFromConfidence(confidence);

  return {
    imageUrl: extractedDataUrl,
    sourceImageUrl: originalDataUrl,
    calibrationPoints: isCalibrationPointMap(remappedPoints) ? remappedPoints : undefined,
    calibrationConfidence: confidence,
    calibrationQuality: quality,
    calibrationWarnings: validation.warnings,
    isAutoCalibrated: validation.ok,
  };
}

export async function preprocessUploadedHairTemplateWithFallback(file: File): Promise<HairTemplatePreprocessResult> {
  try {
    const sourceImageUrl = await fileToDataUrl(file);
    return await preprocessUploadedHairTemplateFromDataUrl(sourceImageUrl, "balanced");
  } catch {
    const imageUrl = await fileToDataUrl(file);
    return {
      imageUrl,
      sourceImageUrl: imageUrl,
      isAutoCalibrated: false,
      calibrationQuality: "low",
      calibrationConfidence: 0.15,
      calibrationWarnings: ["Preprocessing failed; using original upload"],
    };
  }
}

export function extractHairTemplateFallbackPreview(file: File): Promise<HairTemplatePreprocessResult> {
  return fileToDataUrl(file).then((imageUrl) => ({
    imageUrl,
    sourceImageUrl: imageUrl,
    isAutoCalibrated: false,
    calibrationQuality: "low",
    calibrationConfidence: 0.15,
    calibrationWarnings: ["Using fallback template preview"],
  }));
}

export function getSafeTemplateCropForDebug(image: HTMLImageElement) {
  return computeFallbackCrop(image);
}
