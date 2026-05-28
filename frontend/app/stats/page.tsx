"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, LineChart, Trophy, Type, Zap } from "lucide-react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ProtectedRoute } from "@/components/protected-route";
import { CheckIn, getActiveGoal, getCheckIns, Goal } from "@/lib/supabase";

type MonthStats = {
  key: string;
  label: string;
  effort: number;
  count: number;
  words: number;
};

type WeeklyStats = {
  key: string;
  label: string;
  count: number;
  effort: number;
};

function getGoalText(goal: Goal | null) {
  if (!goal) return "Your active spiral";
  const value = goal as unknown as { title?: string; name?: string; description?: string; goal_text?: string; target?: string };
  return value.title || value.name || value.goal_text || value.target || value.description || "Your active spiral";
}

function getCheckInEffort(checkIn: CheckIn) {
  const value = checkIn as unknown as { effort_score?: number; effortScore?: number; effort?: number; score?: number };
  return Math.max(1, Math.min(10, Number(value.effort_score ?? value.effortScore ?? value.effort ?? value.score ?? 5)));
}

function getCheckInNote(checkIn: CheckIn) {
  const value = checkIn as unknown as { note?: string; body?: string; content?: string; text?: string; reflection?: string };
  return value.note || value.body || value.content || value.text || value.reflection || "";
}

function getCheckInDate(checkIn: CheckIn) {
  const value = checkIn as unknown as { created_at?: string; createdAt?: string; date?: string };
  return new Date(value.created_at || value.createdAt || value.date || Date.now());
}

function getWeekKey(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
}

function calculateBestStreak(checkIns: CheckIn[]) {
  const weekIndexes = [...new Set(checkIns.map((checkIn) => {
    const date = getCheckInDate(checkIn);
    return Math.floor(date.getTime() / (7 * 86400000));
  }))].sort((a, b) => a - b);

  let best = 0;
  let current = 0;
  let previous: number | null = null;

  weekIndexes.forEach((week) => {
    current = previous === null || week === previous + 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = week;
  });

  return best;
}

function StatsContent() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const activeGoal = await getActiveGoal();
        const logs = await getCheckIns();
        if (!mounted) return;
        setGoal(activeGoal);
        setCheckIns(Array.isArray(logs) ? logs : []);
      } catch {
        if (!mounted) return;
        setGoal(null);
        setCheckIns([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const sorted = [...checkIns].sort((a, b) => getCheckInDate(a).getTime() - getCheckInDate(b).getTime());
    const efforts = sorted.map(getCheckInEffort);
    const totalEffort = efforts.reduce((sum, effort) => sum + effort, 0);
    const averageEffort = efforts.length ? totalEffort / efforts.length : 0;
    const totalWords = sorted.reduce((sum, checkIn) => sum + getCheckInNote(checkIn).split(/\s+/).filter(Boolean).length, 0);

    const weeklyMap = new Map<string, WeeklyStats>();
    sorted.forEach((checkIn) => {
      const date = getCheckInDate(checkIn);
      const key = getWeekKey(date);
      const label = `W${key.split("-")[1]}`;
      const current = weeklyMap.get(key) || { key, label, count: 0, effort: 0 };
      current.count += 1;
      current.effort += getCheckInEffort(checkIn);
      weeklyMap.set(key, current);
    });
    const weekly = [...weeklyMap.values()].slice(-12);

    const monthMap = new Map<string, MonthStats>();
    sorted.forEach((checkIn) => {
      const date = getCheckInDate(checkIn);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString(undefined, { month: "short" });
      const current = monthMap.get(key) || { key, label, effort: 0, count: 0, words: 0 };
      current.effort += getCheckInEffort(checkIn);
      current.count += 1;
      current.words += getCheckInNote(checkIn).split(/\s+/).filter(Boolean).length;
      monthMap.set(key, current);
    });
    const months = [...monthMap.values()].slice(-6);
    const strongestMonth = months.reduce<MonthStats | null>((best, month) => (!best || month.effort > best.effort ? month : best), null);

    return {
      sorted,
      efforts,
      totalEffort,
      averageEffort,
      totalWords,
      bestStreak: calculateBestStreak(sorted),
      weekly,
      months,
      strongestMonth,
    };
  }, [checkIns]);

  const maxEffort = Math.max(10, ...stats.efforts);
  const chartPoints = stats.sorted.map((checkIn, index) => {
    const x = stats.sorted.length <= 1 ? 50 : (index / (stats.sorted.length - 1)) * 100;
    const y = 100 - (getCheckInEffort(checkIn) / maxEffort) * 82 - 8;
    return `${x},${y}`;
  }).join(" ");
  const maxWeeklyCount = Math.max(1, ...stats.weekly.map((week) => week.count));
  const maxMonthEffort = Math.max(1, ...stats.months.map((month) => month.effort));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05030b] px-4 pb-32 pt-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.45em] text-fuchsia-300">Spiral statistics</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-6xl">The receipts, not the fantasy.</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-zinc-400">{getGoalText(goal)}</p>
          </div>
          <Link href="/dashboard" className="rounded-2xl border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-300 transition hover:border-fuchsia-300/50 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-44 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />)}
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[2rem] border border-fuchsia-300/20 bg-fuchsia-300/10 p-5">
                <Trophy className="h-5 w-5 text-fuchsia-200" />
                <p className="mt-5 text-4xl font-black">{stats.bestStreak}</p>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-100/70">Best streak ever</p>
              </div>
              <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-5">
                <Type className="h-5 w-5 text-cyan-200" />
                <p className="mt-5 text-4xl font-black">{stats.totalWords}</p>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-100/70">Words written</p>
              </div>
              <div className="rounded-[2rem] border border-lime-300/20 bg-lime-300/10 p-5">
                <Zap className="h-5 w-5 text-lime-200" />
                <p className="mt-5 text-4xl font-black">{stats.averageEffort.toFixed(1)}</p>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-lime-100/70">Avg effort score</p>
              </div>
              <div className="rounded-[2rem] border border-orange-300/20 bg-orange-300/10 p-5">
                <BarChart3 className="h-5 w-5 text-orange-200" />
                <p className="mt-5 text-4xl font-black">{stats.totalEffort}</p>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-100/70">Total effort</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <LineChart className="h-5 w-5 text-zinc-200" />
                <p className="mt-5 text-4xl font-black">{stats.strongestMonth?.label || "—"}</p>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Strongest month</p>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-fuchsia-300">Effort over time</p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">The line does not lie</h2>
                  </div>
                  <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-300">{stats.sorted.length} logs</p>
                </div>
                <div className="mt-8 h-72 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  {stats.sorted.length ? (
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                      <defs>
                        <linearGradient id="effortLine" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="50%" stopColor="#e879f9" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                      {[20, 40, 60, 80].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />)}
                      <polyline fill="none" stroke="url(#effortLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.7" points={chartPoints} />
                      {stats.sorted.map((checkIn, index) => {
                        const x = stats.sorted.length <= 1 ? 50 : (index / (stats.sorted.length - 1)) * 100;
                        const y = 100 - (getCheckInEffort(checkIn) / maxEffort) * 82 - 8;
                        return <circle key={index} cx={x} cy={y} r="1.8" fill="#fdf4ff" />;
                      })}
                    </svg>
                  ) : <div className="flex h-full items-center justify-center text-sm font-semibold text-zinc-500">No effort data yet. Log a week and the graph wakes up.</div>}
                </div>
              </article>

              <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Weekly consistency</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">Show-up bars</h2>
                <div className="mt-8 flex h-72 items-end gap-3 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  {stats.weekly.length ? stats.weekly.map((week) => (
                    <div key={week.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex w-full items-end justify-center rounded-t-2xl bg-cyan-300/15" style={{ height: `${Math.max(10, (week.count / maxWeeklyCount) * 210)}px` }}>
                        <div className="h-full w-full rounded-t-2xl bg-gradient-to-t from-cyan-400 to-fuchsia-300" />
                      </div>
                      <p className="text-[10px] font-black uppercase text-zinc-500">{week.label}</p>
                    </div>
                  )) : <div className="flex w-full self-center justify-center text-sm font-semibold text-zinc-500">No weekly logs yet.</div>}
                </div>
              </article>
            </section>

            <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-300">Monthly comparison</p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">Strongest month: {stats.strongestMonth?.label || "not enough data"}</h2>
                </div>
                <p className="text-sm font-semibold text-zinc-400">Measured by total effort logged.</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stats.months.length ? stats.months.map((month) => (
                  <div key={month.key} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-black uppercase">{month.label}</p>
                      <p className="text-xs font-black text-zinc-500">{month.count} logs</p>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-300 to-cyan-300" style={{ width: `${Math.max(6, (month.effort / maxMonthEffort) * 100)}%` }} />
                    </div>
                    <div className="mt-4 flex justify-between text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                      <span>{month.effort} effort</span>
                      <span>{month.words} words</span>
                    </div>
                  </div>
                )) : <p className="text-sm font-semibold text-zinc-500">No monthly comparison yet. The spiral needs a few receipts.</p>}
              </div>
            </section>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}

export default function StatsPage() {
  return (
    <ProtectedRoute>
      <StatsContent />
    </ProtectedRoute>
  );
}
