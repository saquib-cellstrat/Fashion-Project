"use client";

import type { EditorToolId } from "@/types/editor";
import { editorTools } from "@/features/editor/mock-editor-data";
import { cn } from "@/lib/utils/cn";

type Props = {
  activeTool: EditorToolId;
  onToolChange: (tool: EditorToolId) => void;
};

export function EditorIconToolbar({ activeTool, onToolChange }: Props) {
  return (
    <aside className="flex w-20 flex-col items-center border-r border-slate-200 bg-white py-6 gap-6 shrink-0 z-10 dark:border-slate-800 dark:bg-slate-900">
      {editorTools.map((tool, index) => {
        const isActive = activeTool === tool.id;
        const isLast = index === editorTools.length - 1;

        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1",
              isLast && "mt-auto"
            )}
          >
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-50 text-slate-600 hover:bg-blue-600/10 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
              )}
            >
              <span className="material-symbols-outlined text-2xl">{tool.icon}</span>
            </div>
            <span
              className={cn(
                "text-[10px] font-bold uppercase",
                isActive ? "text-blue-600" : "text-slate-500"
              )}
            >
              {tool.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
