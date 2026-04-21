/**
 * hair-uv-mapping.ts
 *
 * Maps hair template pixels to UV coordinates on the 3D scalp mesh.
 *
 * Math pipeline:
 *  1. Template space  (calibrationPoints in [0,1] over the PNG)
 *  2. → Image landmark space  (MediaPipe normalized [0,1])
 *  3. → Canonical UV  (canonical face atlas UVs from topology JSON)
 *  4. → THREE.BufferAttribute
 */

import * as THREE from "three";
import type { NormalizedLandmark } from "@/lib/image/face-landmarks";
import type { HairCalibrationPoints } from "@/lib/image/face-landmarks";
import { SEMANTIC_LANDMARK_INDICES } from "@/lib/image/face-landmarks";
import type { FaceMeshTopology } from "./face-mesh-topology";
import { buildCanonicalUVArray } from "./face-mesh-topology";

// ---------------------------------------------------------------------------
// Similarity Transform Helpers (2D affine, rotation+scale+translation only)
// ---------------------------------------------------------------------------

type Vec2 = [number, number];

function vec2sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}
function vec2dot(a: Vec2, b: Vec2) {
  return a[0] * b[0] + a[1] * b[1];
}
function vec2len2(a: Vec2) {
  return a[0] * a[0] + a[1] * a[1];
}

/**
 * Fit a 2D similarity transform (scale, rotation, translation) mapping
 * source points → target points using the least-squares closed-form solution.
 *
 * Returns a function  apply(p: Vec2): Vec2  that maps source → target.
 */
function fitSimilarity(
  srcPts: Vec2[],
  dstPts: Vec2[]
): ((p: Vec2) => Vec2) {
  // Based on Umeyama 1991 for 2D similarity:
  // T(p) = s * [cos θ, -sin θ; sin θ, cos θ] * p + t

  const n = Math.min(srcPts.length, dstPts.length);
  if (n < 2) {
    // Degenerate — identity
    return (p) => p;
  }

  // Centroids
  let srcCx = 0, srcCy = 0, dstCx = 0, dstCy = 0;
  for (let i = 0; i < n; i++) {
    srcCx += srcPts[i][0]; srcCy += srcPts[i][1];
    dstCx += dstPts[i][0]; dstCy += dstPts[i][1];
  }
  srcCx /= n; srcCy /= n;
  dstCx /= n; dstCy /= n;

  // Rotational cross-covariance
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const sx = srcPts[i][0] - srcCx;
    const sy = srcPts[i][1] - srcCy;
    const dx = dstPts[i][0] - dstCx;
    const dy = dstPts[i][1] - dstCy;
    num += dx * sy - dy * sx;
    den += dx * sx + dy * sy;
  }

  const angle = Math.atan2(num, den);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Scale
  let srcVar = 0;
  for (let i = 0; i < n; i++) {
    const sx = srcPts[i][0] - srcCx;
    const sy = srcPts[i][1] - srcCy;
    srcVar += sx * sx + sy * sy;
  }
  srcVar /= n;

  let dstVar = 0;
  for (let i = 0; i < n; i++) {
    const dx = dstPts[i][0] - dstCx;
    const dy = dstPts[i][1] - dstCy;
    dstVar += dx * dx + dy * dy;
  }
  dstVar /= n;

  const scale = srcVar > 1e-9 ? Math.sqrt(dstVar / srcVar) : 1;

  // Translation
  const tx = dstCx - scale * (cosA * srcCx - sinA * srcCy);
  const ty = dstCy - scale * (sinA * srcCx + cosA * srcCy);

  return ([px, py]: Vec2): Vec2 => [
    scale * (cosA * px - sinA * py) + tx,
    scale * (sinA * px + cosA * py) + ty,
  ];
}

/**
 * Fit the INVERSE transform: landmark image space → template space.
 * We need: given a landmark XY, where is it in the hair PNG?
 */
function buildLandmarkToTemplateTransform(
  calibrationPoints: HairCalibrationPoints,
  landmarks: NormalizedLandmark[]
): ((lmXY: Vec2) => Vec2) | null {
  const srcPts: Vec2[] = []; // landmark image coords
  const dstPts: Vec2[] = []; // template UV coords

  for (const [key, index] of Object.entries(SEMANTIC_LANDMARK_INDICES)) {
    const calPt = calibrationPoints[key as keyof HairCalibrationPoints];
    const lm = landmarks[index as number];
    if (!calPt || !lm) continue;

    srcPts.push([lm.x, lm.y]);
    dstPts.push([calPt.x, calPt.y]);
  }

  if (srcPts.length < 2) return null;

  return fitSimilarity(srcPts, dstPts);
}

// ---------------------------------------------------------------------------
// Main UV Map Builder
// ---------------------------------------------------------------------------

/**
 * Builds a UV Float32Array for the scalp sub-mesh vertices, mapping each
 * vertex's landmark position to the corresponding pixel in the hair template.
 *
 * @param topology          Full face mesh topology
 * @param indexMap          Scalp sub-mesh compact index map (landmark → compact int)
 * @param landmarks         Current 468 MediaPipe landmarks (normalized XY + z)
 * @param calibrationPoints Template calibration anchor pairs
 * @returns Float32Array with 2 floats per compact vertex (u, v)
 */
export function buildHairUVMap(
  topology: FaceMeshTopology,
  indexMap: Map<number, number>,
  landmarks: NormalizedLandmark[],
  calibrationPoints: HairCalibrationPoints | undefined
): Float32Array {
  const vertexCount = indexMap.size;
  const uvs = new Float32Array(vertexCount * 2);

  // If we have calibration points, use precise landmark→template mapping
  if (calibrationPoints && Object.keys(calibrationPoints).length >= 2) {
    const tfm = buildLandmarkToTemplateTransform(calibrationPoints, landmarks);

    if (tfm) {
      for (const [landmarkIdx, compactIdx] of indexMap) {
        const lm = landmarks[landmarkIdx];
        if (!lm) continue;
        const [u, v] = tfm([lm.x, lm.y]);
        uvs[compactIdx * 2] = Math.max(0, Math.min(1, u));
        uvs[compactIdx * 2 + 1] = Math.max(0, Math.min(1, 1 - v)); // flip V
      }
      return uvs;
    }
  }

  // Fallback: use canonical face mesh UVs from topology (no calibration)
  const canonicalUVs = buildCanonicalUVArray(topology.uvs);
  for (const [landmarkIdx, compactIdx] of indexMap) {
    uvs[compactIdx * 2] = canonicalUVs[landmarkIdx * 2];
    uvs[compactIdx * 2 + 1] = canonicalUVs[landmarkIdx * 2 + 1];
  }

  return uvs;
}

/**
 * Builds the position Float32Array for the scalp sub-mesh,
 * placing each vertex at its 3D landmark position scaled to canvas pixel dimensions.
 *
 * @param indexMap          Scalp compact index map
 * @param landmarks         Current 468 MediaPipe landmarks
 * @param canvasW           Canvas width in pixels (for Z scale)
 * @param canvasH           Canvas height in pixels
 * @param imgProps          Image display rect (x, y, width, height in canvas px)
 */
export function buildScalpPositions(
  indexMap: Map<number, number>,
  landmarks: NormalizedLandmark[],
  canvasW: number,
  canvasH: number,
  imgProps: { x: number; y: number; width: number; height: number }
): Float32Array {
  const vertexCount = indexMap.size;
  const positions = new Float32Array(vertexCount * 3);

  // Depth scale: MediaPipe z is roughly in the same units as x/y (normalized).
  // Multiply by face width in px for a physically reasonable Z range.
  const depthScale = imgProps.width * 0.15;

  for (const [landmarkIdx, compactIdx] of indexMap) {
    const lm = landmarks[landmarkIdx];
    if (!lm) continue;

    // Map normalized [0,1] to canvas pixel coords
    const px = imgProps.x + lm.x * imgProps.width;
    const py = imgProps.y + lm.y * imgProps.height;
    // Z: negative = into screen in Three.js right-hand coord system
    const pz = -(lm.z ?? 0) * depthScale;

    // OrthographicCamera: pixel-space origin at top-left,
    // but Three.js Y is up → invert Y relative to canvas center
    const threeX = px - canvasW / 2;
    const threeY = -(py - canvasH / 2);

    positions[compactIdx * 3] = threeX;
    positions[compactIdx * 3 + 1] = threeY;
    positions[compactIdx * 3 + 2] = pz;
  }

  return positions;
}

/**
 * Builds the FULL 468-vertex position array for the depth-only occlusion mesh.
 */
export function buildFullMeshPositions(
  landmarks: NormalizedLandmark[],
  canvasW: number,
  canvasH: number,
  imgProps: { x: number; y: number; width: number; height: number }
): Float32Array {
  const positions = new Float32Array(468 * 3);
  const depthScale = imgProps.width * 0.15;

  for (let i = 0; i < 468; i++) {
    const lm = landmarks[i];
    if (!lm) continue;

    const px = imgProps.x + lm.x * imgProps.width;
    const py = imgProps.y + lm.y * imgProps.height;
    const pz = -(lm.z ?? 0) * depthScale;

    positions[i * 3] = px - canvasW / 2;
    positions[i * 3 + 1] = -(py - canvasH / 2);
    positions[i * 3 + 2] = pz;
  }

  return positions;
}
