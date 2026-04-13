/**
 * 2D similarity transform from paired points: q ≈ s * R * p + t.
 */

export type Point2 = { x: number; y: number };

export type SimilarityTransform2D = {
  scale: number;
  /** radians */
  rotation: number;
  tx: number;
  ty: number;
};

/**
 * Estimate similarity mapping `src` → `dst` (same length, >= 2 non-degenerate pairs).
 */
export function estimateSimilarityTransform2D(src: Point2[], dst: Point2[]): SimilarityTransform2D | null {
  const n = src.length;
  if (n < 2 || dst.length !== n) return null;

  let mx = 0,
    my = 0,
    muX = 0,
    muY = 0;
  for (let i = 0; i < n; i++) {
    mx += src[i].x;
    my += src[i].y;
    muX += dst[i].x;
    muY += dst[i].y;
  }
  mx /= n;
  my /= n;
  muX /= n;
  muY /= n;

  let numRe = 0,
    numIm = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    const px = src[i].x - mx;
    const py = src[i].y - my;
    const qx = dst[i].x - muX;
    const qy = dst[i].y - muY;
    numRe += qx * px + qy * py;
    numIm += qy * px - qx * py;
    den += px * px + py * py;
  }

  if (den < 1e-12) return null;

  const scale = Math.sqrt((numRe * numRe + numIm * numIm) / (den * den));
  const rotation = Math.atan2(numIm, numRe);

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = scale * (cos * mx - sin * my);
  const ry = scale * (sin * mx + cos * my);
  const tx = muX - rx;
  const ty = muY - ry;

  return { scale, rotation, tx, ty };
}

/** Apply similarity to a point (forward: src space → dst space). */
export function applySimilarity(p: Point2, T: SimilarityTransform2D): Point2 {
  const cos = Math.cos(T.rotation);
  const sin = Math.sin(T.rotation);
  const rx = T.scale * (cos * p.x - sin * p.y);
  const ry = T.scale * (sin * p.x + cos * p.y);
  return { x: rx + T.tx, y: ry + T.ty };
}
