import type { HairCalibrationPoints, HairTemplateIndexedControlPoints } from "./face-landmarks";
import {
  SEMANTIC_LANDMARK_INDICES,
  TPS_REQUIRED_CONTROL_LANDMARK_INDICES,
  TPS_TARGET_CONTROL_LANDMARK_INDICES,
  type NormalizedLandmark,
  type SemanticLandmarkId,
  MIN_CALIBRATION_POINTS_FOR_SIMILARITY,
} from "./face-landmarks";
import { estimateSimilarityTransform2D, applySimilarity, type Point2 } from "./landmark-alignment";
import { applyTPSWarpPoint, solveTPSWarp } from "./tps-warp";

export type CorrespondenceOverlayParams = {
  offsetX: number;
  offsetY: number;
  /** Same convention as useHairAutoFit: overlayWidth = referenceWidth * scale */
  scale: number;
  rotation: number;
};

export type WarpedMeshVertex = {
  u: number;
  v: number;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
};

export type WarpedMeshTriangle = {
  a: number;
  b: number;
  c: number;
};

export type CorrespondenceWarpedMesh = {
  vertices: WarpedMeshVertex[];
  triangles: WarpedMeshTriangle[];
  rows: number;
  cols: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  controlPoints: { source: Point2[]; target: Point2[] };
};

export type CorrespondenceOverlayResult =
  | { mode: "similarity"; transform: CorrespondenceOverlayParams }
  | { mode: "tps"; transform: CorrespondenceOverlayParams; mesh: CorrespondenceWarpedMesh };

const TPS_MESH_COLS = 20;
const TPS_MESH_ROWS = 20;

function toSimilarityOverlayParams(
  src: Point2[],
  dst: Point2[],
  hairNaturalWidth: number,
  referenceWidth: number,
  baseCenterX: number,
  baseCenterY: number
): CorrespondenceOverlayParams | null {
  if (src.length < MIN_CALIBRATION_POINTS_FOR_SIMILARITY) return null;
  const T = estimateSimilarityTransform2D(src, dst);
  if (!T) return null;
  const centerCanvas = applySimilarity({ x: 0, y: 0 }, T);
  const overlayW = hairNaturalWidth * T.scale;
  return {
    offsetX: centerCanvas.x - baseCenterX,
    offsetY: centerCanvas.y - baseCenterY,
    scale: overlayW / referenceWidth,
    rotation: (T.rotation * 180) / Math.PI,
  };
}

function generateMeshTopology(rows: number, cols: number): WarpedMeshTriangle[] {
  const triangles: WarpedMeshTriangle[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i0 = row * (cols + 1) + col;
      const i1 = i0 + 1;
      const i2 = i0 + (cols + 1);
      const i3 = i2 + 1;
      triangles.push({ a: i0, b: i2, c: i1 });
      triangles.push({ a: i1, b: i2, c: i3 });
    }
  }
  return triangles;
}

/**
 * Map hair PNG calibration (normalized 0–1) + base face landmarks → Konva overlay params
 * (center offset from stage center, scale vs referenceWidth, rotation deg).
 */
export function computeCorrespondenceOverlay(
  calibration: HairCalibrationPoints | undefined,
  indexedCalibrationPoints: HairTemplateIndexedControlPoints | undefined,
  baseLandmarks: NormalizedLandmark[] | null,
  imgProps: { x: number; y: number; width: number; height: number },
  hairNaturalWidth: number,
  hairNaturalHeight: number,
  referenceWidth: number,
  baseCenterX: number,
  baseCenterY: number
): CorrespondenceOverlayResult | null {
  if (!baseLandmarks?.length) return null;

  const similaritySrc: Point2[] = [];
  const similarityDst: Point2[] = [];

  for (const id of Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[]) {
    if (!calibration) break;
    const pt = calibration[id];
    if (!pt) continue;
    const idx = SEMANTIC_LANDMARK_INDICES[id];
    const lm = baseLandmarks[idx];
    if (!lm) continue;

    const qx = imgProps.x + lm.x * imgProps.width;
    const qy = imgProps.y + lm.y * imgProps.height;
    const px = (pt.x - 0.5) * hairNaturalWidth;
    const py = (pt.y - 0.5) * hairNaturalHeight;
    similaritySrc.push({ x: px, y: py });
    similarityDst.push({ x: qx, y: qy });
  }

  const similarity = toSimilarityOverlayParams(
    similaritySrc,
    similarityDst,
    hairNaturalWidth,
    referenceWidth,
    baseCenterX,
    baseCenterY
  );

  const tpsSrc: Point2[] = [];
  const tpsDst: Point2[] = [];
  const requiredPresent = new Set<number>();
  for (const idx of TPS_TARGET_CONTROL_LANDMARK_INDICES) {
    const srcPt = indexedCalibrationPoints?.[idx];
    const lm = baseLandmarks[idx];
    if (!srcPt || !lm) continue;
    requiredPresent.add(idx);
    tpsSrc.push({
      x: (srcPt.x - 0.5) * hairNaturalWidth,
      y: (srcPt.y - 0.5) * hairNaturalHeight,
    });
    tpsDst.push({
      x: imgProps.x + lm.x * imgProps.width,
      y: imgProps.y + lm.y * imgProps.height,
    });
  }

  const hasRequiredTPSPoints = TPS_REQUIRED_CONTROL_LANDMARK_INDICES.every((idx) => requiredPresent.has(idx));
  if (hasRequiredTPSPoints && tpsSrc.length >= 3) {
    const solved = solveTPSWarp(tpsSrc, tpsDst);
    if (solved) {
      const vertices: WarpedMeshVertex[] = [];
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (let row = 0; row <= TPS_MESH_ROWS; row++) {
        for (let col = 0; col <= TPS_MESH_COLS; col++) {
          const u = col / TPS_MESH_COLS;
          const v = row / TPS_MESH_ROWS;
          const sx = (u - 0.5) * hairNaturalWidth;
          const sy = (v - 0.5) * hairNaturalHeight;
          const warped = applyTPSWarpPoint({ x: sx, y: sy }, solved);
          minX = Math.min(minX, warped.x);
          minY = Math.min(minY, warped.y);
          maxX = Math.max(maxX, warped.x);
          maxY = Math.max(maxY, warped.y);
          vertices.push({ u, v, sx, sy, dx: warped.x, dy: warped.y });
        }
      }

      const fallback = similarity ?? {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        rotation: 0,
      };
      return {
        mode: "tps",
        transform: fallback,
        mesh: {
          vertices,
          triangles: generateMeshTopology(TPS_MESH_ROWS, TPS_MESH_COLS),
          rows: TPS_MESH_ROWS,
          cols: TPS_MESH_COLS,
          bounds: { minX, minY, maxX, maxY },
          controlPoints: { source: tpsSrc, target: tpsDst },
        },
      };
    }
  }

  if (!similarity) return null;
  return { mode: "similarity", transform: similarity };
}
