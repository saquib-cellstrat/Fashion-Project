"use client";

import { useCallback, useMemo, useState } from "react";
import type { HairstyleTemplate } from "@/types/editor";
import {
  MIN_CALIBRATION_POINTS_FOR_SIMILARITY,
  SEMANTIC_LANDMARK_INDICES,
  type HairCalibrationPoints,
  type SemanticLandmarkId,
} from "@/lib/image/face-landmarks";
import type { HairDetachMode } from "@/lib/image/hair-template-preprocess";

const LABELS: Record<SemanticLandmarkId, string> = {
  leftEye: "Left eye",
  rightEye: "Right eye",
  noseTip: "Nose tip",
  leftEar: "Left ear",
  rightEar: "Right ear",
  chin: "Chin",
  forehead: "Forehead",
};

const ORDER = Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[];

type Props = {
  hairstyle: HairstyleTemplate;
  onCalibrationChange: (id: string, calibration: HairCalibrationPoints) => void;
  onCalibrationClear: (id: string) => void;
  onReprocess?: (id: string, mode: HairDetachMode) => void;
  isReprocessing?: boolean;
};

export function HairLandmarkCalibration({
  hairstyle,
  onCalibrationChange,
  onCalibrationClear,
  onReprocess,
  isReprocessing,
}: Props) {
  const [activeId, setActiveId] = useState<SemanticLandmarkId>(ORDER[0]);
  const [detachMode, setDetachMode] = useState<HairDetachMode>("highAccuracy");

  const points = useMemo(
    () => hairstyle.calibrationPoints ?? {},
    [hairstyle.calibrationPoints]
  );

  const count = useMemo(() => Object.keys(points).length, [points]);

  const setPoint = useCallback(
    (id: SemanticLandmarkId, x: number, y: number) => {
      const next: HairCalibrationPoints = { ...points, [id]: { x, y } };
      onCalibrationChange(hairstyle.id, next);
    },
    [hairstyle.id, onCalibrationChange, points]
  );

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      setPoint(activeId, Math.max(0, Math.min(1, nx)), Math.max(0, Math.min(1, ny)));
    },
    [activeId, setPoint]
  );

  const clearPoint = (id: SemanticLandmarkId) => {
    const next = { ...points };
    delete next[id];
    onCalibrationChange(hairstyle.id, next);
  };

  return (
    <details className="mt-3 rounded-xl border border-violet-200 bg-violet-50/80 dark:border-violet-900/50 dark:bg-violet-950/30 open:shadow-sm">
      <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200 select-none">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-violet-600">scatter_plot</span>
          Hair landmark match
        </span>
        <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
      </summary>
      <div className="px-3 pb-3 pt-0 flex flex-col gap-2 border-t border-violet-200/80 dark:border-violet-800/80">
        {hairstyle.isAutoCalibrated && (
          <div className="mt-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            Auto landmarks were applied from the uploaded template.
          </div>
        )}
        {hairstyle.calibrationQuality === "low" && (
          <div className="rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            Low-confidence landmark inference detected. Review and adjust points before final use.
          </div>
        )}
        {!!hairstyle.calibrationWarnings?.length && (
          <ul className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300">
            {hairstyle.calibrationWarnings.slice(0, 2).map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug pt-2">
          Click the hair image where each feature would sit on a full face. When at least{" "}
          {MIN_CALIBRATION_POINTS_FOR_SIMILARITY} points are set, the editor uses correspondence fit on the canvas
          (overrides slider auto-fit).
        </p>

        <div className="rounded-md border border-slate-200 bg-white/80 p-2 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Re-detach and re-calibrate
          </p>
          <div className="flex items-center gap-2">
            <select
              value={detachMode}
              onChange={(e) => setDetachMode(e.target.value as HairDetachMode)}
              className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="balanced">Balanced mode</option>
              <option value="highAccuracy">High-accuracy mode</option>
            </select>
            <button
              type="button"
              disabled={!onReprocess || isReprocessing}
              onClick={() => onReprocess?.(hairstyle.id, detachMode)}
              className="h-8 rounded-md bg-violet-600 px-3 text-[10px] font-bold text-white disabled:opacity-60"
            >
              {isReprocessing ? "Reprocessing..." : "Run"}
            </button>
          </div>
          <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
            High-accuracy removes more facial pixels but may trim some fine hair edges.
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                activeId === id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
              }`}
            >
              {LABELS[id]}
              {points[id] ? " ✓" : ""}
            </button>
          ))}
        </div>

        <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">
          Placing: {LABELS[activeId]} — click on the image
        </p>

        <div
          role="presentation"
          className="relative w-full aspect-[4/5] max-h-56 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-crosshair dark:border-slate-700 dark:bg-slate-800"
          onClick={handleImageClick}
          style={{
            backgroundImage: `url("${hairstyle.imageUrl}")`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {ORDER.map((id) => {
            const p = points[id];
            if (!p) return null;
            return (
              <div
                key={id}
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-600 shadow pointer-events-none"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                title={LABELS[id]}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span>
            {count} / {ORDER.length} points
          </span>
          {count >= MIN_CALIBRATION_POINTS_FOR_SIMILARITY ? (
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Correspondence fit active</span>
          ) : (
            <span>Need {MIN_CALIBRATION_POINTS_FOR_SIMILARITY}+ for fit</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {points[activeId] && (
            <button
              type="button"
              className="text-[10px] font-bold text-violet-600 underline"
              onClick={() => clearPoint(activeId)}
            >
              Clear {LABELS[activeId]}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onCalibrationClear(hairstyle.id)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          Clear all calibration
        </button>
      </div>
    </details>
  );
}
