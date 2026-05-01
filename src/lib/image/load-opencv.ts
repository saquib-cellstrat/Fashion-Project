type OpenCvLike = {
  Mat?: unknown;
  seamlessClone?: unknown;
  onRuntimeInitialized?: (() => void) | null;
};

const OPENCV_SCRIPT_ID = "opencv-js-runtime";
const DEFAULT_OPENCV_URL = "/vendor/opencv-custom.js";

let openCvLoadPromise: Promise<boolean> | null = null;

function isReady(cv: OpenCvLike | undefined) {
  return Boolean(cv && typeof cv.Mat === "function" && typeof cv.seamlessClone === "function");
}

function getCv() {
  return (window as Window & { cv?: OpenCvLike }).cv;
}

function waitForRuntimeReady(timeoutMs: number): Promise<boolean> {
  if (isReady(getCv())) return Promise.resolve(true);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const pollTimer = window.setInterval(() => {
      if (isReady(getCv())) {
        window.clearInterval(pollTimer);
        resolve(true);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(pollTimer);
        resolve(false);
      }
    }, 100);

    const cv = getCv();
    if (cv) {
      const previousOnRuntimeInitialized = cv.onRuntimeInitialized;
      cv.onRuntimeInitialized = () => {
        previousOnRuntimeInitialized?.();
        window.clearInterval(pollTimer);
        resolve(isReady(getCv()));
      };
    }
  });
}

export function ensureOpenCvLoaded({
  scriptUrl = DEFAULT_OPENCV_URL,
  timeoutMs = 20_000,
}: {
  scriptUrl?: string;
  timeoutMs?: number;
} = {}): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }
  if (isReady(getCv())) return Promise.resolve(true);
  if (openCvLoadPromise) return openCvLoadPromise;

  openCvLoadPromise = new Promise<boolean>((resolve) => {
    const existingScript = document.getElementById(OPENCV_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      void waitForRuntimeReady(timeoutMs).then(resolve);
      return;
    }

    const script = document.createElement("script");
    script.id = OPENCV_SCRIPT_ID;
    script.async = true;
    script.src = scriptUrl;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      void waitForRuntimeReady(timeoutMs).then(resolve);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return openCvLoadPromise;
}
