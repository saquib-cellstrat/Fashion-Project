"use client";

import Link from "next/link";
import { useMemo } from "react";
import { routes } from "@/config/routes";
import { getEditorSourceProfileFromDraft } from "@/lib/storage/onboarding-draft";

export default function EditorNewSessionPage() {
  const sourceProfile = useMemo(() => getEditorSourceProfileFromDraft(), []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Start new AI session</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          We preload your latest onboarding photo so hairstyle previews stay consistent.
        </p>

        {sourceProfile ? (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <img
                src={sourceProfile.imageDataUrl}
                alt={`${sourceProfile.displayName} profile`}
                className="size-20 rounded-xl object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {sourceProfile.displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{sourceProfile.fullName}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Face detected: {sourceProfile.quality.faceDetected ? "Yes" : "No"} | Center score:{" "}
                  {Math.round(sourceProfile.quality.centerScore * 100)}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            No onboarding source photo found. Complete onboarding photo setup first.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href={routes.onboardingPhoto}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-400"
          >
            Setup onboarding photo
          </Link>
          <Link
            href={routes.editor}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open editor
          </Link>
        </div>
      </div>
    </main>
  );
}
