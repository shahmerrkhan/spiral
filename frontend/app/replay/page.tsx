"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { CheckIn, Goal, SpiralSession, getActiveGoal, getCheckIns } from "@/lib/supabase";

function effortColor(e: number) {
  return e >= 9 ? "#facc15" : e >= 7 ? "#22d3ee" : e >= 5 ? "#a855f7" : e >= 3 ? "#f472b6" : "#ef4444";
}

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03020a] px-4 pb-32 pt-10 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_20%_0%,rgba(34,211,238,0.1),transparent),radial-gradient(ellipse_50%_30%_at_80%_10%,rgba(168,85,247,0.1),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-12 flex items-start justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400">Spiral Replay</p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-[0.88] tracking-[-0.05em] sm:text-6xl">
              The story,<br />week by week.
            </h1>
          </div>
          <a href="/dashboard" className="mt-2 shrink-0 rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition hover:border-white/20 hover:text-white">
            ← Back
          </a>
        </header>

        {loading && (
          <div className="flex items-center gap-4 rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Loading the tape...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.08] p-4 text-sm font-semibold text-red-300">{error}</div>
        )}

        {!loading && goal && (
          <div className="mb-10 rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400">The goal</p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[-0.04em] sm:text-3xl">{goal.goal_text}</h2>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPlaying((v) => !v)}
                className="rounded-xl bg-cyan-400 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#03020a] transition hover:scale-[1.03] active:scale-[0.97]"
              >
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <button
                onClick={() => { setVisibleCount(0); setPlaying(true); }}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                ↺ Restart
              </button>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {visibleCount} / {checkIns.length} weeks
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Speed</span>
                <input
                  type="range" min="300" max="2000" step="100" value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-20 accent-cyan-400"
                />
              </div>
            </div>

            {/* Progress */}
            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 transition-all duration-500"
                style={{ width: checkIns.length ? `${(visibleCount / checkIns.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        {!loading && !goal && (
          <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-12 text-center">
            <p className="text-2xl font-black uppercase">No active spiral.</p>
            <a href="/onboarding" className="mt-6 inline-flex rounded-xl bg-cyan-400 px-6 py-3 text-[10px] font-black uppercase text-[#03020a]">
              Start one →
            </a>
          </div>
        )}

        {!loading && goal && checkIns.length === 0 && (
          <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <p className="text-xl font-black uppercase">No check-ins yet.</p>
            <p className="mt-2 text-sm text-zinc-500">Log a week first. The story needs evidence.</p>
          </div>
        )}

        {/* Timeline */}
        <div className="relative space-y-4 pb-20">
          <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-cyan-400/40 via-fuchsia-400/20 to-transparent" />

          {visibleLogs.map((checkIn, index) => {
            const effort = Number(checkIn.effort_score || 0);
            const color = effortColor(effort);
            return (
              <article
                key={checkIn.id}
                className="relative ml-14 animate-in fade-in slide-in-from-bottom-3 rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-5 duration-500 sm:ml-20 sm:p-7"
              >
                {/* Effort bubble */}
                <div
                  className="absolute -left-[3.25rem] top-5 flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-black sm:-left-[4.25rem] sm:h-13 sm:w-13"
                  style={{ borderColor: color, backgroundColor: `${color}18`, color }}
                >
                  {effort}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color }}>
                      Week {checkIn.week_number}
                    </p>
                    <h3 className="mt-1 text-xl font-black uppercase tracking-tight">Effort {effort}/10</h3>
                  </div>
                  <span className="self-start rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[9px] font-black uppercase text-zinc-600">
                    Scene {index + 1}
                  </span>
                </div>

                <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full" style={{ width: `${effort * 10}%`, backgroundColor: color }} />
                </div>

                <blockquote className="mt-4 border-l-2 pl-4 text-sm font-medium leading-relaxed text-zinc-300" style={{ borderColor: `${color}60` }}>
                  {checkIn.log_text.length > 220 ? `${checkIn.log_text.slice(0, 220)}...` : checkIn.log_text}
                </blockquote>
              </article>
            );
          })}

          {playing && visibleCount < checkIns.length && (
            <div className="relative ml-14 flex items-center gap-3 sm:ml-20">
              <div className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Week {visibleCount + 1} incoming...</p>
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