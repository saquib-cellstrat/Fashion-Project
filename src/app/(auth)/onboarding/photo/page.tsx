"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { routes } from "@/config/routes";
import {
  onboardingPhotoSchema,
  type OnboardingPhotoInput,
} from "@/features/auth/schemas/onboarding.schema";
import { GuidedProfilePhotoUploader } from "@/components/media/image-uploader/GuidedProfilePhotoUploader";
import { readOnboardingDraft, saveOnboardingPhoto } from "@/lib/storage/onboarding-draft";

export default function OnboardingPhotoPage() {
  const draft = useMemo(() => readOnboardingDraft(), []);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function onSavePhoto(photo: OnboardingPhotoInput) {
    setSaved(false);
    setError("");

    const parsed = onboardingPhotoSchema.safeParse(photo);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Could not save photo.");
      return;
    }
    saveOnboardingPhoto(parsed.data);
    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Step 2 / 2</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
          Guided profile photo
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Upload a clean, front-facing portrait. This image will be reused by AI Lab hairstyle try-on.
        </p>

        <div className="mt-8">
          <GuidedProfilePhotoUploader initialPhoto={draft.photo} onSave={onSavePhoto} />
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            Photo saved successfully. You can now continue to AI Lab editor.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={routes.onboarding}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-400"
          >
            Back to onboarding
          </Link>
          <Link
            href={routes.editor}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Continue to editor
          </Link>
        </div>
      </div>
    </main>
  );
}
