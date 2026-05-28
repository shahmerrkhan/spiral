export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#05030b] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Loading dashboard</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase tracking-tight sm:text-6xl">
            Rebuilding your spiral.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
            Pulling your goal, milestones, and weekly evidence. This screen is intentionally lightweight so route loading never appears blank.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="min-h-[180px] rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:p-8"
            >
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
              <div className="mt-5 space-y-4">
                <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
