"use client";

import Link from "next/link";
import { useMemo } from "react";
import { routes } from "@/config/routes";
import { readOnboardingDraft } from "@/lib/storage/onboarding-draft";

export default function OnboardingPage() {
  const draft = useMemo(() => readOnboardingDraft(), []);
  const profileReady = draft.profile.firstName.length > 1 && draft.profile.displayName.length > 2;
  const photoReady = Boolean(draft.photo?.processedDataUrl);
  const completed = Number(profileReady) + Number(photoReady);
  const progress = `${Math.round((completed / 2) * 100)}%`;

  return (
    <main className="min-h-screen bg-slate-100 pb-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Onboarding</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Build your AI-ready profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Complete your profile details and upload a clean front-facing portrait for accurate hairstyle
              try-ons.
            </p>
          </div>

          <div className="px-6 py-6 md:px-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                <span>Progress</span>
                <span>
                  {completed}/2 complete ({progress})
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all"
                  style={{ width: progress }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <StepCard
                index="01"
                title="Profile details"
                description="Name, identity, hair goals, and style preferences."
                complete={profileReady}
                href={routes.onboardingProfile}
                actionLabel={profileReady ? "Review details" : "Complete details"}
              />
              <StepCard
                index="02"
                title="Guided face photo"
                description="Passport-style upload with framing guide and crop controls."
                complete={photoReady}
                href={routes.onboardingPhoto}
                actionLabel={photoReady ? "Review photo" : "Upload photo"}
              />
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

function StepCard({
  index,
  title,
  description,
  complete,
  href,
  actionLabel,
}: {
  index: string;
  title: string;
  description: string;
  complete: boolean;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{index}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            complete
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          }`}
        >
          {complete ? "Complete" : "Pending"}
        </span>
      </div>

      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>

      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-blue-500 dark:hover:text-white"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
