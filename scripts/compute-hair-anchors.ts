/**
 * One-off: derive hair anchor metadata from PNG alpha (face hole + hair silhouette).
 * Run: bun scripts/compute-hair-anchors.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const ROOT = join(import.meta.dirname, "..");
const HAIR_DIR = join(ROOT, "public", "hair");

type Anchor = { foreheadY: number; faceCenterX: number; faceWidthRatio: number };

function analyzeBuffer(png: PNG): Anchor {
  const w = png.width;
  const h = png.height;
  const data = png.data;
  const alphaThreshold = 32;

  const alphaAt = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return 0;
    return data[(y * w + x) * 4 + 3];
  };

  // Opaque bounding box (hair / body silhouette).
  let minX = w,
    maxX = 0,
    minY = h,
    maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) >= alphaThreshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const hasOpaque = maxX >= minX && maxY >= minY;

  // Longest horizontal run of "transparent" pixels on a row (face hole).
  function maxTransparentRunWidth(y: number): number {
    let best = 0;
    let run = 0;
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) < alphaThreshold) {
        run++;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
    return best;
  }

  function rowHasOpaqueAbove(y: number, lookback: number): boolean {
    const y0 = Math.max(0, y - lookback);
    for (let yy = y0; yy < y; yy++) {
      for (let x = minX; x <= maxX; x++) {
        if (alphaAt(x, yy) >= alphaThreshold) return true;
      }
    }
    return false;
  }

  // Find first row inside the silhouette where the face hole is wide enough,
  // and there is hair above (avoids top canvas padding).
  const minHoleRatio = 0.28;
  let holeStartY = -1;
  const scanStart = hasOpaque ? minY : 0;
  const scanEnd = hasOpaque ? Math.min(h - 1, Math.floor(minY + (maxY - minY) * 0.72)) : Math.floor(h * 0.65);
  for (let y = scanStart; y <= scanEnd; y++) {
    if (maxTransparentRunWidth(y) < w * minHoleRatio) continue;
    if (!hasOpaque) {
      holeStartY = y;
      break;
    }
    if (rowHasOpaqueAbove(y, Math.max(3, Math.floor(h * 0.02)))) {
      holeStartY = y;
      break;
    }
  }

  if (holeStartY < 0) {
    // Fallback: bbox-based guess
    let minX = w,
      maxX = 0,
      minY = h,
      maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (alphaAt(x, y) >= alphaThreshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    return {
      faceCenterX: (minX + maxX) / 2 / w,
      foreheadY: Math.max(0, minY + bh * 0.22) / h,
      faceWidthRatio: Math.min(0.95, (bw * 0.55) / w),
    };
  }

  // Hairline: last row of hair above the hole (align to forehead landmark).
  const hairlineY = Math.max(0, holeStartY - 1);
  const foreheadY = (hairlineY + 0.5) / h;

  // Face opening width on the hole row; center of that run for X.
  const yScan = Math.min(holeStartY, h - 1);
  let bestRunStart = 0;
  let bestRunLen = 0;
  let runStart = 0;
  let runLen = 0;
  for (let x = 0; x <= w; x++) {
    const transparent = x < w && alphaAt(x, yScan) < alphaThreshold;
    if (transparent) {
      if (runLen === 0) runStart = x;
      runLen++;
    } else {
      if (runLen > bestRunLen) {
        bestRunLen = runLen;
        bestRunStart = runStart;
      }
      runLen = 0;
    }
  }
  const faceOpenPx = Math.max(bestRunLen, w * minHoleRatio * 0.5);
  // Horizontal center of the hair artwork (symmetric placement vs forehead).
  const faceCenterX = hasOpaque ? (minX + maxX + 1) / 2 / w : (bestRunStart + bestRunLen / 2) / w;

  const faceWidthRatio = Math.min(0.92, Math.max(0.18, faceOpenPx / w));

  return { foreheadY, faceCenterX, faceWidthRatio };
}

function main() {
  const out: Record<string, Anchor> = {};
  for (let i = 1; i <= 10; i++) {
    const name = `hair${i}.png`;
    const path = join(HAIR_DIR, name);
    const buf = readFileSync(path);
    const png = PNG.sync.read(buf);
    out[`hair-${i}`] = analyzeBuffer(png);
  }
  const jsonPath = join(ROOT, "src", "config", "hair-anchors.json");
  writeFileSync(jsonPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", jsonPath);
  console.log(JSON.stringify(out, null, 2));
}

main();
