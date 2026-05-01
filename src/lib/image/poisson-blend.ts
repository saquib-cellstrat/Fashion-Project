export type PoissonCloneMode = "normal" | "mixed";

export type PoissonBlendOptions = {
  mode?: PoissonCloneMode;
  edgePadding?: number;
};

export type BlendCanvas = HTMLCanvasElement | OffscreenCanvas;

type OpenCvPoint = {
  delete?: () => void;
};

type OpenCvMat = {
  data: Uint8Array;
  delete: () => void;
};

type OpenCvNamespace = {
  Mat: new (...args: unknown[]) => OpenCvMat;
  Point: new (x: number, y: number) => OpenCvPoint;
  CV_8UC1: number;
  CV_8UC4: number;
  COLOR_RGBA2BGR: number;
  COLOR_BGR2RGBA: number;
  NORMAL_CLONE: number;
  MIXED_CLONE: number;
  matFromImageData: (imageData: ImageData) => OpenCvMat;
  cvtColor: (src: OpenCvMat, dst: OpenCvMat, code: number) => void;
  seamlessClone: (
    src: OpenCvMat,
    dst: OpenCvMat,
    mask: OpenCvMat,
    point: OpenCvPoint,
    flags: number,
    blend: OpenCvMat
  ) => void;
};

const DEFAULT_EDGE_PADDING = 2;

function getOpenCv(): OpenCvNamespace {
  const maybeCv = (globalThis as typeof globalThis & { cv?: OpenCvNamespace }).cv;
  if (!maybeCv || typeof maybeCv.seamlessClone !== "function") {
    throw new Error("OpenCV.js is not loaded or missing seamlessClone.");
  }
  return maybeCv;
}

function ensureCanvas2DContext(canvas: BlendCanvas, mode: "read" | "write"): OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(`Unable to get 2D context for ${mode} canvas.`);
  }
  return ctx;
}

function createOutputCanvas(width: number, height: number): BlendCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document === "undefined") {
    throw new Error("No canvas factory available in this environment.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createBinaryMaskFromAlpha(
  rgbaPixels: Uint8ClampedArray,
  width: number,
  height: number,
  edgePadding: number
) {
  const maskData = new Uint8Array(width * height);
  const safePadding = Math.max(0, Math.floor(edgePadding));
  let hasForeground = false;

  for (let y = 0; y < height; y++) {
    const isYEdge = y < safePadding || y >= height - safePadding;
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const rgbaIndex = index * 4;
      const alpha = rgbaPixels[rgbaIndex + 3];
      const isXEdge = x < safePadding || x >= width - safePadding;
      if (alpha > 0 && !isXEdge && !isYEdge) {
        maskData[index] = 255;
        hasForeground = true;
      } else {
        maskData[index] = 0;
      }
    }
  }

  return { maskData, hasForeground };
}

function cloneCanvasPixels(sourceCanvas: BlendCanvas): BlendCanvas {
  const output = createOutputCanvas(sourceCanvas.width, sourceCanvas.height);
  const outCtx = ensureCanvas2DContext(output, "write");
  outCtx.drawImage(sourceCanvas as CanvasImageSource, 0, 0);
  return output;
}

export function applyPoissonBlend(
  baseCanvas: BlendCanvas,
  warpedHairCanvas: BlendCanvas,
  options: PoissonBlendOptions = {}
): BlendCanvas {
  const cv = getOpenCv();
  const mode = options.mode ?? "normal";
  const edgePadding = options.edgePadding ?? DEFAULT_EDGE_PADDING;

  const width = baseCanvas.width;
  const height = baseCanvas.height;
  if (width < 1 || height < 1) {
    throw new Error("Base canvas has invalid dimensions.");
  }
  if (warpedHairCanvas.width !== width || warpedHairCanvas.height !== height) {
    throw new Error("Base and warped hair canvases must have identical dimensions.");
  }

  const dstCtx = ensureCanvas2DContext(baseCanvas, "read");
  const srcCtx = ensureCanvas2DContext(warpedHairCanvas, "read");
  const dstImageData = dstCtx.getImageData(0, 0, width, height);
  const srcImageData = srcCtx.getImageData(0, 0, width, height);

  const { maskData, hasForeground } = createBinaryMaskFromAlpha(srcImageData.data, width, height, edgePadding);
  if (!hasForeground) {
    return cloneCanvasPixels(baseCanvas);
  }

  let srcRgbaMat: OpenCvMat | null = null;
  let dstRgbaMat: OpenCvMat | null = null;
  let srcBgrMat: OpenCvMat | null = null;
  let dstBgrMat: OpenCvMat | null = null;
  let resultBgrMat: OpenCvMat | null = null;
  let resultRgbaMat: OpenCvMat | null = null;
  let maskMat: OpenCvMat | null = null;
  let center: OpenCvPoint | null = null;

  try {
    srcRgbaMat = cv.matFromImageData(srcImageData);
    dstRgbaMat = cv.matFromImageData(dstImageData);
    srcBgrMat = new cv.Mat();
    dstBgrMat = new cv.Mat();
    resultBgrMat = new cv.Mat();
    resultRgbaMat = new cv.Mat();

    cv.cvtColor(srcRgbaMat, srcBgrMat, cv.COLOR_RGBA2BGR);
    cv.cvtColor(dstRgbaMat, dstBgrMat, cv.COLOR_RGBA2BGR);

    maskMat = new cv.Mat(height, width, cv.CV_8UC1);
    maskMat.data.set(maskData);

    center = new cv.Point(Math.floor(width / 2), Math.floor(height / 2));
    const cloneMode = mode === "mixed" ? cv.MIXED_CLONE : cv.NORMAL_CLONE;

    cv.seamlessClone(srcBgrMat, dstBgrMat, maskMat, center, cloneMode, resultBgrMat);
    cv.cvtColor(resultBgrMat, resultRgbaMat, cv.COLOR_BGR2RGBA);

    const resultPixels = new Uint8ClampedArray(resultRgbaMat.data);
    const outputImageData = new ImageData(resultPixels, width, height);
    const outputCanvas = createOutputCanvas(width, height);
    const outputCtx = ensureCanvas2DContext(outputCanvas, "write");
    outputCtx.putImageData(outputImageData, 0, 0);
    return outputCanvas;
  } catch (error) {
    throw new Error(`Poisson blending failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // OpenCV WASM allocations are not GC-managed. Every Mat/Point must be deleted.
    srcRgbaMat?.delete();
    dstRgbaMat?.delete();
    srcBgrMat?.delete();
    dstBgrMat?.delete();
    resultBgrMat?.delete();
    resultRgbaMat?.delete();
    maskMat?.delete();
    center?.delete?.();
  }
}
