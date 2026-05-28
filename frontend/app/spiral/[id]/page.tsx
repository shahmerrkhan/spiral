"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SpiralShareSnapshot = {
  id: string;
  goal: string;
  score: number;
  streak: number;
  weeksActive: number;
  summary: string;
  timeline: Array<{ date: string; effort: number; note: string }>;
  createdAt: string;
};

export default function PublicSpiralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
    const [snapshot, setSnapshot] = useState<SpiralShareSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`spiral-public-share:${id}`);
      setSnapshot(stored ? (JSON.parse(stored) as SpiralShareSnapshot) : null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  const timeline = useMemo(() => snapshot?.timeline ?? [], [snapshot]);

  if (!loaded) {
    return <main className="min-h-screen bg-[#05030b] p-6 text-white"><div className="mx-auto mt-24 h-96 max-w-4xl animate-pulse rounded-[2rem] bg-white/10" /></main>;
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05030b] p-6 text-white">
        <div className="max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-300">Spiral not found</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em]">This share lives in another browser.</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-zinc-400">Prototype share links are read-only and stored locally by the creator.</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-cyan-300 px-5 py-3 text-xs font-black uppercase text-[#05030b]">Join Spiral</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05030b] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.24),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(217,70,239,0.18),transparent_30%)]" />
      <div className="relative mx-auto max-w-5xl">
        <nav className="mb-8 flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-[0.45em] text-cyan-300">Spiral</p>
          <Link href="/" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase text-white/80 transition hover:bg-white/10">Join</Link>
        </nav>
        <section className="overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/40 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.4em] text-fuchsia-200">Public read-only spiral</p>
          <h1 className="mt-8 text-5xl font-black uppercase leading-[0.9] tracking-[-0.07em] sm:text-7xl">{snapshot.goal}</h1>
          <p className="mt-6 max-w-3xl text-xl font-bold leading-8 text-zinc-300">{snapshot.summary}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[["Spiral score", snapshot.score], ["Streak", `${snapshot.streak} weeks`], ["Weeks active", snapshot.weeksActive]].map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-white/10 bg-[#05030b]/70 p-6">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">{label}</p>
                <p className="mt-3 text-4xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-3xl font-black uppercase tracking-[-0.05em]">Full spiral timeline</h2>
          <div className="mt-8 space-y-4">
            {timeline.length ? timeline.map((item, index) => (
              <div key={`${item.date}-${index}`} className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-[#05030b]/70 p-5 sm:grid-cols-[120px_1fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Effort {item.effort}/10</p>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <p className="font-semibold leading-7 text-zinc-300">{item.note}</p>
              </div>
            )) : <p className="rounded-2xl border border-white/10 p-5 text-zinc-400">No timeline entries yet. The spiral is still warming up.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
