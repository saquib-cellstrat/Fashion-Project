import Link from "next/link";
import { routes } from "@/config/routes";
import { ProfileOnboardingCard } from "@/components/social/profile-header/ProfileOnboardingCard";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;

  return (
    <main className="min-h-screen bg-slate-100 pb-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative h-44 bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500 md:h-56">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_30%)]" />
          </div>

          <div className="relative px-5 pb-5 md:px-8">
            <div className="-mt-16 flex flex-col gap-5 md:-mt-20 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex size-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-violet-500 text-3xl font-bold text-white shadow-xl dark:border-slate-900 md:size-32">
                  {handle.slice(0, 1).toUpperCase()}
                </div>
                <div className="pb-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">@{handle}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Fashion creator • AI hair try-ons</p>
                </div>
              </div>

              <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end md:pb-2">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-200"
                >
                  Share profile
                </button>
                <Link
                  href={routes.onboardingProfile}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-600 dark:bg-slate-100 dark:text-slate-900"
                >
                  Edit profile
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70 md:max-w-md">
              <Stat label="Posts" value="128" />
              <Stat label="Followers" value="24.8k" />
              <Stat label="Following" value="386" />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 overflow-x-auto">
                <TabLink href={routes.profile(handle)} label="Posts" active />
                <TabLink href={`${routes.profile(handle)}/looks`} label="Looks" />
                <TabLink href={`${routes.profile(handle)}/saved`} label="Saved" />
              </div>
            </div>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 font-semibold text-white">
                  {handle.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">@{handle}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">2h ago • Hairstyle preview</p>
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Latest look</p>
                <h2 className="mt-2 text-2xl font-bold">Mid fade textured crop</h2>
                <p className="mt-2 max-w-lg text-sm text-slate-200">
                  Preview generated from profile portrait with balanced lighting and frontal alignment.
                </p>
              </div>
            </article>
          </section>

          <aside className="space-y-4">
            <ProfileOnboardingCard />

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Lab</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Try hairstyles instantly using your saved profile source image.
              </p>
              <Link
                href={routes.editor}
                className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 dark:bg-slate-100 dark:text-slate-900"
              >
                Open AI Lab editor
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-center dark:bg-slate-900">
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
    </div>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
