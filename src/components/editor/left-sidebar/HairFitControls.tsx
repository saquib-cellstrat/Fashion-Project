"use client";

import type { HairAnchor, HairstyleTemplate } from "@/types/editor";
import { normalizeHairAnchor } from "@/config/hair-anchors";

type Props = {
  hairstyle: HairstyleTemplate;
  onAnchorChange: (id: string, patch: Partial<HairAnchor>) => void;
  onAnchorReset: (id: string) => void;
  /** Apply this hairstyle’s current anchor values to every hairstyle in the list. */
  onAnchorApplyToAll: (sourceId: string) => void;
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v: number) => v.toFixed(3),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums text-slate-900 dark:text-slate-200">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600 h-2"
      />
    </div>
  );
}

export function HairFitControls({
  hairstyle,
  onAnchorChange,
  onAnchorReset,
  onAnchorApplyToAll,
}: Props) {
  const a = normalizeHairAnchor(hairstyle.anchor);

  const patch = (p: Partial<HairAnchor>) => onAnchorChange(hairstyle.id, p);

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40 open:shadow-sm">
      <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200 select-none">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-blue-600">tune</span>
          Hair fit
        </span>
        <span className="material-symbols-outlined text-slate-400 text-lg">expand_more</span>
      </summary>
      <div className="px-3 pb-3 pt-0 flex flex-col gap-3 border-t border-slate-200/80 dark:border-slate-700/80">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug pt-2">
          Tune alignment with face detection. Use width/height stretch when PNGs differ in aspect ratio (tall vs wide
          canvas). Use the same for all styles only if the art matches. Drag on the canvas still overrides until reset
          there.
        </p>

        <SliderRow
          label="Hairline Y (PNG)"
          value={a.foreheadY}
          min={0}
          max={1}
          step={0.005}
          onChange={(foreheadY) => patch({ foreheadY })}
        />
        <SliderRow
          label="Face center X (PNG)"
          value={a.faceCenterX}
          min={0}
          max={1}
          step={0.005}
          onChange={(faceCenterX) => patch({ faceCenterX })}
        />
        <SliderRow
          label="Face width ratio"
          value={a.faceWidthRatio}
          min={0.15}
          max={0.95}
          step={0.005}
          onChange={(faceWidthRatio) => patch({ faceWidthRatio })}
        />
        <SliderRow
          label="Scale multiplier"
          value={a.scaleMultiplier}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(scaleMultiplier) => patch({ scaleMultiplier })}
          format={(v) => `${v.toFixed(2)}×`}
        />
        <SliderRow
          label="Width stretch"
          value={a.widthStretch}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(widthStretch) => patch({ widthStretch })}
          format={(v) => `${v.toFixed(2)}×`}
        />
        <SliderRow
          label="Height stretch"
          value={a.heightStretch}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(heightStretch) => patch({ heightStretch })}
          format={(v) => `${v.toFixed(2)}×`}
        />
        <SliderRow
          label="Rotation offset (°)"
          value={a.rotationOffsetDeg}
          min={-15}
          max={15}
          step={0.5}
          onChange={(rotationOffsetDeg) => patch({ rotationOffsetDeg })}
          format={(v) => `${v.toFixed(1)}°`}
        />
        <SliderRow
          label="Nudge X"
          value={a.nudgeX}
          min={-0.2}
          max={0.2}
          step={0.005}
          onChange={(nudgeX) => patch({ nudgeX })}
        />
        <SliderRow
          label="Nudge Y"
          value={a.nudgeY}
          min={-0.2}
          max={0.2}
          step={0.005}
          onChange={(nudgeY) => patch({ nudgeY })}
        />

        <button
          type="button"
          onClick={() => onAnchorApplyToAll(hairstyle.id)}
          className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Use these settings for all hairstyles
        </button>
        <button
          type="button"
          onClick={() => onAnchorReset(hairstyle.id)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Reset to defaults
        </button>
      </div>
    </details>
  );
}
