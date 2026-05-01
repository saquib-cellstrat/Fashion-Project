import { useEffect, useState } from "react";

type OpenCvLike = {
  Mat?: unknown;
  seamlessClone?: unknown;
};

export type OpenCvReadyState = {
  ready: boolean;
  error: string | null;
};

const POLL_INTERVAL_MS = 120;
const DEFAULT_TIMEOUT_MS = 15_000;

function isOpenCvReady(cv: OpenCvLike | undefined): boolean {
  return Boolean(cv && typeof cv.Mat === "function" && typeof cv.seamlessClone === "function");
}

function getOpenCvIssue(cv: OpenCvLike | undefined): string | null {
  if (!cv) return null;
  if (typeof cv.Mat !== "function") return "OpenCV runtime is not initialized yet.";
  if (typeof cv.seamlessClone !== "function") {
    return "OpenCV loaded, but this build does not expose seamlessClone.";
  }
  return null;
}

function getGlobalCv(): OpenCvLike | undefined {
  return (globalThis as typeof globalThis & { cv?: OpenCvLike }).cv;
}

export function waitForOpenCvReady(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (isOpenCvReady(getGlobalCv())) return Promise.resolve(true);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (isOpenCvReady(getGlobalCv())) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, POLL_INTERVAL_MS);
  });
}

export function useOpenCvReady(timeoutMs = DEFAULT_TIMEOUT_MS): OpenCvReadyState {
  const [state, setState] = useState<OpenCvReadyState>(() => ({
    ready: typeof window !== "undefined" && isOpenCvReady(getGlobalCv()),
    error: typeof window === "undefined" ? "OpenCV is only available in browser environments." : null,
  }));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const issue = getOpenCvIssue(getGlobalCv());
        if (issue) {
          setState({ ready: false, error: issue });
          return;
        }
        const ready = await waitForOpenCvReady(timeoutMs);
        if (isCancelled) return;
        if (!ready) {
          const nextIssue = getOpenCvIssue(getGlobalCv());
          setState({
            ready: false,
            error: nextIssue ?? "OpenCV.js did not become ready before timeout.",
          });
          return;
        }
        setState({ ready: true, error: null });
      } catch (error) {
        if (isCancelled) return;
        setState({
          ready: false,
          error: error instanceof Error ? error.message : "Failed to initialize OpenCV.js.",
        });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [timeoutMs]);

  return state;
}
