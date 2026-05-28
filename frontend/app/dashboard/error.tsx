"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05030b] px-6 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-red-300/20 bg-red-300/[0.07] p-8 text-center shadow-2xl shadow-red-950/30">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-red-200">Dashboard error boundary</p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight">The spiral hit a snag.</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-200">
          Something unexpected interrupted the dashboard render. We caught it so the app does not stay stuck on a loading screen.
        </p>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-xs leading-5 text-zinc-300">
          {error.message || "Unknown dashboard error"}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full border border-red-200/40 bg-red-200/10 px-6 py-3 text-xs font-black uppercase tracking-[0.25em] text-red-100 transition hover:bg-red-200/20"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
