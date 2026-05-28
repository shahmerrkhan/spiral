"use client";

import { useEffect, useState } from "react";
import { getActiveGoal, updateGoal, SpiralSession } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/protected-route";

function SettingsInner({ session }: { session: SpiralSession }) {
  const [goalText, setGoalText] = useState("");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chaosMode, setChaosMode] = useState<"silent" | "weekly" | "aggressive">(() => {
    if (typeof window === "undefined") return "weekly";
    const savedMode = window.localStorage.getItem("spiral-chaos-mode");
    return savedMode === "silent" || savedMode === "weekly" || savedMode === "aggressive" ? savedMode : "weekly";
  });
  const [theme, setTheme] = useState<"dark" | "chaos">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = window.localStorage.getItem("spiral-theme");
    return savedTheme === "chaos" || savedTheme === "dark" ? savedTheme : "dark";
  });
  const [soundtrackMode, setSoundtrackMode] = useState<"off" | "lofi" | "white-noise" | "rain">(() => {
    if (typeof window === "undefined") return "off";
    try {
      const saved = JSON.parse(window.localStorage.getItem("spiral-soundtrack-settings") || "{}");
      return ["off", "lofi", "white-noise", "rain"].includes(saved.mode) ? saved.mode : "off";
    } catch {
      return "off";
    }
  });
  const [soundtrackVolume, setSoundtrackVolume] = useState(() => {
    if (typeof window === "undefined") return 25;
    try {
      const saved = JSON.parse(window.localStorage.getItem("spiral-soundtrack-settings") || "{}");
      return typeof saved.volume === "number" ? Math.round(Math.min(1, Math.max(0, saved.volume)) * 100) : 25;
    } catch {
      return 25;
    }
  });



  useEffect(() => {
    const savedTheme = window.localStorage.getItem("spiral-theme");
    if (savedTheme === "chaos" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === "chaos") {
      document.documentElement.setAttribute("data-theme", "chaos");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    window.localStorage.setItem("spiral-theme", theme);
    window.dispatchEvent(new Event("spiral-theme-change"));
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("spiral-chaos-mode", chaosMode);
    window.dispatchEvent(new CustomEvent("spiral-chaos-mode-change", { detail: { mode: chaosMode } }));
  }, [chaosMode]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("spiral-soundtrack-settings") || "{}");
      if (["off", "lofi", "white-noise", "rain"].includes(saved.mode)) setSoundtrackMode(saved.mode);
      if (typeof saved.volume === "number") setSoundtrackVolume(Math.round(Math.min(1, Math.max(0, saved.volume)) * 100));
    } catch {
      setSoundtrackMode("off");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("spiral-soundtrack-settings", JSON.stringify({ mode: soundtrackMode, volume: soundtrackVolume / 100 }));
    window.dispatchEvent(new Event("spiral-soundtrack-change"));
  }, [soundtrackMode, soundtrackVolume]);


  useEffect(() => {
    getActiveGoal(session)
      .then((goal) => {
        if (!goal) {
          setError("No active goal found. Create a goal from the dashboard when you're ready.");
          return;
        }
        setGoalText(goal.goal_text);
        setGoalId(goal.id);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load your goal. The machine coughed.");
      })
      .finally(() => setLoading(false));
  }, [session]);

  async function saveGoal() {
    if (!goalId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateGoal(session, goalId, { goal_text: goalText.trim() });
      setSuccess("Goal updated. The spiral adjusts.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed. The goal resisted.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#05030b] text-white"><p className="font-black uppercase tracking-[0.3em] text-cyan-300">Loading settings...</p></main>;
  }

return (
<main className="relative min-h-screen overflow-hidden bg-[#03020a] px-4 py-10 pb-32 text-white sm:px-10">
    <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(34,211,238,0.08),transparent_40%),radial-gradient(circle_at_75%_75%,rgba(168,85,247,0.08),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.55em] text-cyan-300">Spiral</p>
            <h1 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.05em]">Settings</h1>
          </div>
          <button onClick={() => window.history.back()}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase text-zinc-400 transition hover:border-cyan-300/50 hover:text-cyan-100">
            ← Back
          </button>
        </header>

        <div className="space-y-5">
          {/* Goal */}
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300">Your goal</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">Edit the target.</h2>
            <textarea value={goalText} onChange={(e) => setGoalText(e.target.value)}
              className="mt-5 min-h-28 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-base font-black leading-snug text-white outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10" />
            <button onClick={saveGoal} disabled={saving || !goalText.trim()}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-sm font-black uppercase text-[#03020a] shadow-[0_0_30px_rgba(34,211,238,0.25)] transition hover:scale-[1.01] disabled:opacity-40 disabled:pointer-events-none">
              {saving ? "Saving..." : "Update goal"}
            </button>
            {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-100 animate-in fade-in duration-300">{error}</div>}
            {success && <div className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100 animate-in fade-in duration-300">{success}</div>}
          </section>

          {/* Soundtrack */}
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-300">Ambient soundtrack</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">Make the dashboard breathe.</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["off", "Off", "🔇"], ["lofi", "Lofi", "🎵"], ["white-noise", "Noise", "📻"], ["rain", "Rain", "🌧"]].map(([val, label, icon]) => (
                <button key={val} onClick={() => setSoundtrackMode(val as typeof soundtrackMode)}
                  className={`rounded-2xl border p-4 text-center transition-all duration-200 ${soundtrackMode === val ? "border-fuchsia-300/60 bg-fuchsia-300/15 text-fuchsia-100" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white"}`}>
                  <p className="text-2xl">{icon}</p>
                  <p className="mt-2 text-xs font-black uppercase">{label}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Volume</span>
              <input type="range" min="0" max="60" value={soundtrackVolume} onChange={(e) => setSoundtrackVolume(Number(e.target.value))}
                className="flex-1 accent-fuchsia-400" disabled={soundtrackMode === "off"} />
              <span className="text-xs font-black text-zinc-400 w-10 text-right">{soundtrackVolume}%</span>
            </div>
          </section>

          {/* Notifications */}
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-300">Notifications</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">Chaos mode.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["silent", "Silent", "No reminders. Pure self-trust."],
                ["weekly", "Weekly", "One gentle check-in pulse."],
                ["aggressive", "Aggressive", "Frequent taps when momentum slips."],
              ].map(([val, label, desc]) => (
                <button key={val} onClick={() => setChaosMode(val as typeof chaosMode)}
                  className={`rounded-2xl border p-5 text-left transition-all duration-200 ${chaosMode === val ? "border-amber-300/60 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white"}`}>
                  <p className="font-black uppercase">{label}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-zinc-500">{desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Appearance */}
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-300">Appearance</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">Pick your vibe.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[["dark", "Dark", "Clean. Focused. No distractions."], ["chaos", "Chaos", "Neon. Loud. Slightly unhinged."]].map(([val, label, desc]) => (
                <button key={val} onClick={() => setTheme(val as typeof theme)}
                  className={`rounded-2xl border p-5 text-left transition-all duration-200 ${theme === val
                    ? val === "chaos" ? "border-fuchsia-300/60 bg-fuchsia-300/15 text-fuchsia-100" : "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white"}`}>
                  <p className="font-black uppercase">{label}</p>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">{desc}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function SettingsPage() {
return <ProtectedRoute>{(session) => <SettingsInner session={session} />}</ProtectedRoute>;
}
