export type ImageColorStats = {
  meanRgb: [number, number, number];
  stdRgb: [number, number, number];
  meanLuma: number;
  stdLuma: number;
  sampleCount: number;
};

type StatsOptions = {
  alphaThreshold?: number;
};

const EPSILON = 1e-5;

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toCanvas(source: HTMLImageElement | HTMLCanvasElement) {
  if (source instanceof HTMLCanvasElement) return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth || source.width || 1;
  canvas.height = source.naturalHeight || source.height || 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function computeLuma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function finiteOrZero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function computeImageColorStats(
  source: HTMLImageElement | HTMLCanvasElement,
  options: StatsOptions = {}
): ImageColorStats | null {
  const canvas = toCanvas(source);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const alphaThreshold = clampByte(options.alphaThreshold ?? 8);

  let sampleCount = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumL = 0;
  let sumR2 = 0;
  let sumG2 = 0;
  let sumB2 = 0;
  let sumL2 = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    const alpha = imageData[i + 3];
    if (alpha <= alphaThreshold) continue;

    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const luma = computeLuma(r, g, b);

    sampleCount++;
    sumR += r;
    sumG += g;
    sumB += b;
    sumL += luma;
    sumR2 += r * r;
    sumG2 += g * g;
    sumB2 += b * b;
    sumL2 += luma * luma;
  }

  if (sampleCount === 0) return null;

  const inv = 1 / sampleCount;
  const meanR = sumR * inv;
  const meanG = sumG * inv;
  const meanB = sumB * inv;
  const meanL = sumL * inv;

  const varR = Math.max(0, sumR2 * inv - meanR * meanR);
  const varG = Math.max(0, sumG2 * inv - meanG * meanG);
  const varB = Math.max(0, sumB2 * inv - meanB * meanB);
  const varL = Math.max(0, sumL2 * inv - meanL * meanL);

  return {
    meanRgb: [finiteOrZero(meanR), finiteOrZero(meanG), finiteOrZero(meanB)],
    stdRgb: [
      Math.max(EPSILON, finiteOrZero(Math.sqrt(varR))),
      Math.max(EPSILON, finiteOrZero(Math.sqrt(varG))),
      Math.max(EPSILON, finiteOrZero(Math.sqrt(varB))),
    ],
    meanLuma: finiteOrZero(meanL),
    stdLuma: Math.max(EPSILON, finiteOrZero(Math.sqrt(varL))),
    sampleCount,
  };
}
