"use client";

import {
  trendingPosts,
  challenges,
} from "@/features/editor/mock-editor-data";

type Props = {
  onClose: () => void;
};

export function EditorRightSidebar({ onClose }: Props) {
  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-hidden shrink-0 dark:border-slate-800 dark:bg-slate-900">
      {/* Header with close */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0">
        <h3 className="font-extrabold text-lg">Discover</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors dark:hover:bg-slate-800"
          aria-label="Close sidebar"
        >
          <span className="material-symbols-outlined text-xl text-slate-400">close</span>
        </button>
      </div>
      <div className="px-6 pb-6 flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar">
        {/* ─── Trending Section ──────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-xl">
                local_fire_department
              </span>
              Trending Now
            </h3>
            <button
              type="button"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              See All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {trendingPosts.map((post) => (
              <div
                key={post.id}
                className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer"
              >
                <img
                  alt={`Trending post by ${post.author}`}
                  src={post.imageUrl}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5">
                  <p className="text-[11px] text-white font-bold truncate">
                    {post.author}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-white text-xs">
                      favorite
                    </span>
                    <p className="text-[10px] text-white/80 font-medium">
                      {post.likes}
                    </p>
                  </div>
                </div>

                {/* Subtle persistent gradient at bottom for text readability */}
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/30 to-transparent group-hover:opacity-0 transition-opacity" />
              </div>
            ))}
          </div>
        </section>

        {/* ─── Challenges Section ────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-xl">
                emoji_events
              </span>
              Challenges
            </h3>
          </div>

          {challenges.map((challenge) =>
            challenge.featured ? (
              <div
                key={challenge.id}
                className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 p-5 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden"
              >
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1.5">
                    Weekly Special
                  </p>
                  <h4 className="text-base font-extrabold mb-2.5 leading-tight">
                    {challenge.title}
                  </h4>
                  <p className="text-xs text-white/80 mb-3">
                    {challenge.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">
                        group
                      </span>
                      <p className="text-xs font-medium">
                        {challenge.participants} participants
                      </p>
                    </div>
                    <button
                      type="button"
                      className="bg-white text-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      Join
                    </button>
                  </div>
                </div>
                {/* Background icon decoration */}
                <div className="absolute -right-4 -bottom-4 opacity-15">
                  <span className="material-symbols-outlined text-8xl">
                    bolt
                  </span>
                </div>
              </div>
            ) : (
              <div
                key={challenge.id}
                className="rounded-2xl bg-slate-50 p-4 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-400/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-extrabold">{challenge.title}</h4>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-600/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {challenge.endsIn}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {challenge.description}
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden dark:bg-slate-700">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${challenge.progress ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-400 font-medium">
                    {challenge.participants} joined
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-blue-600 font-bold hover:underline"
                  >
                    Join Now
                  </button>
                </div>
              </div>
            )
          )}
        </section>

        {/* ─── Quick Tips Section ────────────────── */}
        <section className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-5 text-white shadow-lg shadow-violet-600/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">
                lightbulb
              </span>
              <h4 className="text-sm font-extrabold">Pro Tip</h4>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              Use the <strong>Color</strong> tool to try different hair colors
              on your selected style before publishing. Combine it with{" "}
              <strong>Fade</strong> for stunning gradient effects.
            </p>
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-15">
            <span className="material-symbols-outlined text-7xl">
              auto_awesome
            </span>
          </div>
        </section>
      </div>
    </aside>
  );
}
