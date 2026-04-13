"use client";

import type {
  EditorToolId,
  HairstyleTemplate,
  ColorSwatch,
  HairAnchor,
  HairCalibrationPoints,
} from "@/types/editor";
import {
  colorSwatches,
} from "@/features/editor/mock-editor-data";
import { cn } from "@/lib/utils/cn";
import { useMemo, useRef, useState } from "react";
import { HairFitControls } from "./HairFitControls";
import { HairLandmarkCalibration } from "./HairLandmarkCalibration";
import type { HairDetachMode } from "@/lib/image/hair-template-preprocess";

type Props = {
  activeTool: EditorToolId;
  hairstyles: HairstyleTemplate[];
  selectedHairstyleImageUrl: string | null;
  selectedHairstyleId: string;
  selectedColorId: string;
  onSelectHairstyle: (id: string) => void;
  onUploadHairstyles: (files: FileList | null) => void;
  onSelectColor: (id: string) => void;
  onHairAnchorChange: (id: string, patch: Partial<HairAnchor>) => void;
  onHairAnchorReset: (id: string) => void;
  onHairAnchorApplyToAll: (sourceId: string) => void;
  onHairCalibrationChange: (id: string, calibration: HairCalibrationPoints) => void;
  onHairCalibrationClear: (id: string) => void;
  isProcessingUploads?: boolean;
  isReprocessingHairstyle?: boolean;
  onReprocessHairstyle?: (id: string, mode: HairDetachMode) => void;
};

export function EditorLeftPanel({
  activeTool,
  hairstyles,
  selectedHairstyleImageUrl,
  selectedHairstyleId,
  selectedColorId,
  onSelectHairstyle,
  onUploadHairstyles,
  onSelectColor,
  onHairAnchorChange,
  onHairAnchorReset,
  onHairAnchorApplyToAll,
  onHairCalibrationChange,
  onHairCalibrationClear,
  isProcessingUploads,
  isReprocessingHairstyle,
  onReprocessHairstyle,
}: Props) {
  return (
    <aside className="w-[280px] border-r border-slate-200 bg-white flex flex-col overflow-hidden shrink-0 dark:border-slate-800 dark:bg-slate-900 animate-in slide-in-from-left duration-200">
      {activeTool === "style" && (
        <StylePanel
          hairstyles={hairstyles}
          selectedId={selectedHairstyleId}
          onSelect={onSelectHairstyle}
          onUpload={onUploadHairstyles}
          onHairAnchorChange={onHairAnchorChange}
          onHairAnchorReset={onHairAnchorReset}
          onHairAnchorApplyToAll={onHairAnchorApplyToAll}
          onHairCalibrationChange={onHairCalibrationChange}
          onHairCalibrationClear={onHairCalibrationClear}
          isProcessingUploads={isProcessingUploads}
          isReprocessingHairstyle={isReprocessingHairstyle}
          onReprocessHairstyle={onReprocessHairstyle}
        />
      )}
      {activeTool === "color" && (
        <ColorPanel
          selectedId={selectedColorId}
          selectedHairstyleImageUrl={selectedHairstyleImageUrl}
          onSelect={onSelectColor}
        />
      )}
      {activeTool !== "style" && activeTool !== "color" && (
        <PlaceholderPanel tool={activeTool} />
      )}

      {/* User footer */}
      <div className="p-4 border-t border-slate-200 flex items-center gap-3 shrink-0 dark:border-slate-800">
        <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm border-2 border-blue-600">
          AR
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold truncate">Alex Rivera</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase">Pro Member</p>
        </div>
        <button
          type="button"
          className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-xl text-slate-400">
            settings
          </span>
        </button>
      </div>
    </aside>
  );
}

/* ─── Style Panel ───────────────────────────────────────────────── */
function StylePanel({
  hairstyles,
  selectedId,
  onSelect,
  onUpload,
  onHairAnchorChange,
  onHairAnchorReset,
  onHairAnchorApplyToAll,
  onHairCalibrationChange,
  onHairCalibrationClear,
  isProcessingUploads,
  isReprocessingHairstyle,
  onReprocessHairstyle,
}: {
  hairstyles: HairstyleTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpload: (files: FileList | null) => void;
  onHairAnchorChange: (id: string, patch: Partial<HairAnchor>) => void;
  onHairAnchorReset: (id: string) => void;
  onHairAnchorApplyToAll: (sourceId: string) => void;
  onHairCalibrationChange: (id: string, calibration: HairCalibrationPoints) => void;
  onHairCalibrationClear: (id: string) => void;
  isProcessingUploads?: boolean;
  isReprocessingHairstyle?: boolean;
  onReprocessHairstyle?: (id: string, mode: HairDetachMode) => void;
}) {
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      hairstyles.filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase())),
    [hairstyles, search]
  );

  const selectedHairstyle = useMemo(
    () => hairstyles.find((h) => h.id === selectedId) ?? null,
    [hairstyles, selectedId]
  );

  return (
    <div className="p-5 flex flex-col h-full overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">Hairstyles</h2>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
          search
        </span>
        <input
          className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-600/20 placeholder:text-slate-500 outline-none dark:bg-slate-800"
          placeholder="Search styles..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Upload */}
      <button
        type="button"
        disabled={isProcessingUploads}
        onClick={() => fileInputRef.current?.click()}
        className="w-full mb-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/25 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-xl">
          {isProcessingUploads ? "hourglass_top" : "upload"}
        </span>
        <span>{isProcessingUploads ? "Processing upload..." : "Upload hairstyle overlay"}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          onUpload(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {/* Hairstyle grid + fit controls */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 flex flex-col gap-3 min-h-0">
        {filtered.length ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((h) => (
              <HairstyleCard
                key={h.id}
                hairstyle={h}
                isSelected={selectedId === h.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Upload cropped hairstyle overlays to start try-on. Built-in hairstyle photos are removed.
          </div>
        )}
        {selectedHairstyle && (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {selectedHairstyle.isAutoCalibrated ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-emerald-600">auto_awesome</span>
                  <span className="font-semibold">Auto landmarks applied</span>
                  {selectedHairstyle.calibrationQuality === "low" && (
                    <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      Low confidence
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-slate-500">tune</span>
                  <span className="font-semibold">Manual calibration recommended</span>
                </div>
              )}
              {!!selectedHairstyle.calibrationWarnings?.length && (
                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">
                  {selectedHairstyle.calibrationWarnings[0]}
                </p>
              )}
            </div>
            <HairFitControls
              hairstyle={selectedHairstyle}
              onAnchorChange={onHairAnchorChange}
              onAnchorReset={onHairAnchorReset}
              onAnchorApplyToAll={onHairAnchorApplyToAll}
            />
            <HairLandmarkCalibration
              hairstyle={selectedHairstyle}
              onCalibrationChange={onHairCalibrationChange}
              onCalibrationClear={onHairCalibrationClear}
              onReprocess={onReprocessHairstyle}
              isReprocessing={isReprocessingHairstyle}
            />
          </>
        )}
      </div>
    </div>
  );
}

function HairstyleCard({
  hairstyle,
  isSelected,
  onSelect,
}: {
  hairstyle: HairstyleTemplate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hairstyle.id)}
      className="group cursor-pointer text-left"
    >
      <div
        className={cn(
          "relative aspect-[4/5] rounded-xl overflow-hidden mb-2 transition-all active:scale-95",
          isSelected
            ? "ring-2 ring-blue-600 ring-offset-2 shadow-sm dark:ring-offset-slate-900"
            : "border border-slate-200 hover:ring-2 hover:ring-blue-600/40 hover:ring-offset-2 dark:border-slate-800 dark:hover:ring-offset-slate-900"
        )}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${hairstyle.imageUrl}")` }}
        />
        {isSelected && (
          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-3xl">
              check_circle
            </span>
          </div>
        )}
      </div>
      <p
        className={cn(
          "text-xs font-bold text-center transition-colors",
          isSelected
            ? "text-slate-900 dark:text-white"
            : "text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"
        )}
      >
        {hairstyle.name}
      </p>
    </button>
  );
}

/* ─── Color Panel ───────────────────────────────────────────────── */
function ColorPanel({
  selectedId,
  selectedHairstyleImageUrl,
  onSelect,
}: {
  selectedId: string;
  selectedHairstyleImageUrl: string | null;
  onSelect: (id: string) => void;
}) {
  const natural = colorSwatches.filter((c) => c.group === "natural");
  const vivid = colorSwatches.filter((c) => c.group === "vivid");
  const pastel = colorSwatches.filter((c) => c.group === "pastel");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 pb-2 shrink-0">
        <h3 className="text-xl font-extrabold">Color Library</h3>
        <p className="text-xs text-slate-500 font-medium">
          Preview salon shades on selected hairstyle
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 flex flex-col gap-6">
        <ColorGroup
          title="Natural Tones"
          count={natural.length}
          swatches={natural}
          selectedHairstyleImageUrl={selectedHairstyleImageUrl}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <ColorGroup
          title="Vivid Dyes"
          swatches={vivid}
          selectedHairstyleImageUrl={selectedHairstyleImageUrl}
          selectedId={selectedId}
          onSelect={onSelect}
        />
        <ColorGroup
          title="Subtle Pastels"
          swatches={pastel}
          selectedHairstyleImageUrl={selectedHairstyleImageUrl}
          selectedId={selectedId}
          onSelect={onSelect}
        />

        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className="w-full h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all group dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-xl">tune</span>
            <span className="text-sm font-bold">Custom Advanced Picker</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorGroup({
  title,
  count,
  swatches,
  selectedHairstyleImageUrl,
  selectedId,
  onSelect,
}: {
  title: string;
  count?: number;
  swatches: ColorSwatch[];
  selectedHairstyleImageUrl: string | null;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
          {title}
        </h4>
        {count && (
          <span className="text-[10px] text-blue-600 font-bold bg-blue-600/10 px-2 py-0.5 rounded">
            {count} Styles
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {swatches.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            onClick={() => onSelect(swatch.id)}
            className={cn(
              "group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer",
              selectedId === swatch.id
                ? "border-2 border-blue-600"
                : "border border-slate-100 dark:border-slate-800"
            )}
          >
            <div className="absolute inset-0">
              {selectedHairstyleImageUrl ? (
                <>
                  <img
                    alt={swatch.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    src={selectedHairstyleImageUrl}
                  />
                  <div
                    className="absolute inset-0 mix-blend-color"
                    style={{ backgroundColor: swatch.hex, opacity: 0.75 }}
                  />
                </>
              ) : (
                <img
                  alt={swatch.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  src={swatch.imageUrl}
                />
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1">
              <p className="text-[9px] font-bold text-white leading-tight truncate">{swatch.name}</p>
              <p className="text-[8px] text-white/80 leading-tight">{swatch.hex.toUpperCase()}</p>
            </div>
            {selectedId === swatch.id && (
              <div className="absolute top-1 right-1 size-3 bg-blue-600 rounded-full border border-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[8px] text-white font-bold">
                  check
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ─── Placeholder for other tools ────────────────────────────────  */
function PlaceholderPanel({ tool }: { tool: string }) {
  const toolNames: Record<string, { title: string; desc: string; icon: string }> = {
    length: {
      title: "Length Controls",
      desc: "Adjust hair length parameters with precision sliders.",
      icon: "straighten",
    },
    fade: {
      title: "Fade Editor",
      desc: "Configure fade gradients and blending zones.",
      icon: "gradient",
    },
    texture: {
      title: "Texture Studio",
      desc: "Apply and fine-tune hair texture effects.",
      icon: "waves",
    },
    "3d": {
      title: "3D Preview",
      desc: "View your style from every angle in 3D space.",
      icon: "view_in_ar",
    },
  };

  const info = toolNames[tool] ?? {
    title: "Coming Soon",
    desc: "This feature is under development.",
    icon: "construction",
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
      <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center dark:bg-slate-800">
        <span className="material-symbols-outlined text-3xl text-slate-400">
          {info.icon}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-extrabold">{info.title}</h3>
        <p className="text-sm text-slate-500 mt-1">{info.desc}</p>
      </div>
      <div className="mt-2 px-3 py-1.5 rounded-full bg-blue-600/10 text-blue-600 text-xs font-bold">
        Coming Soon
      </div>
    </div>
  );
}
