import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/shadcn/button";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
  active?: boolean;
  floating?: boolean;
};

const feedFilters = ["All Vibes", "Hair", "Makeup", "Outfits", "Gaming Setup"] as const;

const trendingTopics = ["#CyberPunk", "#GlassSkin", "#Y2KCore", "#IcyBlonde"] as const;

const sidebarItems: NavItem[] = [
  { label: "Feed", href: routes.home, icon: HomeIcon, active: true },
  { label: "Explore", href: routes.discover, icon: ExploreIcon },
  { label: "AI Lab", href: routes.editor, icon: SparklesIcon },
  { label: "Saved", href: routes.savedHairstyles, icon: BookmarkIcon },
];

const feedPosts = [
  {
    author: "Stylist Aria",
    role: "Platinum Blonde Master",
    handle: "@aria.glow",
    title: "Platinum Blonde Transformation",
    description:
      "From brassy to icy in one session. We used a cold-press lightening plan to keep shine while lifting five levels.",
    cta: "Try This Style",
    likes: "1.2k",
    comments: "84",
    category: "Hair",
    accent: "from-sky-500 via-blue-500 to-indigo-600",
    beforeAccent: "from-stone-500 to-amber-700",
    beforeLabel: "Warm brunette before",
    afterLabel: "Icy blonde finish",
    avatar: "A",
  },
  {
    author: "Visuals by Leo",
    role: "Y2K Aesthetic Expert",
    handle: "@leo.iridescent",
    title: "Euphoria-Inspired Holographic Glow",
    description:
      "Glossy skin, chrome lids, and a shimmer wash built for short-form video. The iridescent base keeps the color alive on camera.",
    cta: "Virtual Try-On",
    likes: "3.8k",
    comments: "210",
    category: "Makeup",
    accent: "from-fuchsia-500 via-violet-500 to-indigo-600",
    beforeAccent: "from-zinc-500 to-slate-700",
    beforeLabel: "Bare face before",
    afterLabel: "Holographic glow",
    avatar: "L",
  },
] as const;

const suggestedCreators = [
  { name: "Zoe Design", niche: "Digital Fashion", handle: "zoe.design", initials: "ZD" },
  { name: "Kai.VFX", niche: "AR Filters", handle: "kai.vfx", initials: "KV" },
  { name: "Mila Rose", niche: "Clean Girl Look", handle: "mila.rose", initials: "MR" },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] dark:text-slate-50">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-8">
            <Link className="flex shrink-0 items-center gap-3" href={routes.home}>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                <SparklesIcon className="size-5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-lg font-extrabold tracking-tight">VibeCheck</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Style transformations</p>
              </div>
            </Link>

            <label className="relative hidden min-w-0 flex-1 items-center md:flex">
              <SearchIcon className="pointer-events-none absolute left-3 size-4 text-slate-400" />
              <input
                className="h-11 w-full rounded-full border border-slate-200 bg-slate-100 pl-10 pr-4 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-900 dark:focus:border-blue-400/40 dark:focus:bg-slate-950 dark:focus:ring-blue-500/10"
                placeholder="Search styles, artists, or vibes..."
                type="text"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Button className="rounded-full px-4 shadow-lg shadow-blue-600/20" size="lg">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
            <button
              aria-label="Notifications"
              className="relative flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:text-blue-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
              type="button"
            >
              <BellIcon className="size-5" />
              <span className="absolute right-3 top-3 size-2 rounded-full bg-rose-500" />
            </button>
            <Link
              aria-label="Profile"
              className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 font-semibold text-white shadow-lg shadow-blue-600/20"
              href={routes.profile("you")}
            >
              Y
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl gap-6 px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">
        <aside className="sticky top-24 hidden h-fit w-64 shrink-0 lg:block">
          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-4 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/10">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <Link
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    item.active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                  href={item.href}
                >
                  <item.icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-8">
              <p className="mb-4 px-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                Trending Vibes
              </p>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic) => (
                  <button
                    key={topic}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                    type="button"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
            {feedFilters.map((filter, index) => (
              <button
                key={filter}
                className={cn(
                  "shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  index === 0
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:text-blue-200"
                )}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <div className="rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-600 to-violet-600 p-6 text-white shadow-2xl shadow-blue-600/15 dark:border-blue-400/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-blue-100">Following feed</p>
                  <h1 className="text-3xl font-extrabold tracking-tight">Fresh looks from creators you follow</h1>
                  <p className="max-w-xl text-sm text-blue-50/90">
                    This home page can become the personalized feed for transformations, try-ons, tutorials,
                    and saved inspiration from your community.
                  </p>
                </div>
                <Button
                  asChild
                  className="rounded-full bg-white text-blue-700 hover:bg-blue-50"
                  size="lg"
                  variant="secondary"
                >
                  <Link href={routes.editor}>Open AI Lab</Link>
                </Button>
              </div>
            </div>

            {feedPosts.map((post) => (
              <article
                key={post.title}
                className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-xl shadow-slate-200/40 backdrop-blur transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/10"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 font-semibold text-white">
                      {post.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{post.author}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {post.role} · {post.handle}
                      </p>
                    </div>
                  </div>

                  <button
                    aria-label={`More options for ${post.title}`}
                    className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
                    type="button"
                  >
                    <MoreIcon className="size-5" />
                  </button>
                </div>

                <div className="px-4 pb-4">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-5 text-white",
                      post.accent
                    )}
                  >
                    <div className="flex min-h-[22rem] flex-col justify-between sm:min-h-[25rem]">
                      <div className="flex items-start justify-between gap-4">
                        <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                          {post.category}
                        </span>
                        <div
                          className={cn(
                            "w-28 rounded-[1.4rem] border border-white/20 bg-gradient-to-br p-3 shadow-2xl backdrop-blur sm:w-36",
                            post.beforeAccent
                          )}
                        >
                          <div className="flex aspect-square items-end rounded-[1rem] border border-white/15 bg-black/15 p-2">
                            <span className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                              Before
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-white/80">{post.beforeLabel}</p>
                        </div>
                      </div>

                      <div className="max-w-md space-y-3">
                        <div className="inline-flex rounded-full border border-white/20 bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
                          {post.afterLabel}
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-extrabold tracking-tight">{post.title}</h2>
                          <p className="max-w-lg text-sm leading-6 text-white/90">{post.description}</p>
                        </div>
                        <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" size="lg">
                          <SparklesIcon className="size-4" />
                          {post.cta}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 pt-4">
                    <StatButton icon={HeartIcon} label={post.likes} />
                    <StatButton icon={CommentIcon} label={post.comments} />
                    <button
                      aria-label={`Save ${post.title}`}
                      className="ml-auto flex size-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-blue-200"
                      type="button"
                    >
                      <BookmarkIcon className="size-5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="sticky top-24 hidden h-fit w-80 shrink-0 xl:block">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/10">
              <h2 className="text-lg font-extrabold tracking-tight">Style Architects</h2>
              <div className="mt-5 space-y-4">
                {suggestedCreators.map((creator) => (
                  <div key={creator.handle} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-600 text-sm font-semibold text-white dark:from-slate-100 dark:to-slate-400 dark:text-slate-950">
                        {creator.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{creator.name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {creator.niche} · @{creator.handle}
                        </p>
                      </div>
                    </div>
                    <Button className="rounded-full px-3" size="sm" variant="outline">
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-cyan-400 p-6 text-white shadow-2xl shadow-blue-600/20">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <SparklesIcon className="size-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold tracking-tight">AI Style Swap</h2>
                  <p className="text-sm text-white/85">
                    Upload a selfie and try any trending look instantly with the editing engine.
                  </p>
                </div>
                <Button className="rounded-full bg-white text-blue-700 hover:bg-blue-50" size="lg">
                  Get Started
                </Button>
              </div>
            </section>
          </div>
        </aside>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {mobileNavItems.map((item) => (
            <Link
              key={item.label}
              aria-label={item.label}
              className={cn(
                "flex size-11 items-center justify-center rounded-full transition",
                item.floating
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 -translate-y-5"
                  : item.active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
                    : "text-slate-400"
              )}
              href={item.href}
            >
              <item.icon className="size-5" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

const mobileNavItems: NavItem[] = [
  { label: "Feed", href: routes.home, icon: HomeIcon, active: true },
  { label: "Explore", href: routes.discover, icon: ExploreIcon },
  { label: "Create", href: routes.editor, icon: PlusIcon, floating: true },
  { label: "Saved", href: routes.savedHairstyles, icon: HeartIcon },
  { label: "Profile", href: routes.profile("you"), icon: UserIcon },
];

function StatButton({
  icon: Icon,
  label,
}: {
  icon: ComponentType<IconProps>;
  label: string;
}) {
  return (
    <button
      className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
      type="button"
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

type IconProps = {
  className?: string;
};

function IconBase({
  className,
  children,
  viewBox = "0 0 24 24",
}: IconProps & {
  children: ReactNode;
  viewBox?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

function SparklesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
    </IconBase>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </IconBase>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

function BellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7" />
      <path d="M10 19a2 2 0 004 0" />
    </IconBase>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </IconBase>
  );
}

function ExploreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2.3 5.2-5.2 2.3 2.3-5.2 5.2-2.3z" />
    </IconBase>
  );
}

function BookmarkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 4.5h10a1 1 0 011 1V20l-6-3-6 3V5.5a1 1 0 011-1z" />
    </IconBase>
  );
}

function HeartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-7-4.3-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.7-7 10-7 10z" />
    </IconBase>
  );
}

function CommentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 6.5h14a2 2 0 012 2v7a2 2 0 01-2 2H10l-5 4v-4H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
    </IconBase>
  );
}

function MoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </IconBase>
  );
}
