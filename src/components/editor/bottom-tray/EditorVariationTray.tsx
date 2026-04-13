"use client";

import type { Variation } from "@/types/editor";
import { cn } from "@/lib/utils/cn";

type Props = {
  variations: Variation[];
  selectedVariationId: string;
  onSelectVariation: (id: string) => void;
};

export function EditorVariationTray({
  variations,
  selectedVariationId,
  onSelectVariation,
}: Props) {
  // Calculate which page we're on for dots
  const totalPages = Math.max(1, Math.ceil(variations.length / 4));
  const selectedIndex = variations.findIndex((v) => v.id === selectedVariationId);
  const currentPage = Math.floor(Math.max(0, selectedIndex) / 4);

  return (
    <div className="h-40 shrink-0 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Variation Tray
        </h3>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === currentPage
                  ? "w-6 bg-blue-600"
                  : "w-2 bg-slate-300 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Scrollable thumbnails */}
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {!variations.length && (
          <div className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Upload a hairstyle overlay and select it to preview on your base photo.
          </div>
        )}
        {variations.map((variation) => {
          const isActive = selectedVariationId === variation.id;

          return (
            <button
              key={variation.id}
              type="button"
              onClick={() => onSelectVariation(variation.id)}
              className={cn(
                "group relative flex min-w-[140px] cursor-pointer flex-col gap-2 transition-all",
                isActive ? "" : "opacity-70 hover:opacity-100"
              )}
            >
              <div
                className={cn(
                  "relative h-24 w-full overflow-hidden rounded-2xl",
                  isActive &&
                    "ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-950"
                )}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${variation.thumbnailUrl}")`,
                  }}
                />
                {isActive && (
                  <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-3xl">
                      check_circle
                    </span>
                  </div>
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                )}
              </div>
              <p
                className={cn(
                  "text-center text-xs font-bold",
                  isActive
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400"
                )}
              >
                {variation.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
