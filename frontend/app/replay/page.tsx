"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { CheckIn, Goal, SpiralSession, getActiveGoal, getCheckIns } from "@/lib/supabase";

function ReplayInner({ session }: { session: SpiralSession }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(900);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const activeGoal = await getActiveGoal(session);
        if (cancelled) return;
        setGoal(activeGoal);
        if (activeGoal) {
          const logs = await getCheckIns(session, activeGoal.id);
          if (!cancelled) setCheckIns(logs.sort((a, b) => a.week_number - b.week_number));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Replay jammed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [session]);

  const visibleLogs = useMemo(() => checkIns.slice(0, visibleCount), [checkIns, visibleCount]);

  useEffect(() => {
    if (!playing || loading || visibleCount >= checkIns.length) return;
    const t = window.setTimeout(() => setVisibleCount((c) => Math.min(checkIns.length, c + 1)), visibleCount === 0 ? 400 : speed);
    return () => window.clearTimeout(t);
  }, [checkIns.length, loading, playing, visibleCount, speed]);

  const effortColor = (e: number) => e >= 9 ? "#facc15" : e >= 7 ? "#22d3ee" : e >= 5 ? "#a855f7" : e >= 3 ? "#f472b6" : "#ef4444";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03020a] px-4 py-10 pb-32 text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.15),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.15),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-12 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.55em] text-cyan-300">Spiral Replay</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.07em] sm:text-6xl">The story,<br />week by week.</h1>
          </div>
          <a href="/dashboard" className="rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-300 transition hover:border-cyan-300/50 hover:text-cyan-100">
            ← Back
          </a>
        </header>

        {loading && (
          <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-cyan-300" />
            <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400">Loading the tape...</p>
          </div>
        )}

        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-bold text-red-100">{error}</div>}

        {!loading && goal && (
          <section className="mb-8 rounded-[2rem] border border-cyan-300/20 bg-black/40 p-6 backdrop-blur-xl sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">The goal</p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[-0.04em] sm:text-4xl">{goal.goal_text}</h2>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => setPlaying((v) => !v)}
                className="rounded-full bg-cyan-300 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-[#03020a] transition hover:scale-105 active:scale-95">
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <button onClick={() => { setVisibleCount(0); setPlaying(true); }}
                className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:border-purple-300/50">
                ↺ Restart
              </button>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-zinc-300">
                {visibleCount}/{checkIns.length} weeks
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Speed</span>
                <input type="range" min="300" max="2000" step="100" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-20 accent-cyan-400" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300 transition-all duration-500"
                style={{ width: checkIns.length ? `${(visibleCount / checkIns.length) * 100}%` : "0%" }} />
            </div>
          </section>
        )}

        {!loading && !goal && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center">
            <h2 className="text-3xl font-black uppercase">No active spiral yet.</h2>
            <a href="/onboarding" className="mt-6 inline-flex rounded-full bg-cyan-300 px-6 py-3 text-xs font-black uppercase text-[#03020a]">Start one →</a>
          </div>
        )}

        {!loading && goal && checkIns.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-2xl font-black uppercase">No check-ins yet.</p>
            <p className="mt-3 text-sm font-semibold text-zinc-400">Log a week first. The story needs evidence.</p>
          </div>
        )}

        {/* Timeline */}
        <div className="relative space-y-4 pb-20">
          <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-cyan-300/60 via-fuchsia-400/40 to-transparent sm:left-8" />

          {visibleLogs.map((checkIn, index) => {
            const effort = Number(checkIn.effort_score || 0);
            const color = effortColor(effort);
            return (
              <article key={checkIn.id}
                className="relative ml-14 animate-in fade-in slide-in-from-bottom-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 duration-500 sm:ml-20 sm:p-7">
                {/* Week bubble */}
                <div className="absolute -left-[3rem] top-5 flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-black sm:-left-[4rem] sm:h-14 sm:w-14"
                  style={{ borderColor: color, backgroundColor: `${color}22`, color }}>
                  {effort}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color }}>Week {checkIn.week_number}</p>
                    <h3 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em]">Effort {effort}/10</h3>
                  </div>
                  <span className="self-start rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Scene {index + 1}
                  </span>
                </div>

                {/* Effort bar */}
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${effort * 10}%`, backgroundColor: color }} />
                </div>

                <blockquote className="mt-4 border-l-2 pl-4 text-base font-bold leading-relaxed text-zinc-200" style={{ borderColor: color }}>
                  {checkIn.log_text.length > 220 ? `${checkIn.log_text.slice(0, 220)}...` : checkIn.log_text}
                </blockquote>
              </article>
            );
          })}

          {playing && visibleCount < checkIns.length && (
            <div className="relative ml-14 flex items-center gap-3 sm:ml-20">
              <div className="h-2 w-2 animate-ping rounded-full bg-cyan-300" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Loading week {visibleCount + 1}...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ReplayPage() {
  return <ProtectedRoute>{(session) => <ReplayInner session={session} />}</ProtectedRoute>;
}