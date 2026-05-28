"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, fetchWithTimeout } from "@/lib/api-client";
import { createGoal, createMilestones, getActiveGoal, SpiralSession } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/protected-route";

const examples = [
  "Get 1 million Instagram followers",
  "Build a startup that makes $10k MRR",
  "Write and publish a novel",
  "Run a marathon from zero",
];

const categories = ["Creative", "Fitness", "Business", "Learning", "Other"];
const today = new Date().toISOString().slice(0, 10);

const suggestionMap: Record<string, string[]> = {
  fit: ["Complete a triathlon with zero prior training in 6 months.", "Do 500 consecutive push-ups by month 4.", "Gain 15 pounds of muscle in 6 months."],
  run: ["Run a marathon in under 3 hours starting from zero cardio.", "Sprint a 5K in under 18 minutes within 6 months.", "Run 100 miles in a single month by week 20."],
  write: ["Write and self-publish a 300-page novel, one chapter per week.", "Write 100,000 words of fiction in public with weekly reader feedback.", "Ghostwrite a memoir for a stranger and get it published."],
  startup: ["Build a startup that hits $10k MRR in 6 months with zero funding.", "Launch a SaaS product and get 500 paying users in 6 months.", "Build and sell a micro-acquisition product for $50k."],
  money: ["Make $50,000 from a side hustle with only weekends free.", "Flip $500 into $10,000 through reselling in 6 months.", "Build a freelance business that replaces your full-time income."],
  learn: ["Learn to code and ship 3 full-stack apps to production.", "Become fluent in Japanese and pass JLPT N3 from zero.", "Learn piano and perform a 30-minute recital in public."],
  guitar: ["Learn guitar and play a full Metallica setlist live.", "Write and record a 10-track album with zero music theory.", "Busk and earn $1,000 from street performances."],
  youtube: ["Grow a YouTube channel to 100k subscribers posting weekly.", "Produce and edit 50 high-quality videos with zero experience.", "Monetize a YouTube channel and hit $3k/month in ad revenue."],
};

function getSuggestions(input: string): string[] {
  const lower = input.toLowerCase();
  if (lower.length < 3) return [];
  for (const [keyword, suggestions] of Object.entries(suggestionMap)) {
    if (lower.includes(keyword)) return suggestions;
  }
  return [
    `Make "${input}" happen in exactly 6 months with zero prior experience.`,
    `Achieve "${input}" and document the entire messy process publicly.`,
    `Turn "${input}" into a measurable outcome and hit it by month 6.`,
  ];
}

const STEP_META = [
  { label: "The goal", color: "cyan" },
  { label: "Start date", color: "fuchsia" },
  { label: "Category", color: "amber" },
];

function OnboardingInner({ session }: { session: SpiralSession }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [goalText, setGoalText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [category, setCategory] = useState("Creative");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getActiveGoal(session)
      .then((goal) => { if (goal) router.replace("/dashboard"); else setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Could not check your goal."); setLoading(false); });
  }, [router, session]);

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const goal = await createGoal(session, { goal_text: goalText.trim(), start_date: startDate, category });
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/goals/breakdown`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalText: goal.goal_text, category }),
        });
        if (response.ok) {
          const breakdown = await response.json();
          const rows = [...(breakdown.monthly || []), ...(breakdown.weekly || [])].map((row) => ({ ...row, goal_id: goal.id }));
          await createMilestones(session, rows);
        }
      } catch {
        // breakdown failed silently, dashboard will still load
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#03020a]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-cyan-300 border-r-fuchsia-400" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.4em] text-cyan-300">Checking for existing chaos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03020a] px-4 py-10 pb-32 text-white sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col justify-center">
        {/* Header */}
        <div className="mb-10">
          <a href="/" className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-400 hover:text-cyan-200 transition">← Spiral</a>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center gap-3">
          {STEP_META.map((meta, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={meta.label} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black transition-all duration-300 ${done ? "border-cyan-300 bg-cyan-300 text-[#03020a]" : active ? "border-white/60 bg-white/10 text-white" : "border-white/15 bg-transparent text-zinc-600"}`}>
                  {done ? "✓" : n}
                </div>
                <span className={`text-xs font-black uppercase tracking-[0.25em] transition-all duration-300 ${active ? "text-white" : done ? "text-cyan-300" : "text-zinc-600"}`}>{meta.label}</span>
                {i < STEP_META.length - 1 && <div className={`h-px w-8 transition-all duration-500 ${done ? "bg-cyan-300" : "bg-white/10"}`} />}
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-10">
          {step === 1 && (
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-300">Step 1 of 3</p>
                <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-5xl">One unrealistic<br />six-month goal.</h1>
                <p className="mt-3 text-sm font-semibold text-zinc-400">Big enough that you cannot fake caring about it.</p>
              </div>
              <textarea
                value={goalText}
                onChange={(e) => { setGoalText(e.target.value); setSuggestions(getSuggestions(e.target.value)); }}
                className="min-h-36 w-full rounded-2xl border border-white/10 bg-black/40 p-5 text-lg font-black leading-snug text-white outline-none transition focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/10 placeholder:text-zinc-600"
                placeholder="I want to..."
              />
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">Make it more unrealistic:</p>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => { setGoalText(s); setSuggestions([]); }}
                        className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-3 text-left text-sm font-bold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/15">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mb-3">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {examples.map((ex) => (
                    <button key={ex} onClick={() => setGoalText(ex)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase text-zinc-300 transition hover:border-white/30 hover:text-white">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-fuchsia-300">Step 2 of 3</p>
                <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-5xl">When does the<br />spiral start?</h1>
                <p className="mt-3 text-sm font-semibold text-zinc-400">Default is today. Backdating is allowed. We are not the calendar police.</p>
              </div>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-5 text-xl font-black text-white outline-none transition focus:border-fuchsia-300/60 focus:ring-4 focus:ring-fuchsia-300/10" />
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-xs font-bold text-zinc-400">You are setting a 26-week spiral starting <span className="font-black text-white">{startDate}</span>. Week 1 check-in unlocks immediately.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-300">Step 3 of 3</p>
                <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-5xl">Pick the flavor<br />of the mess.</h1>
                <p className="mt-3 text-sm font-semibold text-zinc-400">Affects how milestones and actions are generated.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`rounded-2xl border p-5 text-left transition-all duration-200 ${category === cat ? "border-amber-300/60 bg-amber-300/15 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.2)]" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:bg-white/[0.06]"}`}>
                    <p className="text-base font-black uppercase">{cat}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="text-xs font-bold leading-5 text-zinc-400">Goal: <span className="font-black text-white">{goalText}</span></p>
                <p className="mt-1 text-xs text-zinc-500">Starts: {startDate} · Category: {category}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-100 animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="rounded-2xl border border-white/10 px-6 py-4 text-sm font-black uppercase text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.05]">
                Back
              </button>
            )}
            {step < 3 ? (
              <button disabled={step === 1 && goalText.trim().length < 3} onClick={() => setStep(step + 1)}
                className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 text-sm font-black uppercase text-[#03020a] shadow-[0_0_30px_rgba(34,211,238,0.3)] transition hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(34,211,238,0.4)] disabled:opacity-40 disabled:pointer-events-none">
                Next →
              </button>
            ) : (
              <button onClick={finish} disabled={saving}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-fuchsia-500 px-6 py-4 text-sm font-black uppercase text-[#03020a] shadow-[0_0_30px_rgba(251,191,36,0.3)] transition hover:scale-[1.01] disabled:opacity-50">
                {saving ? "Launching the spiral..." : "Launch the spiral →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return <ProtectedRoute>{(session) => <OnboardingInner session={session} />}</ProtectedRoute>;
}