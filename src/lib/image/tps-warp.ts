export type Point2 = { x: number; y: number };

export type TPSOptions = {
  regularizationLambda?: number;
  epsilon?: number;
};

export type TPSSolved = {
  sourceControlPoints: Point2[];
  weightsX: number[];
  weightsY: number[];
  affineX: [number, number, number];
  affineY: [number, number, number];
  regularizationLambda: number;
  epsilon: number;
};

export type TPSWarpResult = {
  mappedPoints: Point2[];
  solved: TPSSolved;
};

const DEFAULT_EPSILON = 1e-8;
const DEFAULT_REGULARIZATION = 1e-3;
const MIN_POINTS_FOR_TPS = 3;

function tpsKernel(r2: number, epsilon: number) {
  if (r2 <= epsilon) return 0;
  return r2 * Math.log(r2 + epsilon);
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] | null {
  const n = matrix.length;
  if (!n || rhs.length !== n) return null;

  const a = matrix.map((row) => row.slice());
  const b = rhs.slice();

  for (let col = 0; col < n; col++) {
    let pivot = col;
    let maxAbs = Math.abs(a[col][col]);
    for (let row = col + 1; row < n; row++) {
      const value = Math.abs(a[row][col]);
      if (value > maxAbs) {
        maxAbs = value;
        pivot = row;
      }
    }

    if (maxAbs < 1e-12) return null;

    if (pivot !== col) {
      const tempRow = a[col];
      a[col] = a[pivot];
      a[pivot] = tempRow;
      const tempB = b[col];
      b[col] = b[pivot];
      b[pivot] = tempB;
    }

    const pivotVal = a[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / pivotVal;
      if (!Number.isFinite(factor)) return null;
      a[row][col] = 0;
      for (let k = col + 1; k < n; k++) {
        a[row][k] -= factor * a[col][k];
      }
      b[row] -= factor * b[col];
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row];
    for (let k = row + 1; k < n; k++) {
      sum -= a[row][k] * x[k];
    }
    const denom = a[row][row];
    if (Math.abs(denom) < 1e-12) return null;
    x[row] = sum / denom;
    if (!Number.isFinite(x[row])) return null;
  }
  return x;
}

export function solveTPSWarp(
  sourceControlPoints: Point2[],
  targetControlPoints: Point2[],
  options: TPSOptions = {}
): TPSSolved | null {
  const n = sourceControlPoints.length;
  if (n < MIN_POINTS_FOR_TPS || targetControlPoints.length !== n) return null;

  const epsilon = options.epsilon ?? DEFAULT_EPSILON;
  const regularizationLambda = options.regularizationLambda ?? DEFAULT_REGULARIZATION;
  const size = n + 3;

  const L = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const rhsX = new Array<number>(size).fill(0);
  const rhsY = new Array<number>(size).fill(0);

  for (let i = 0; i < n; i++) {
    const pi = sourceControlPoints[i];
    rhsX[i] = targetControlPoints[i].x;
    rhsY[i] = targetControlPoints[i].y;

    for (let j = 0; j < n; j++) {
      const pj = sourceControlPoints[j];
      const dx = pi.x - pj.x;
      const dy = pi.y - pj.y;
      const r2 = dx * dx + dy * dy;
      const value = tpsKernel(r2, epsilon) + (i === j ? regularizationLambda : 0);
      L[i][j] = value;
    }

    L[i][n] = 1;
    L[i][n + 1] = pi.x;
    L[i][n + 2] = pi.y;
  }

  for (let i = 0; i < n; i++) {
    const p = sourceControlPoints[i];
    L[n][i] = 1;
    L[n + 1][i] = p.x;
    L[n + 2][i] = p.y;
  }

  const solutionX = solveLinearSystem(L, rhsX);
  if (!solutionX) return null;
  const solutionY = solveLinearSystem(L, rhsY);
  if (!solutionY) return null;

  return {
    sourceControlPoints,
    weightsX: solutionX.slice(0, n),
    weightsY: solutionY.slice(0, n),
    affineX: [solutionX[n], solutionX[n + 1], solutionX[n + 2]],
    affineY: [solutionY[n], solutionY[n + 1], solutionY[n + 2]],
    regularizationLambda,
    epsilon,
  };
}

export function applyTPSWarpPoint(point: Point2, solved: TPSSolved): Point2 {
  const n = solved.sourceControlPoints.length;

  let x = solved.affineX[0] + solved.affineX[1] * point.x + solved.affineX[2] * point.y;
  let y = solved.affineY[0] + solved.affineY[1] * point.x + solved.affineY[2] * point.y;

  for (let i = 0; i < n; i++) {
    const src = solved.sourceControlPoints[i];
    const dx = point.x - src.x;
    const dy = point.y - src.y;
    const r2 = dx * dx + dy * dy;
    const u = tpsKernel(r2, solved.epsilon);
    x += solved.weightsX[i] * u;
    y += solved.weightsY[i] * u;
  }

  return { x, y };
}

export function computeTPSWarp(
  sourceControlPoints: Point2[],
  targetControlPoints: Point2[],
  queryPoints: Point2[],
  options: TPSOptions = {}
): TPSWarpResult | null {
  const solved = solveTPSWarp(sourceControlPoints, targetControlPoints, options);
  if (!solved) return null;

  return {
    solved,
    mappedPoints: queryPoints.map((point) => applyTPSWarpPoint(point, solved)),
  };
}
