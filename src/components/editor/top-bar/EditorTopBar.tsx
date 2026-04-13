"use client";

import Link from "next/link";
import { routes } from "@/config/routes";

type Props = {
  onSave?: () => void;
  canSave?: boolean;
};

export function EditorTopBar({ onSave, canSave = true }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 z-20 dark:border-slate-800 dark:bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <Link href={routes.home} className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <span className="material-symbols-outlined text-xl">style</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">VibeCut AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">
              Editor Pro
            </p>
          </div>
        </Link>
      </div>

      {/* Center Controls */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo / Reset */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <ToolbarButton icon="undo" label="Undo" />
          <ToolbarButton icon="redo" label="Redo" />
          <div className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
          <ToolbarButton icon="restart_alt" label="Reset" />
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <ToolbarButton icon="zoom_in" label="Zoom in" />
          <ToolbarButton icon="zoom_out" label="Zoom out" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <span className="material-symbols-outlined text-xl">share</span>
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-bold hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <span className="material-symbols-outlined text-xl">cloud_upload</span>
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 text-white px-6 text-sm font-bold shadow-lg shadow-blue-600/25 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-xl">rocket_launch</span>
            <span>Publish</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function ToolbarButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-colors dark:hover:bg-slate-700 dark:hover:text-white"
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </button>
  );
}
