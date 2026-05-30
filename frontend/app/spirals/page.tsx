"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, fetchWithTimeout } from "@/lib/api-client";

type PublicSpiral = {
  id: string;
  goal: string;
  summary: string;
  score: number;
  streak: string;
  weeks_active: number;
  created_at: string;
};

const PER_PAGE = 12;

function SkeletonCard() {
  return (
    <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-6 animate-pulse">
      <div className="mb-4 flex justify-between">
        <div className="h-2 w-16 rounded-full bg-white/10" />
        <div className="h-2 w-10 rounded-full bg-white/10" />
      </div>
      <div className="h-5 w-full rounded-full bg-white/10 mb-2" />
      <div className="h-4 w-3/4 rounded-full bg-white/[0.07]" />
      <div className="mt-6 h-1 w-full rounded-full bg-white/[0.05]" />
    </div>
  );
}

export default function SpiralsPage() {
  const [spirals, setSpirals] = useState<PublicSpiral[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchWithTimeout(`${API_BASE_URL}/api/spirals/public`)
      .then((res) => res.json())
      .then((data) => setSpirals(Array.isArray(data) ? data : []))
      .catch(() => setSpirals([]))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(spirals.length / PER_PAGE));
  const visible = spirals.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <main className="min-h-screen bg-[#03020a] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(34,211,238,0.07),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-32 pt-10 sm:px-8">

        {/* Header */}
        <header className="mb-16">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 transition hover:text-cyan-300">
            ← Back
          </Link>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400">Community</p>
              <h1 className="mt-3 text-5xl font-black uppercase leading-[0.85] tracking-[-0.05em] sm:text-7xl">
                Public<br />Spirals.
              </h1>
              <p className="mt-4 max-w-md text-sm font-medium text-zinc-500">
                Real goals. Real chaos. Real people showing up anyway.
              </p>
            </div>
            {!loading && spirals.length > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  {spirals.length} spiral{spirals.length !== 1 ? "s" : ""} live
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : spirals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/[0.06] bg-white/[0.02] py-24 text-center">
            <div className="mb-6 text-6xl">🌀</div>
            <p className="text-2xl font-black uppercase">No spirals yet.</p>
            <p className="mt-3 text-sm text-zinc-500">Be the first. Share yours from the dashboard.</p>
            <Link href="/dashboard" className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-6 py-3 text-sm font-black uppercase text-[#03020a] transition hover:scale-[1.02]">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((spiral, i) => (
                <Link
                  key={spiral.id}
                  href={`/share/${spiral.id}`}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.05] hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-cyan-400/[0.03] to-fuchsia-400/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative">
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400">Spiral</p>
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-black text-fuchsia-300">
                        {spiral.score} pts
                      </span>
                    </div>

                    <h3 className="text-base font-black uppercase leading-snug tracking-tight transition-colors group-hover:text-cyan-100 line-clamp-2">
                      {spiral.goal}
                    </h3>

                    {spiral.summary && (
                      <p className="mt-2 text-xs font-medium text-zinc-500 line-clamp-2">{spiral.summary}</p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[9px] font-black uppercase text-zinc-500">
                        {spiral.weeks_active} {spiral.weeks_active === 1 ? "week" : "weeks"}
                      </span>
                      {spiral.streak && (
                        <span className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1 text-[9px] font-black uppercase text-amber-300">
                          {spiral.streak}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-700">
                        <span>Progress</span>
                        <span>{Math.round((spiral.weeks_active / 26) * 100)}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all duration-1000"
                          style={{ width: `${Math.min(100, (spiral.weeks_active / 26) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === 1}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`h-8 w-8 rounded-lg text-[10px] font-black transition ${
                        page === i + 1
                          ? "bg-cyan-400/20 border border-cyan-400/40 text-cyan-300"
                          : "border border-white/[0.06] text-zinc-600 hover:border-white/15 hover:text-zinc-300"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === totalPages}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}