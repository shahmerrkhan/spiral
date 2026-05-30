"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Animated spiral SVG that draws itself ───────────────────────────────────
function HeroSpiral() {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = "stroke-dashoffset 2.8s cubic-bezier(0.16, 1, 0.3, 1)";
    const t = setTimeout(() => { el.style.strokeDashoffset = "0"; }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#sg)" />
      {/* Outer faint rings */}
      {[170, 140, 110, 80, 50, 25].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r}
          stroke="rgba(34,211,238,0.06)"
          strokeWidth="1"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      {/* Main spiral path */}
      <path
        ref={ref}
        d="M200,200 
           C200,200 200,185 215,180 C235,173 252,183 258,200 C266,222 254,248 232,258 C204,270 172,258 158,232 C142,200 154,162 184,146 C220,127 264,141 282,178 C302,220 288,272 250,292 C206,315 152,300 130,258 C105,210 122,148 168,124 C220,97 290,116 314,168 C341,226 320,306 262,330 C198,357 118,334 92,272 C63,204 88,116 152,88 C222,58 320,85 348,156"
        stroke="url(#spiralGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      <defs>
        <linearGradient id="spiralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      {/* Pulsing center dot */}
      <circle cx="200" cy="200" r="4" fill="#22d3ee">
        <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const { ref, visible } = useReveal();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(to / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(start);
    }, 30);
    return () => clearInterval(t);
  }, [visible, to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Marquee ticker ───────────────────────────────────────────────────────────
const tickers = [
  "One goal", "Six months", "No lying", "Real data", "Spiral Battles",
  "AI Coach", "Public Wall", "Zero guilt", "Effort scores", "Weekly logs",
  "Your fingerprint", "Chaos Mode", "Replay your story", "Show up anyway",
];

function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.04] bg-black/20 py-4">
      <div className="flex w-max animate-[marquee_25s_linear_infinite] gap-8">
        {[...tickers, ...tickers].map((t, i) => (
          <span key={i} className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-600">
            {t}
            <span className="h-1 w-1 rounded-full bg-cyan-400/40" />
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  { tag: "Core", title: "One goal. Six months.", body: "Set the most unrealistic goal you can think of. Spiral breaks it into monthly milestones and weekly actions. No fluff. Just the next move.", accent: "cyan" },
  { tag: "Tracking", title: "Log what actually happened.", body: "Every week you write what happened and rate your effort 1–10. Missed a week? Log that too. Missed weeks are data, not failures.", accent: "fuchsia" },
  { tag: "Intelligence", title: "AI Coach that keeps it real.", body: "Your coach sees your pattern — the good weeks, the bad ones, the ones where you barely showed up. It won't lie to you.", accent: "amber" },
  { tag: "Visualization", title: "Your effort fingerprint.", body: "Spiral DNA is a live SVG generated from your actual logged weeks. No two spirals look the same. Watch it change as you show up.", accent: "cyan" },
  { tag: "Multiplayer", title: "Spiral Battles.", body: "Challenge someone to chase the same goal. One log per week each. Real-time leaderboard. Six months. One winner.", accent: "fuchsia" },
  { tag: "Social", title: "Public Spiral Wall.", body: "Share your spiral. Anyone can see it. Real goals, real chaos, real people showing up anyway. Every shared spiral is a public receipt.", accent: "amber" },
  { tag: "Replay", title: "Watch your story play back.", body: "Replay mode animates your entire spiral week by week. See the pattern. See the proof. See how far you actually came.", accent: "cyan" },
  { tag: "Identity", title: "Chaos Mode.", body: "Sometimes dark mode isn't enough. Chaos Mode is heavy, neon, and slightly unhinged. Test it on a PC for the full effect.", accent: "fuchsia" },
];

const proofCards = [
  { goal: "Publish my first novel", week: "Week 19", effort: 8, line: "Rewrote the ending before school. Chapter 24 finally exists." },
  { goal: "Hit $10k MRR", week: "Week 23", effort: 9, line: "Sent the email I kept avoiding. Booked three calls." },
  { goal: "Run a sub-4 hour marathon", week: "Week 14", effort: 7, line: "Tempo run sucked. Kept the pace anyway." },
  { goal: "Grow to 100k YouTube subscribers", week: "Week 27", effort: 8, line: "Posted the video I wanted to hide. 500 views from the messy version." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03020a] text-white selection:bg-cyan-500/30">

      {/* Cursor glow */}
      <div
        className="pointer-events-none fixed z-0 h-96 w-96 rounded-full opacity-20 blur-[80px] transition-all duration-500 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.4) 0%, transparent 70%)",
          left: mousePos.x - 192,
          top: mousePos.y - 192,
        }}
      />

      {/* Static background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(34,211,238,0.1),transparent)]" />
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-fuchsia-600/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-cyan-600/5 blur-[100px]" />
      </div>

      {/* ── NAV ── */}
      <header
        className="relative z-50 mx-auto flex h-20 max-w-7xl items-center justify-between border-b border-white/[0.04] px-4 sm:px-8"
        style={{
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(-12px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-300">Spiral</p>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/spirals" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white">Wall</Link>
          <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white">Sign In</Link>
          <Link href="/signup" className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300">
            Get Started
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2">

        {/* Left */}
        <div>
          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.7s ease 0.1s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s",
            }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Goal tracking for messy people</span>
            </div>
          </div>

          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(32px)",
              transition: "opacity 0.8s ease 0.2s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s",
            }}
          >
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]">
              <span className="block text-white">Track the</span>
              <span className="block text-white">goal without</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-300 to-fuchsia-400 bg-clip-text text-transparent">
                lying.
              </span>
            </h1>
          </div>

          <div
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.7s ease 0.4s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s",
            }}
          >
            <p className="mt-7 max-w-lg text-base font-medium leading-relaxed text-zinc-400">
              Set one ridiculous 6-month goal. Log what actually happens every week — the good, the bad, the weeks you barely showed up. No streaks. No guilt. Just evidence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_30px_rgba(34,211,238,0.25)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(34,211,238,0.4)]"
              >
                <span className="relative z-10">Start tracking →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-zinc-400 transition-all duration-200 hover:border-white/20 hover:text-white"
              >
                I already fell off
              </Link>
            </div>

            {/* Stats row */}
            <div
              className="mt-12 flex items-center gap-6 border-t border-white/[0.04] pt-8"
              style={{
                opacity: heroVisible ? 1 : 0,
                transition: "opacity 0.7s ease 0.6s",
              }}
            >
              {[
                { n: 100, suffix: "%", label: "Free forever" },
                { n: 26, suffix: "", label: "Weeks tracked" },
                { n: 0, suffix: "", label: "Guilt trips" },
              ].map(({ n, suffix, label }) => (
                <div key={label}>
                  <p className="text-2xl font-black text-white">
                    <Counter to={n} suffix={suffix} />
                  </p>
                  <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — animated spiral */}
        <div
          className="relative flex items-center justify-center"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "scale(1) rotate(0deg)" : "scale(0.85) rotate(-10deg)",
            transition: "opacity 1.2s ease 0.3s, transform 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s",
          }}
        >
          <div className="relative h-[380px] w-[380px] sm:h-[480px] sm:w-[480px]">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 blur-2xl" />
            <HeroSpiral />
            {/* Floating label */}
            <div className="absolute bottom-8 right-0 rounded-2xl border border-white/10 bg-[#03020a]/80 px-4 py-3 backdrop-blur-md">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300">Week 14</p>
              <p className="mt-1 text-lg font-black">8/10</p>
              <p className="text-[9px] text-zinc-500">Kept the pace anyway.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
      `}</style>
      <Marquee />

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">How it works</p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">Three steps.<br />No excuses.</h2>
          </Reveal>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              { num: "01", title: "Name the goal", body: "One goal. Not ten. The one that makes you cringe a little just saying it out loud.", color: "cyan" },
              { num: "02", title: "Show up weekly", body: "Write what happened. Rate your effort. Missed a week? Log that too. The spiral pulls you back.", color: "fuchsia" },
              { num: "03", title: "Use the evidence", body: "By month 6 you won't hit the crazy goal. But you'll have built something massive — because the obsession was the point.", color: "amber" },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 100}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.02] p-8 transition-all duration-500 hover:-translate-y-2 hover:border-white/10 hover:bg-white/[0.04]">
                  <div className={`absolute -right-6 -top-6 text-[7rem] font-black leading-none tracking-tighter transition-all duration-500 group-hover:scale-110 ${
                    step.color === "cyan" ? "text-cyan-400/[0.06]" :
                    step.color === "fuchsia" ? "text-fuchsia-400/[0.06]" : "text-amber-400/[0.06]"
                  }`}>{step.num}</div>
                  <p className={`text-4xl font-black tracking-tighter ${
                    step.color === "cyan" ? "text-cyan-400/30 group-hover:text-cyan-400/60" :
                    step.color === "fuchsia" ? "text-fuchsia-400/30 group-hover:text-fuchsia-400/60" :
                    "text-amber-400/30 group-hover:text-amber-400/60"
                  } transition-colors duration-300`}>{step.num}</p>
                  <h3 className="mt-5 text-xl font-black uppercase tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 border-y border-white/[0.04] bg-black/20 px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-400">Everything inside</p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">Built to handle<br />chaos.</h2>
          </Reveal>

          <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 50}>
                <div className={`group h-full cursor-default rounded-2xl border bg-white/[0.015] p-5 transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/[0.04] ${
                  f.accent === "cyan" ? "border-cyan-400/[0.08] hover:border-cyan-400/25 hover:shadow-[0_0_30px_rgba(34,211,238,0.05)]" :
                  f.accent === "fuchsia" ? "border-fuchsia-400/[0.08] hover:border-fuchsia-400/25 hover:shadow-[0_0_30px_rgba(217,70,239,0.05)]" :
                  "border-amber-400/[0.08] hover:border-amber-400/25 hover:shadow-[0_0_30px_rgba(251,191,36,0.05)]"
                }`}>
                  <p className={`text-[9px] font-black uppercase tracking-[0.35em] ${
                    f.accent === "cyan" ? "text-cyan-400" : f.accent === "fuchsia" ? "text-fuchsia-400" : "text-amber-400"
                  }`}>{f.tag}</p>
                  <h3 className="mt-3 text-sm font-black uppercase leading-snug tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BATTLES ── */}
      <section className="relative z-10 px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <Reveal>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-400">New feature</p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">Spiral<br />Battles.</h2>
              <p className="mt-6 text-base font-medium leading-relaxed text-zinc-400">Challenge someone to chase the same goal. Both of you log weekly effort. One shot per week. Real-time leaderboard. Six months. One winner.</p>
              <div className="mt-8 space-y-3">
                {["Invite anyone with their user ID.", "One log per week — no gaming the system.", "Watch the gap open in real time."].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-zinc-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 text-[9px] text-fuchsia-300">✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/signup" className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-7 py-3.5 text-sm font-black uppercase text-[#03020a] shadow-[0_0_30px_rgba(217,70,239,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(217,70,239,0.3)]">
                Start a Battle →
              </Link>
            </Reveal>

            <Reveal delay={150}>
              {/* Animated battle card */}
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-fuchsia-300">Live battle</p>
                  <span className="flex items-center gap-1.5 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-fuchsia-300">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-fuchsia-400" />
                    Week 6 of 26
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-black uppercase">Write a novel openly</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300">You</p>
                    <p className="mt-2 text-5xl font-black tabular-nums">47</p>
                    <p className="mt-1 text-[10px] text-zinc-500">effort pts</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Opponent</p>
                    <p className="mt-2 text-5xl font-black tabular-nums text-zinc-400">39</p>
                    <p className="mt-1 text-[10px] text-zinc-600">effort pts</p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-600">
                    <span>You're ahead by 8 pts</span>
                    <span>Week 6 / 26</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: "55%", transition: "width 1.5s ease" }} />
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-semibold text-zinc-600 italic">"Rewrote the ending before school. Chapter 24 finally exists."</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── PROOF ── */}
      <section className="relative z-10 border-y border-white/[0.04] bg-black/20 px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-400">Real logs</p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl">Proof beats<br />vibes.</h2>
              </div>
              <Link href="/spirals" className="w-fit rounded-xl border border-white/10 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-cyan-300/40 hover:text-cyan-100">
                See the public wall →
              </Link>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {proofCards.map((item, i) => (
              <Reveal key={item.goal} delay={i * 80}>
                <div className="group h-full rounded-3xl border border-white/[0.05] bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-2 hover:border-fuchsia-400/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400">{item.week}</p>
                    <span className="text-xl font-black text-white">{item.effort}<span className="text-sm text-zinc-600">/10</span></span>
                  </div>
                  <p className="text-sm font-black uppercase leading-tight tracking-tight">{item.goal}</p>
                  <p className="mt-3 text-xs font-medium italic leading-relaxed text-zinc-500">&ldquo;{item.line}&rdquo;</p>
                  {/* Effort bar */}
                  <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all duration-700 group-hover:opacity-100"
                      style={{ width: `${item.effort * 10}%`, opacity: 0.5 }}
                    />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 overflow-hidden px-4 py-32 sm:px-8">
        {/* Big glowing orb behind CTA */}
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-600/10 to-fuchsia-600/10 blur-[100px]" />
        <Reveal>
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">You already know the goal</p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-[0.88] tracking-tight sm:text-7xl">
              Ready to track
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-300 to-fuchsia-400 bg-clip-text text-transparent">
                the mess?
              </span>
            </h2>
            <p className="mx-auto mt-7 max-w-lg text-base font-medium text-zinc-500">
              Free. No streaks. No guilt. Just you, your goal, and six months of honest evidence.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-10 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_60px_rgba(34,211,238,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_80px_rgba(34,211,238,0.35)]"
              >
                <span className="relative z-10">Start tracking →</span>
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
              <Link href="/spirals" className="rounded-2xl border border-white/10 px-10 py-4 text-sm font-black uppercase tracking-wide text-zinc-400 transition-all hover:border-white/20 hover:text-white">
                See public spirals
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

    </main>
  );
}