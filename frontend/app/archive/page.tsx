"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { CheckIn, Goal, SpiralSession, getArchivedGoals, getCheckIns, signOut } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type ArchivedBundle = { goal: Goal; checkIns: CheckIn[] };

function weeksBetween(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const elapsed = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  return Math.min(26, Math.max(1, Math.floor(elapsed / 7) + 1));
}

function ArchiveInner({ session }: { session: SpiralSession }) {
  const router = useRouter();
  const [bundles, setBundles] = useState<ArchivedBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getArchivedGoals(session)
      .then(async (goals) => {
        const loaded = await Promise.all(goals.map(async (goal) => ({ goal, checkIns: await getCheckIns(session, goal.id) })));
        setBundles(loaded);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Archive door jammed. Try again."))
      .finally(() => setLoading(false));
  }, [session]);

  async function logout() {
    await signOut();
    router.push("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03020a] px-4 py-10 pb-32 text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(168,85,247,0.14),transparent_35%),radial-gradient(circle_at_85%_85%,rgba(34,211,238,0.1),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between gap-4">
          <a href="/dashboard" className="group flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-zinc-400 transition hover:text-cyan-300">
            <span className="transition group-hover:-translate-x-1">←</span> Dashboard
          </a>
          <button onClick={logout} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase text-zinc-400 transition hover:border-red-400/40 hover:text-red-300">
            Log out
          </button>
        </header>

        <section className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.55em] text-purple-300">Goal archive</p>
          <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-[-0.07em] sm:text-8xl">
            Old spirals.<br />
            <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">Receipts kept.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-zinc-400">Completed, abandoned, mutated — archived goals still count. You moved. Weirdly, that matters.</p>
        </section>

        {loading && (
          <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-purple-300 border-r-cyan-300" />
            <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400">Digging through old chaos...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 font-bold text-red-100">{error}</div>
        )}

        {!loading && !bundles.length && (
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-12 text-center">
            <p className="text-6xl">📭</p>
            <h2 className="mt-6 text-3xl font-black uppercase tracking-[-0.04em]">No archived goals yet.</h2>
            <p className="mt-3 text-sm font-semibold text-zinc-400">Go make a mess first, then come back with evidence.</p>
            <a href="/dashboard" className="mt-6 inline-flex rounded-full bg-cyan-300 px-6 py-3 text-xs font-black uppercase text-[#03020a] transition hover:bg-white">
              Back to the spiral
            </a>
          </div>
        )}

        <div className="space-y-6">
          {bundles.map(({ goal, checkIns }) => {
            const totalWeeks = weeksBetween(goal.start_date);
            const loggedWeeks = new Map(checkIns.map((c) => [c.week_number, c]));
            const weeksActive = new Set(checkIns.filter((c) => c.week_number <= totalWeeks).map((c) => c.week_number)).size;
            const weeksMissed = Math.max(0, totalWeeks - weeksActive);
            const spiralScore = totalWeeks ? Math.round((weeksActive / totalWeeks) * 100) : 0;
            const avgEffort = checkIns.length ? (checkIns.reduce((s, c) => s + Number(c.effort_score || 0), 0) / checkIns.length).toFixed(1) : "—";

            return (
              <article key={goal.id} className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
                {/* Header bar */}
                <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-purple-300">{goal.category} · started {goal.start_date}</p>
                      <h2 className="mt-2 text-3xl font-black uppercase leading-tight tracking-[-0.05em] sm:text-4xl">{goal.goal_text}</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "Active", value: weeksActive, color: "cyan" },
                        { label: "Missed", value: weeksMissed, color: "zinc" },
                        { label: "Avg effort", value: avgEffort, color: "amber" },
                        { label: "Score", value: `${spiralScore}%`, color: "purple" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`rounded-2xl border px-4 py-3 text-center min-w-[72px] ${
                          color === "cyan" ? "border-cyan-300/20 bg-cyan-300/10" :
                          color === "amber" ? "border-amber-300/20 bg-amber-300/10" :
                          color === "purple" ? "border-purple-300/20 bg-purple-300/10" :
                          "border-white/10 bg-white/[0.04]"
                        }`}>
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                            color === "cyan" ? "text-cyan-300" :
                            color === "amber" ? "text-amber-300" :
                            color === "purple" ? "text-purple-300" :
                            "text-zinc-400"
                          }`}>{label}</p>
                          <p className="mt-1 text-2xl font-black text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-300 transition-all duration-700"
                      style={{ width: `${spiralScore}%` }} />
                  </div>
                </div>

                {/* Week grid */}
                <div className="p-6 sm:p-8">
                  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Week map</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: totalWeeks }, (_, i) => {
                      const week = i + 1;
                      const checkIn = loggedWeeks.get(week);
                      const effort = Number(checkIn?.effort_score || 0);
                      const color = effort >= 9 ? "#facc15" : effort >= 7 ? "#22d3ee" : effort >= 5 ? "#a855f7" : effort >= 3 ? "#f472b6" : effort > 0 ? "#ef4444" : null;
                      return (
                        <div key={week} title={checkIn ? `Week ${week}: ${effort}/10` : `Week ${week}: not logged`}
                          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black transition"
                          style={color ? { backgroundColor: `${color}22`, border: `1px solid ${color}55`, color } : { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#52525b" }}>
                          {effort || ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function ArchivePage() {
  return <ProtectedRoute>{(session) => <ArchiveInner session={session} />}</ProtectedRoute>;
}