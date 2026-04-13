import type { HairCalibrationPoints } from "./face-landmarks";
import {
  SEMANTIC_LANDMARK_INDICES,
  type NormalizedLandmark,
  type SemanticLandmarkId,
  MIN_CALIBRATION_POINTS_FOR_SIMILARITY,
} from "./face-landmarks";
import { estimateSimilarityTransform2D, applySimilarity, type Point2 } from "./landmark-alignment";

export type CorrespondenceOverlayParams = {
  offsetX: number;
  offsetY: number;
  /** Same convention as useHairAutoFit: overlayWidth = referenceWidth * scale */
  scale: number;
  rotation: number;
};

/**
 * Map hair PNG calibration (normalized 0–1) + base face landmarks → Konva overlay params
 * (center offset from stage center, scale vs referenceWidth, rotation deg).
 */
export function computeCorrespondenceOverlay(
  calibration: HairCalibrationPoints | undefined,
  baseLandmarks: NormalizedLandmark[] | null,
  imgProps: { x: number; y: number; width: number; height: number },
  hairNaturalWidth: number,
  hairNaturalHeight: number,
  referenceWidth: number,
  baseCenterX: number,
  baseCenterY: number
): CorrespondenceOverlayParams | null {
  if (!calibration || !baseLandmarks?.length) return null;

  const src: Point2[] = [];
  const dst: Point2[] = [];

  for (const id of Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[]) {
    const pt = calibration[id];
    if (!pt) continue;
    const idx = SEMANTIC_LANDMARK_INDICES[id];
    const lm = baseLandmarks[idx];
    if (!lm) continue;

    const qx = imgProps.x + lm.x * imgProps.width;
    const qy = imgProps.y + lm.y * imgProps.height;
    const px = (pt.x - 0.5) * hairNaturalWidth;
    const py = (pt.y - 0.5) * hairNaturalHeight;
    src.push({ x: px, y: py });
    dst.push({ x: qx, y: qy });
  }

  if (src.length < MIN_CALIBRATION_POINTS_FOR_SIMILARITY) return null;

  const T = estimateSimilarityTransform2D(src, dst);
  if (!T) return null;

  const centerCanvas = applySimilarity({ x: 0, y: 0 }, T);
  const overlayW = hairNaturalWidth * T.scale;
  const scale = overlayW / referenceWidth;
  const rotationDeg = (T.rotation * 180) / Math.PI;

  return {
    offsetX: centerCanvas.x - baseCenterX,
    offsetY: centerCanvas.y - baseCenterY,
    scale,
    rotation: rotationDeg,
  };
}
