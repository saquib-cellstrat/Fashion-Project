export type Point2 = { x: number; y: number };

export type MLSWarpType = "rigid" | "similarity" | "affine";

/**
 * Computes a warped 2D grid using the Moving Least Squares (MLS) algorithm.
 * 
 * @param cols Number of columns in the grid
 * @param rows Number of rows in the grid
 * @param width Width of the grid (original unwarped size)
 * @param height Height of the grid (original unwarped size)
 * @param srcPoints Pivot points on the original grid
 * @param dstPoints Target points where the pivot points should be moved
 * @param warpType "similarity" allows scaling, "rigid" preserves lengths
 * @param alpha Deformation falloff (usually 1.0)
 * @returns Float32Array of interleaved (x, y) coordinates for each vertex. Length is (cols+1)*(rows+1)*2.
 */
export function computeMLSGrid(
  cols: number,
  rows: number,
  width: number,
  height: number,
  srcPoints: Point2[],
  dstPoints: Point2[],
  warpType: MLSWarpType = "similarity",
  alpha: number = 1.0
): Float32Array {
  const numVertices = (cols + 1) * (rows + 1);
  const vertices = new Float32Array(numVertices * 2);
  const n = srcPoints.length;

  if (n === 0) {
    // If no control points, return regular grid
    let idx = 0;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        vertices[idx++] = (c / cols) * width;
        vertices[idx++] = (r / rows) * height;
      }
    }
    return vertices;
  }

  const w = new Float32Array(n);

  let idx = 0;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const vx = (c / cols) * width;
      const vy = (r / rows) * height;

      // 1. Calculate weights w_i
      let sumW = 0;
      let pStarX = 0, pStarY = 0;
      let qStarX = 0, qStarY = 0;
      let isExact = false;

      for (let i = 0; i < n; i++) {
        const dx = srcPoints[i].x - vx;
        const dy = srcPoints[i].y - vy;
        const distSq = dx * dx + dy * dy;

        if (distSq < 1e-8) {
          // Exact match with a control point
          vertices[idx++] = dstPoints[i].x;
          vertices[idx++] = dstPoints[i].y;
          isExact = true;
          break;
        }

        const weight = 1.0 / Math.pow(distSq, alpha);
        w[i] = weight;
        sumW += weight;

        pStarX += weight * srcPoints[i].x;
        pStarY += weight * srcPoints[i].y;
        qStarX += weight * dstPoints[i].x;
        qStarY += weight * dstPoints[i].y;
      }

      if (isExact) continue;

      pStarX /= sumW;
      pStarY /= sumW;
      qStarX /= sumW;
      qStarY /= sumW;

      if (warpType === "affine") {
        let P11 = 0, P12 = 0, P22 = 0;
        let Q11 = 0, Q12 = 0, Q21 = 0, Q22 = 0;
        for (let i = 0; i < n; i++) {
          const px = srcPoints[i].x - pStarX;
          const py = srcPoints[i].y - pStarY;
          const qx = dstPoints[i].x - qStarX;
          const qy = dstPoints[i].y - qStarY;
          const wt = w[i];

          P11 += wt * px * px;
          P12 += wt * px * py;
          P22 += wt * py * py;

          Q11 += wt * px * qx;
          Q12 += wt * px * qy;
          Q21 += wt * py * qx;
          Q22 += wt * py * qy;
        }

        const det = P11 * P22 - P12 * P12;
        if (Math.abs(det) < 1e-8) {
          // Fall back to similarity math
          const f_A = Q11 + Q22;
          const f_B = Q12 - Q21;
          const mu = P11 + P22;
          
          if (mu < 1e-8) {
             vertices[idx++] = vx - pStarX + qStarX;
             vertices[idx++] = vy - pStarY + qStarY;
             continue;
          }
          
          const factor = 1.0 / mu;
          const v_minus_p_x = vx - pStarX;
          const v_minus_p_y = vy - pStarY;
          
          vertices[idx++] = (v_minus_p_x * f_A - v_minus_p_y * f_B) * factor + qStarX;
          vertices[idx++] = (v_minus_p_y * f_A + v_minus_p_x * f_B) * factor + qStarY;
          continue;
        }

        const invP11 = P22 / det;
        const invP12 = -P12 / det;
        const invP22 = P11 / det;

        const M11 = invP11 * Q11 + invP12 * Q21;
        const M12 = invP11 * Q12 + invP12 * Q22;
        const M21 = invP12 * Q11 + invP22 * Q21;
        const M22 = invP12 * Q12 + invP22 * Q22;

        const v_minus_p_x = vx - pStarX;
        const v_minus_p_y = vy - pStarY;

        vertices[idx++] = v_minus_p_x * M11 + v_minus_p_y * M21 + qStarX;
        vertices[idx++] = v_minus_p_x * M12 + v_minus_p_y * M22 + qStarY;
        continue;
      }

      // 2. Compute f_A, f_B and mu (For Rigid / Similarity)
      let f_A = 0;
      let f_B = 0;
      let mu = 0;

      for (let i = 0; i < n; i++) {
        const p_hat_x = srcPoints[i].x - pStarX;
        const p_hat_y = srcPoints[i].y - pStarY;
        const q_hat_x = dstPoints[i].x - qStarX;
        const q_hat_y = dstPoints[i].y - qStarY;

        const weight = w[i];

        f_A += weight * (p_hat_x * q_hat_x + p_hat_y * q_hat_y);
        f_B += weight * (p_hat_x * q_hat_y - p_hat_y * q_hat_x);
        mu += weight * (p_hat_x * p_hat_x + p_hat_y * p_hat_y);
      }

      const v_minus_p_x = vx - pStarX;
      const v_minus_p_y = vy - pStarY;

      // Avoid division by zero if mu is tiny
      if (mu < 1e-8) {
        vertices[idx++] = vx - pStarX + qStarX;
        vertices[idx++] = vy - pStarY + qStarY;
        continue;
      }

      let factor = 1.0 / mu;
      if (warpType === "rigid") {
        const scale = Math.sqrt(f_A * f_A + f_B * f_B);
        if (scale > 1e-8) {
          factor = 1.0 / scale;
        }
      }

      const new_vx = (v_minus_p_x * f_A - v_minus_p_y * f_B) * factor + qStarX;
      const new_vy = (v_minus_p_y * f_A + v_minus_p_x * f_B) * factor + qStarY;

      vertices[idx++] = new_vx;
      vertices[idx++] = new_vy;
    }
  }

  return vertices;
}
