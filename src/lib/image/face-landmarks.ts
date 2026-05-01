import {
  detectFaceBox,
  getMediaPipeFaceLandmarker,
  withSuppressedTfliteInfo,
  type DetectedFaceBox,
} from "./face-detection";

/** MediaPipe Face Landmarker indices for correspondence UI (subset). */
export const SEMANTIC_LANDMARK_INDICES = {
  leftEye: 33,
  rightEye: 263,
  noseTip: 1,
  leftEar: 234,
  rightEar: 454,
  chin: 152,
  forehead: 10,
} as const;

export const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109
];

/** Canonical 36-point contour used for debug overlays and MLS correspondence. */
export const FACE_CONTOUR_36_INDICES = [...FACE_OVAL_INDICES];
/** Explicit alias for oval landmark group. */
export const FACE_OVAL_36_INDICES = [...FACE_CONTOUR_36_INDICES];
/** Full-head / bald-cap landmarks around crown + temples + upper side contour. */
export const HEAD_CAP_INDICES = [109, 67, 103, 54, 21, 10, 338, 297, 332, 284, 251, 389, 356, 454, 234, 127];

/** 
 * A subset of the face oval that explicitly excludes the cheek/temple area (around the eyes).
 * This prevents the hair template from being unnaturally stretched to the cheek boundaries,
 * allowing hairstyles to naturally fall over the face/eyes.
 */
export const RESTRICTED_OVAL_INDICES = [
  // Top forehead region (above eyes)
  10, 338, 297, 332, 284, 109, 67, 103, 54,
  // Jawline region (below ears)
  454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234
];

export type SemanticLandmarkId = keyof typeof SEMANTIC_LANDMARK_INDICES;

/** User-placed points on the hair PNG (normalized 0–1) for correspondence fit. */
export type HairCalibrationPoints = Partial<Record<SemanticLandmarkId, { x: number; y: number }>>;

export type NormalizedLandmark = { x: number; y: number; z?: number };
export type NormalizedPoint2 = { x: number; y: number };

export type FaceLandmarksNormalizedResult = {
  landmarks: NormalizedLandmark[];
  inputWidth: number;
  inputHeight: number;
};
export type LandmarkGroups = {
  oval36: NormalizedPoint2[];
  headCap: NormalizedPoint2[];
};

/** Minimum semantic pairs needed for similarity fit (2+). */
export const MIN_CALIBRATION_POINTS_FOR_SIMILARITY = 2;

/**
 * Landmark 10 is near the glabella (between brows), not the hairline — using it alone
 * places hair too low. We estimate the hairline from eye–chin geometry instead.
 */
const HAIRLINE_ABOVE_EYE_FACTOR = 0.38;
/** Ear–ear span is wider than the face opening in typical hair PNGs; scale down for width. */
const EAR_WIDTH_TO_FACE_OPENING = 0.69;
/** Golden-ratio inspired upper skull lift from eye center to crown. */
const SKULL_TOP_ABOVE_EYE_FACTOR = 1.15;

export type HeadPosition = {
  foreheadCenter: { x: number; y: number };
  chinPoint: { x: number; y: number };
  faceWidth: number;
  faceHeight: number;
  headTilt: number; // in degrees
  /** How the pose was computed (for overlay fallback UX). */
  fitSource: "landmarks" | "faceBox";
};

function headPositionFromFaceBox(image: HTMLImageElement, box: DetectedFaceBox): HeadPosition {
  const imgW = image.naturalWidth || image.width || 1;
  const imgH = image.naturalHeight || image.height || 1;
  const cx = (box.x + box.width / 2) / imgW;
  const eyeY = (box.y + box.height * 0.38) / imgH;
  const chinY = (box.y + box.height * 0.96) / imgH;
  const lowerFace = Math.max(0.03, chinY - eyeY);
  const hairlineY = Math.max(0, Math.min(1, eyeY - HAIRLINE_ABOVE_EYE_FACTOR * lowerFace));
  return {
    foreheadCenter: { x: cx, y: hairlineY },
    chinPoint: { x: cx, y: chinY },
    faceWidth: (box.width / imgW) * 0.92,
    faceHeight: Math.abs(chinY - hairlineY),
    headTilt: 0,
    fitSource: "faceBox",
  };
}

async function prepareLandmarkCanvas(image: HTMLImageElement): Promise<{
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
} | null> {
  const maxDim = 512;
  let w = image.naturalWidth || image.width || maxDim;
  let h = image.naturalHeight || image.height || maxDim;

  if (w > maxDim || h > maxDim) {
    const scale = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, w, h);
  return { canvas, w, h };
}

/**
 * Full face mesh in normalized [0,1] coords relative to the processed canvas (same space as `detectHeadPosition`).
 */
export async function detectFaceLandmarksNormalized(
  image: HTMLImageElement
): Promise<FaceLandmarksNormalizedResult | null> {
  const landmarker = await getMediaPipeFaceLandmarker();
  if (!landmarker) return null;

  try {
    const prep = await prepareLandmarkCanvas(image);
    if (!prep) return null;
    const { canvas, w, h } = prep;

    const result = await withSuppressedTfliteInfo(async () => landmarker.detect(canvas));
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks || landmarks.length < 264) return null;

    return {
      landmarks: landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
      inputWidth: w,
      inputHeight: h,
    };
  } catch (error) {
    console.error("Face landmark detection failed:", error);
    return null;
  }
}

/** Extract selected normalized points from landmark mesh (skips missing indices). */
export function pickLandmarkPoints(
  landmarks: NormalizedLandmark[] | null | undefined,
  indices: readonly number[]
): NormalizedPoint2[] {
  if (!landmarks?.length) return [];
  const picked: NormalizedPoint2[] = [];
  for (const idx of indices) {
    const lm = landmarks[idx];
    if (!lm) continue;
    picked.push({ x: lm.x, y: lm.y });
  }
  return picked;
}

export function extractLandmarkGroups(
  landmarks: NormalizedLandmark[] | null | undefined
): LandmarkGroups {
  return {
    oval36: pickLandmarkPoints(landmarks, FACE_OVAL_36_INDICES),
    headCap: pickLandmarkPoints(landmarks, HEAD_CAP_INDICES),
  };
}

/**
 * Estimate the true top-of-skull Y from facial proportions.
 * Uses eye-center -> chin distance, then extends upward by 1.15x that span.
 */
export function estimateSkullTopY(
  landmarks: NormalizedLandmark[] | null | undefined
): number | null {
  if (!landmarks?.length) return null;
  const leftEye = landmarks[SEMANTIC_LANDMARK_INDICES.leftEye];
  const rightEye = landmarks[SEMANTIC_LANDMARK_INDICES.rightEye];
  const chin = landmarks[SEMANTIC_LANDMARK_INDICES.chin];
  if (!leftEye || !rightEye || !chin) return null;

  const eyeCenterY = (leftEye.y + rightEye.y) * 0.5;
  const faceHeight = Math.abs(chin.y - eyeCenterY);
  if (!Number.isFinite(faceHeight) || faceHeight <= 0) return null;

  const estimatedTopY = eyeCenterY - faceHeight * SKULL_TOP_ABOVE_EYE_FACTOR;
  return Math.max(0, Math.min(1, estimatedTopY));
}

async function detectHeadPositionFromLandmarks(image: HTMLImageElement): Promise<HeadPosition | null> {
  const landmarker = await getMediaPipeFaceLandmarker();
  if (!landmarker) return null;

  try {
    const prep = await prepareLandmarkCanvas(image);
    if (!prep) return null;
    const { canvas, w, h } = prep;

    const result = await withSuppressedTfliteInfo(async () => landmarker.detect(canvas));
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks || landmarks.length < 264) return null;

    const forehead = landmarks[10];
    const chin = landmarks[152];

    // 234 / 454: ear tragions (very wide — not the same as hair-asset “face hole” width).
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    // 162 / 389: cheek / mid-face width — closer to temple span used by hair overlays.
    const leftCheek = landmarks[162];
    const rightCheek = landmarks[389];

    // 33 / 263: eye centers (iris) for roll and hairline estimate.
    const viewerLeftEye = landmarks[33];
    const viewerRightEye = landmarks[263];

    const earSpan = Math.abs(leftEar.x - rightEar.x);
    const cheekSpan = Math.abs(leftCheek.x - rightCheek.x);
    const faceWidth =
      cheekSpan > 0.02 && cheekSpan < earSpan ? cheekSpan : earSpan * EAR_WIDTH_TO_FACE_OPENING;

    const eyeMidX = (viewerLeftEye.x + viewerRightEye.x) / 2;
    const eyeMidY = (viewerLeftEye.y + viewerRightEye.y) / 2;
    const lowerFace = Math.max(0.02, chin.y - eyeMidY);
    const hairlineY = Math.max(0, Math.min(1, eyeMidY - HAIRLINE_ABOVE_EYE_FACTOR * lowerFace));
    const hairlineX = 0.22 * forehead.x + 0.78 * eyeMidX;

    const faceHeight = Math.abs(chin.y - hairlineY);

    const pixelDx = (viewerRightEye.x - viewerLeftEye.x) * w;
    const pixelDy = (viewerRightEye.y - viewerLeftEye.y) * h;
    const headTiltRad = Math.atan2(pixelDy, pixelDx);
    const headTilt = (headTiltRad * 180) / Math.PI;

    return {
      foreheadCenter: { x: hairlineX, y: hairlineY },
      chinPoint: { x: chin.x, y: chin.y },
      faceWidth,
      faceHeight,
      headTilt,
      fitSource: "landmarks",
    };
  } catch (error) {
    console.error("Face landmark detection failed:", error);
    return null;
  }
}

export async function detectHeadPosition(image: HTMLImageElement): Promise<HeadPosition | null> {
  const fromLandmarks = await detectHeadPositionFromLandmarks(image);
  if (fromLandmarks) return fromLandmarks;

  const { box } = await detectFaceBox(image);
  if (!box) return null;
  return headPositionFromFaceBox(image, box);
}
