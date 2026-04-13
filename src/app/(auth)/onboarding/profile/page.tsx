"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { routes } from "@/config/routes";
import {
  onboardingProfileSchema,
  type OnboardingProfileInput,
} from "@/features/auth/schemas/onboarding.schema";
import { readOnboardingDraft, saveOnboardingProfile } from "@/lib/storage/onboarding-draft";

const styleOptions = ["Low maintenance", "Bold transformations", "Professional look", "Trendy looks", "Natural texture"];

export default function OnboardingProfilePage() {
  const draft = useMemo(() => readOnboardingDraft(), []);
  const [form, setForm] = useState<OnboardingProfileInput>(draft.profile);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function toggleStylePreference(value: string) {
    const exists = form.stylePreferences.includes(value);
    const next = exists
      ? form.stylePreferences.filter((item) => item !== value)
      : [...form.stylePreferences, value].slice(0, 5);
    setForm((prev) => ({ ...prev, stylePreferences: next }));
    setSaved(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = onboardingProfileSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please fix form errors.");
      return;
    }
    saveOnboardingProfile(result.data);
    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-8 text-white md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Step 1 / 2</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Profile details</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Tell us who you are and what hair goals you want AI Lab to optimize for.
            </p>
          </div>

          <form className="space-y-6 px-6 py-6 md:px-8" onSubmit={onSubmit}>
            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Basic identity</p>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="First name"
                  value={form.firstName}
                  onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
                />
                <InputField
                  label="Last name"
                  value={form.lastName}
                  onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InputField
                  label="Display name"
                  value={form.displayName}
                  onChange={(value) => setForm((prev) => ({ ...prev, displayName: value }))}
                  helper="Shown in your social profile and editor history."
                />

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Age range
                  </span>
                  <select
                    value={form.ageRange}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ageRange: event.target.value as OnboardingProfileInput["ageRange"],
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none ring-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="13-17">13-17</option>
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-44">35-44</option>
                    <option value="45+">45+</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Hair profile</p>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Hair goals
                </span>
                <textarea
                  value={form.hairGoals}
                  onChange={(event) => setForm((prev) => ({ ...prev, hairGoals: event.target.value }))}
                  className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Describe your current hair concerns, desired vibe, and target outcome."
                />
              </label>

              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Style preferences (max 5)
                </p>
                <div className="flex flex-wrap gap-2">
                  {styleOptions.map((option) => {
                    const active = form.stylePreferences.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleStylePreference(option)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300"
                            : "border-slate-300 text-slate-600 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-700/40"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
            {saved && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                Profile saved. Continue to guided photo upload.
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Save profile
              </button>
              <Link
                href={routes.onboardingPhoto}
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-400"
              >
                Next: Photo setup
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function InputField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      {helper && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{helper}</span>}
    </label>
  );
}
