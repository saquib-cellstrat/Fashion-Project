"use client";

import Link from "next/link";
import { routes } from "@/config/routes";
import { readOnboardingDraft } from "@/lib/storage/onboarding-draft";

export function ProfileOnboardingCard() {
  const draft = readOnboardingDraft();
  const profileDone = draft.profile.firstName.length > 1 && draft.profile.displayName.length > 2;
  const photoDone = Boolean(draft.photo?.processedDataUrl);
  const completedSteps = Number(profileDone) + Number(photoDone);
  const complete = completedSteps === 2;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Onboarding</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            complete
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {complete ? "Complete" : `${completedSteps}/2 done`}
        </span>
      </div>

      <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
        {complete ? "AI profile ready" : "Finish AI photo setup"}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {complete
          ? "Your profile details and face photo are ready for AI hairstyle previews."
          : "Complete your details and upload a clear frontal photo for accurate AI results."}
      </p>

      <div className="mt-4 space-y-2">
        {!profileDone && (
          <Link
            href={routes.onboardingProfile}
            className="block rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Complete profile details
          </Link>
        )}
        {!photoDone && (
          <Link
            href={routes.onboardingPhoto}
            className="block rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Upload and crop face photo
          </Link>
        )}
        {complete && (
          <>
            <Link
              href={routes.onboarding}
              className="block rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
            >
              Review onboarding
            </Link>
            <Link
              href={routes.editor}
              className="block rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Start AI Lab
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

