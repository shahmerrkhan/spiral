"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_BASE_URL, fetchWithTimeout } from "@/lib/api-client";

type SharedCheckIn = {
  id?: string;
  week_number?: number;
  weekNumber?: number;
  effort_score?: number;
  effortScore?: number;
  log_text?: string;
  logText?: string;
};

type SharedGoal = {
  id?: string;
  goal_text?: string;
  goalText?: string;
  goal?: string;
  title?: string;
  check_ins?: SharedCheckIn[];
  checkIns?: SharedCheckIn[];
  weeks?: SharedCheckIn[];
};

function normalizeShare(data: unknown): { goalText: string; checkIns: Array<{ week: number; effort: number; log: string }> } | null {
  const record = data as SharedGoal & { goal?: SharedGoal; snapshot?: SharedGoal; data?: SharedGoal };
  const source = (record?.snapshot || record?.data || record?.goal || record) as SharedGoal;
  const goalText = source?.goal_text || source?.goalText || source?.goal || source?.title;
  const rawCheckIns = source?.check_ins || source?.checkIns || source?.weeks || [];

  if (!goalText) return null;

  return {
    goalText,
    checkIns: rawCheckIns
      .map((item, index) => ({
        week: Number(item.week_number || item.weekNumber || index + 1),
        effort: Math.max(1, Math.min(10, Number(item.effort_score || item.effortScore || 1))),
        log: item.log_text || item.logText || "Logged forward motion.",
      }))
      .sort((a, b) => a.week - b.week),
  };
}

async function fetchSharedSpiral(id: string) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/share/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) return null;

    const data = await response.json();
    return normalizeShare(data);
  } catch {
    return null;
  }
}

function PublicSpiralDna({ goalText, checkIns }: { goalText: string; checkIns: Array<{ week: number; effort: number; log: string }> }) {
  const efforts = checkIns.length ? checkIns.map((item) => Math.max(1, Math.min(10, item.effort || 1))) : [3, 5, 4, 6, 5, 7];
  const seed = goalText.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const average = efforts.reduce((sum, effort) => sum + effort, 0) / efforts.length;
  const rings = efforts.slice(-12);
  const wavePoints = efforts.map((effort, index) => `${24 + (index / Math.max(1, efforts.length - 1)) * 212},${142 - effort * 8.5 + Math.sin((seed + index * 11) / 9) * 8}`).join(" ");

  return (
    <section className="mb-10 overflow-hidden rounded-[2.75rem] border border-cyan-300/25 bg-cyan-300/[0.06] p-6 shadow-2xl shadow-cyan-950/30 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-200">Spiral DNA</p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-6xl">A public fingerprint of effort.</h2>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-zinc-300">Generated from the shared weekly scores — concentric rings for repetition, wave tension for momentum, bright nodes for the weeks that burned hottest.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-200">
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2">{efforts.length} weeks</span>
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2">avg {average.toFixed(1)}/10</span>
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2">dna #{seed % 997}</span>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[22rem] rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-inner shadow-black/40">
          <svg viewBox="0 0 260 260" role="img" aria-label="Shared Spiral DNA visual fingerprint" className="h-full w-full overflow-visible">
            <defs>
              <radialGradient id="publicDnaGlow" cx="50%" cy="45%" r="60%"><stop offset="0%" stopColor="#f0abfc" stopOpacity="0.9" /><stop offset="45%" stopColor="#22d3ee" stopOpacity="0.55" /><stop offset="100%" stopColor="#020617" stopOpacity="0" /></radialGradient>
              <linearGradient id="publicDnaStroke" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="50%" stopColor="#e879f9" /><stop offset="100%" stopColor="#facc15" /></linearGradient>
            </defs>
            <circle cx="130" cy="130" r="110" fill="url(#publicDnaGlow)" opacity="0.28" />
            {rings.map((effort, index) => <circle key={`${effort}-${index}`} cx="130" cy="130" r={22 + index * (90 / Math.max(1, rings.length))} fill="none" stroke="url(#publicDnaStroke)" strokeWidth={1.5 + effort / 4} strokeDasharray={`${10 + effort * 2 + ((seed + index) % 9)} ${7 + (10 - effort) * 1.2}`} strokeLinecap="round" opacity={0.25 + effort / 14} transform={`rotate(${seed % 360 + index * 19} 130 130)`} />)}
            <polyline points={wavePoints} fill="none" stroke="#fef3c7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
            {efforts.map((effort, index) => {
              const angle = (index / efforts.length) * Math.PI * 2 + seed / 57;
              const radius = 34 + effort * 8.4;
              return <circle key={`node-${index}`} cx={130 + Math.cos(angle) * radius} cy={130 + Math.sin(angle) * radius} r={2.5 + effort / 3} fill={effort >= 8 ? "#facc15" : effort >= 5 ? "#22d3ee" : "#e879f9"} opacity="0.92" />;
            })}
            <circle cx="130" cy="130" r="7" fill="#ffffff" opacity="0.92" />
          </svg>
        </div>
      </div>
    </section>
  );
}

export default function PublicSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [share, setShare] = useState<{ goalText: string; checkIns: Array<{ week: number; effort: number; log: string }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetchSharedSpiral(id).then((result) => {
      if (!alive) return;
      setShare(result);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const weeks = useMemo(() => {
    const logged = share?.checkIns || [];
    const maxWeek = Math.max(12, ...logged.map((item) => item.week));
    return Array.from({ length: maxWeek }, (_, index) => {
      const week = index + 1;
      const checkIn = logged.find((item) => item.week === week);
      return { week, effort: checkIn?.effort || 0, log: checkIn?.log || "" };
    });
  }, [share]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05030b] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-cyan-950/30">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-200">Loading shared spiral</p>
            <div className="mx-auto mt-6 h-3 w-64 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </main>
    );
  }

  if (!share) {
    return (
      <main className="min-h-screen bg-[#05030b] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center text-center">
          <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-fuchsia-950/30 sm:p-12">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-fuchsia-200">Spiral not found</p>
            <h1 className="mt-5 text-4xl font-black uppercase tracking-[-0.06em] sm:text-6xl">This share link has gone quiet.</h1>
            <p className="mt-5 text-lg font-semibold leading-8 text-zinc-300">Start a fresh spiral and make a link worth passing around.</p>
            <Link href="/" className="mt-8 inline-flex rounded-full bg-cyan-300 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#05030b] transition hover:bg-white">
              Start your own spiral
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05030b] px-5 py-10 text-white sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_82%_22%,rgba(217,70,239,0.22),transparent_30%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.12),transparent_28%)]" />
      <div className="absolute left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-cyan-300/10 bg-cyan-300/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-black uppercase tracking-[0.35em] text-cyan-200">Spiral</Link>
          <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10">
            Start yours
          </Link>
        </header>

        <section className="py-16 text-center sm:py-24">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-fuchsia-200">A shared spiral in motion</p>
          <h1 className="mx-auto mt-6 max-w-6xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.08em] sm:text-7xl lg:text-9xl">
            {share.goalText}
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-semibold leading-8 text-zinc-300">
            Every circle is a week. Every score is evidence. This is what momentum looks like when it becomes visible.
          </p>
        </section>

        <section className="rounded-[2.5rem] border border-white/10 bg-black/35 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">Public progress map</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em]">Week circles + effort scores</h2>
            </div>
            <p className="text-sm font-bold text-zinc-400">{share.checkIns.length} logged week{share.checkIns.length === 1 ? "" : "s"}</p>
          </div>

          <PublicSpiralDna goalText={share.goalText} checkIns={share.checkIns} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {weeks.map((item) => {
              const logged = item.effort > 0;
              return (
                <article key={item.week} className={`rounded-[2rem] border p-5 transition ${logged ? "border-cyan-300/25 bg-cyan-300/[0.08] shadow-lg shadow-cyan-950/20" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full border text-xl font-black ${logged ? "border-cyan-200 bg-cyan-300 text-[#05030b] shadow-[0_0_30px_rgba(34,211,238,0.35)]" : "border-white/10 bg-black/30 text-zinc-500"}`}>
                      {item.week}
                    </div>
                    <div className="text-right">
                      <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-zinc-500">Effort</p>
                      <p className={`text-3xl font-black ${logged ? "text-white" : "text-zinc-700"}`}>{logged ? item.effort : "—"}</p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-3 min-h-16 text-sm font-semibold leading-6 text-zinc-300">
                    {logged ? item.log : "Waiting for this week's proof."}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="py-16 text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-zinc-400">Ready to make your own evidence?</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#05030b] shadow-2xl shadow-white/10 transition hover:bg-cyan-300">
            Start your own spiral
          </Link>
        </section>
      </div>
    </main>
  );
}
