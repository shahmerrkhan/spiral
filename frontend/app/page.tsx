"use client";

import React, { useState } from "react";
import Link from "next/link";

const bullets = [
  {
    title: "Pick the messy goal.",
    body: "One goal. Six months. Big enough that you cannot fake caring about it.",
  },
  {
    title: "Turn it into receipts.",
    body: "Spiral breaks the goal into months, then weeks. Not motivation. Just the next bit of proof.",
  },
  {
    title: "Fall off. Write it down.",
    body: "Missed weeks still count as data. No guilt. No streak worship. Just evidence that helps you return.",
  },
];

const promptDataset = [
  {
    id: "instagram",
    tabLabel: "Get 1M followers",
    title: "Get 1M Instagram followers",
    short: "Get 1M followers",
    score: "62%",
    proofTitle: "Week 1 proof",
    proofText: "Post 5 reels this week no matter what, even bad ones. Especially bad ones.",
    weeksLogged: "5 / blank: 3",
    grid: [8, 6, null, 9, null, 4, 7, null]
  },
  {
    id: "startup",
    tabLabel: "Make $10k from a thing",
    title: "Make $10k from a thing I built",
    short: "Make $10k Build",
    score: "45%",
    proofTitle: "Week 4 proof",
    proofText: "DM 40 target customers with a painfully specific problem statement. Zero aesthetic adjustments allowed.",
    weeksLogged: "3 / blank: 5",
    grid: [9, null, null, 7, null, 8, null, null]
  },
  {
    id: "novel",
    tabLabel: "Write a novel openly",
    title: "Write a novel where people can see it",
    short: "Public Novel",
    score: "81%",
    proofTitle: "Week 12 proof",
    proofText: "Write 4,000 messy words across four days. Do not open chapter one to correct typos.",
    weeksLogged: "7 / blank: 1",
    grid: [9, 8, 7, null, 9, 8, 9, 7]
  },
  {
    id: "marathon",
    tabLabel: "Run a clean marathon",
    title: "Run a marathon and stay normal about it",
    short: "Normal Marathon",
    score: "73%",
    proofTitle: "Week 8 proof",
    proofText: "Run 3 times this week: two short shameless local jogs and one highly uncomfortable long interval slog.",
    weeksLogged: "6 / blank: 2",
    grid: [6, 7, null, 8, 9, null, 7, 8]
  }
];

const proof = [
  {
    name: "Maya Chen",
    goal: "Publish my first novel",
    week: "Week 19",
    score: "87",
    streak: "18 weeks logged",
    line: "Rewrote the ending before school. It is still rough. But chapter 24 finally exists.",
  },
  {
    name: "Priya Shah",
    goal: "Hit $10k MRR with my startup",
    week: "Week 23",
    score: "91",
    streak: "9 weeks logged",
    line: "Sent the email I kept avoiding. Booked three calls. The deck did not matter.",
  },
  {
    name: "Marcus Reed",
    goal: "Run a sub-4 hour marathon",
    week: "Week 14",
    score: "78",
    streak: "11 weeks logged",
    line: "Tempo run sucked. Kept the pace anyway. Logged the ugly splits.",
  },
  {
    name: "Ava Thompson",
    goal: "Grow my YouTube channel to 100k subscribers",
    week: "Week 27",
    score: "84",
    streak: "16 weeks logged",
    line: "Posted the video I wanted to hide. First 500 views came from the messy version.",
  },
];

export default function Home() {
  const [activeProfile, setActiveProfile] = useState(promptDataset[0]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#03020a] pb-24 text-white selection:bg-cyan-500/30 font-sans [scroll-behavior:smooth] transition-colors duration-500 sm:pb-0">
      
      {/* BACKGROUND GRAPH INFRASRUCTURE & ANIMATED RADIAL GLOWS */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-90 mix-blend-screen">
        {/* Shifting Grid Line Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:56px_56px] transition-all duration-700" />
        
        {/* Fluid Dynamic Ambient Auroras */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.15),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,0.12),transparent_40%),radial-gradient(circle_at_15%_80%,rgba(59,130,246,0.1),transparent_35%)] animate-[pulse_8s_ease-in-out_infinite]" />
        
        {/* Moving Hyper-Glow Focus Elements */}
        <div className="absolute left-1/3 top-[-10%] h-[650px] w-[650px] rounded-full bg-cyan-500/10 blur-[130px] animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[140px] animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      {/* FIXED PREMIUM NAVIGATION CONTAINER */}
      <header className="relative z-50 max-w-7xl mx-auto px-6 h-24 flex items-center justify-between border-b border-white/[0.04] backdrop-blur-md">
        <div className="flex items-center space-x-3.5 group cursor-default">
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)] animate-ping" />
            <div className="relative w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </div>
          <span className="font-mono text-xs font-black tracking-[0.25em] text-slate-400 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-white/[0.05] shadow-inner transition-all duration-300 group-hover:border-cyan-500/30 group-hover:text-cyan-300">
            SPIRAL // ENGINE_CORE_V1
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-all duration-200 hover:translate-y-[-1px]">
            Sign In
          </Link>
          <Link href="/signup" className="relative group overflow-hidden text-sm font-black bg-white text-slate-950 px-5 py-2.5 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-xl shadow-white/5 hover:shadow-white/10">
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0" />
          </Link>
        </div>
      </header>

      {/* HERO SECTION INTERACTIVE SIMULATOR */}
      <section className="relative z-10 isolate flex min-h-[calc(100vh-6rem)] items-center px-4 py-8 sm:px-10 lg:px-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          
          {/* LEFT COMMAND MODULE */}
          <div className="space-y-10">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/20 bg-blue-500/5 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.12)] backdrop-blur-md animate-[pulse_4s_ease-in-out_infinite]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(103,232,249,1)]" />
              Goal tracking for messy people
            </div>

            {/* Typography Engine Area */}
            <div className="space-y-6">
              <h1 className="max-w-6xl text-5xl font-black uppercase leading-[0.82] tracking-[-0.06em] text-white sm:text-7xl lg:text-[5.8rem] xl:text-[6.8rem]">
                <span className="block drop-shadow-[0_0_40px_rgba(255,255,255,0.12)] transition-transform duration-500 hover:scale-[1.005]">Track the goal</span>
                <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent filter contrast-[110%] animate-[pulse_6s_ease-in-out_infinite]">
                  without lying.
                </span>
              </h1>
              <p className="max-w-xl text-base font-medium leading-relaxed text-zinc-400 sm:text-xl transition-all duration-300 hover:text-zinc-300">
                Spiral is goal tracking that expects chaos. Pick the thing. Log what happened. Use the evidence. No guilt. <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400 font-black tracking-wide underline decoration-fuchsia-500/30 underline-offset-4">No streak cult.</span>
              </p>
            </div>

            {/* Premium CTA Buttons with Magnetic Acceleration effects */}
            <div className="flex flex-col gap-4 sm:flex-row max-w-md">
              <Link
                href="/signup"
                className="group flex-1 min-h-14 flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 px-8 py-4 text-center text-base font-black uppercase tracking-wide text-[#03020a] shadow-[0_0_40px_rgba(59,130,246,0.25)] transition-all duration-300 ease-out active:scale-[0.96] hover:scale-[1.02] hover:shadow-[0_0_55px_rgba(34,211,238,0.45)]"
              >
                <span>Start tracking</span>
                <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1.5"> →</span>
              </Link>
              <Link
                href="/login"
                className="flex-1 min-h-14 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-4 text-center text-base font-black uppercase tracking-wide text-white backdrop-blur-md transition-all duration-200 active:scale-[0.96] hover:border-cyan-400/40 hover:bg-cyan-400/[0.08]"
              >
                I already fell off
              </Link>
            </div>

            {/* Static Content Cards transformed with Micro-Borders */}
            <div className="grid gap-4 pt-4 md:grid-cols-3">
              {bullets.map((item, index) => (
                <article
                  key={item.title}
                  className="group relative rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:translate-y-[-2px]"
                >
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-mono font-black text-cyan-300 border border-cyan-500/20 transition-all duration-300 group-hover:border-cyan-400/50 group-hover:bg-cyan-400/20 group-hover:text-white">
                    0{index + 1}
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-white transition-colors duration-200 group-hover:text-cyan-300">{item.title}</h2>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400 transition-colors duration-200 group-hover:text-zinc-300">{item.body}</p>
                </article>
              ))}
            </div>
          </div>

          {/* RIGHT BLOCK: HIGH-FIDELITY LIVE INTERACTIVE CONSOLE */}
          <div className="relative mx-auto w-full max-w-md lg:ml-auto group/card">
            {/* Adaptive Interactive Aura Mesh */}
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-cyan-400/15 blur-2xl opacity-80 group-hover/card:opacity-100 transition-all duration-500 pointer-events-none" />
            
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0c091b]/95 p-6 shadow-2xl shadow-blue-950/40 backdrop-blur-xl sm:p-7 transition-all duration-300 group-hover/card:border-white/[0.12]">
              
              {/* Dynamic Header Module */}
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
                <div className="space-y-1">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.35em] text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">Goal on the table</p>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white transition-all duration-500 ease-out transform">
                    {activeProfile.short}
                  </h3>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-3.5 py-2.5 text-right backdrop-blur-sm shadow-inner transition-all duration-300">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400/70">Spiral score</p>
                  <p className="text-2xl font-black text-purple-200 mt-0.5 tracking-tight transition-all duration-500 animate-pulse">{activeProfile.score}</p>
                </div>
              </div>

              {/* Dynamic Output Monitor Panel */}
              <div className="relative rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.02] p-5 shadow-inner group/proof overflow-hidden transition-all duration-300 hover:bg-cyan-400/[0.04]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent transform translate-x-[-100%] group-hover/proof:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                  {activeProfile.proofTitle}
                </span>
                <p className="mt-3.5 text-sm font-semibold leading-relaxed text-slate-200 transition-all duration-500 min-h-[3rem]">
                  "{activeProfile.proofText}"
                </p>
              </div>

              {/* Matrix Frame Grid Registry Component */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  <span>YOUR SPIRAL REGISTRY</span>
                  <span className="text-zinc-400 font-semibold transition-all duration-300">{activeProfile.weeksLogged}</span>
                </div>
                <div className="grid grid-cols-8 gap-2.5">
                  {activeProfile.grid.map((score, index) => (
                    <div
                      key={index}
                      className={`flex aspect-square items-center justify-center rounded-xl border text-xs font-mono font-black transition-all duration-500 transform hover:scale-110 hover:z-10 ${
                        score
                          ? "border-cyan-400/40 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.12)] hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                          : "border-white/[0.04] bg-white/[0.01] text-zinc-800"
                      }`}
                    >
                      {score ?? ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Control Console Input Layer */}
              <div className="mt-6 rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 space-y-3">
                <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  CLICK PROMPT CONTEXT TO HOT-SWAP REGISTRY:
                </p>
                <div className="flex flex-col gap-1.5">
                  {promptDataset.map((prompt) => {
                    const isSelected = activeProfile.id === prompt.id;
                    return (
                      <button 
                        key={prompt.id}
                        onClick={() => setActiveProfile(prompt)}
                        className={`w-full text-left text-[11px] px-3.5 py-2.5 rounded-xl border font-mono transition-all duration-300 ease-out flex items-center justify-between group/btn ${
                          isSelected
                            ? "bg-white/[0.06] border-white/15 text-cyan-300 font-bold translate-x-1.5 shadow-md"
                            : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] hover:translate-x-1"
                        }`}
                      >
                        <span className="truncate pr-2 transition-colors duration-200">{prompt.title}</span>
                        <div className="relative flex items-center justify-center w-2 h-2 shrink-0">
                          <div className={`absolute inset-0 rounded-full bg-cyan-400 transition-transform duration-300 ${isSelected ? "scale-150 animate-ping opacity-60" : "scale-0 opacity-0 group-hover/btn:scale-100 group-hover/btn:opacity-40"}`} />
                          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isSelected ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" : "bg-zinc-700"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* THREE-COLUMN ARCHITECTURE GRID WITH STEPPED TRANSITIONS */}
      <section className="relative border-y border-white/[0.04] bg-black/[0.15] px-6 py-24 backdrop-blur-sm sm:px-10 lg:px-16">
        <div className="mx-auto mb-16 max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-400">Execution framework</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-6xl">Start simple. Keep it honest.</h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            ["01", "Name the thing", "One goal. Not ten. Write the thing you keep thinking about, even if it sounds too big for a single frame."],
            ["02", "Make proof for this week", "Pick one specific action you can actually build or finish. Small is useful. Hyped architecture maps are not."],
            ["03", "Come back either way", "Executed it? Log the receipt. Missed it? Log that layout too. Spiral works perfectly when you stop hiding the raw data."],
          ].map(([number, title, body]) => (
            <div key={title} className="group rounded-3xl border border-white/[0.05] bg-white/[0.02] p-8 shadow-xl shadow-blue-950/10 transition-all duration-300 hover:translate-y-[-4px] hover:border-cyan-400/40 hover:bg-cyan-400/[0.02] hover:shadow-[0_10px_30px_rgba(34,211,238,0.05)]">
              <p className="text-5xl font-black tracking-tighter text-cyan-400/60 transition-colors duration-300 group-hover:text-fuchsia-400">{number}</p>
              <h3 className="mt-6 text-2xl font-black uppercase leading-none tracking-tight text-white transition-colors duration-200 group-hover:text-cyan-300">{title}</h3>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 transition-colors duration-200 group-hover:text-zinc-300">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HIGHER FREQUENCY LOG STREAM WITH INTERACTION MATRIX */}
      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.42em] text-fuchsia-400">Verified pipeline activity</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">Proof beats vibes.</h2>
            </div>
            <Link href="/signup" className="group rounded-xl bg-white px-6 py-3.5 text-sm font-black uppercase text-[#03020a] shadow-lg transition-all duration-300 hover:scale-[1.04] hover:bg-cyan-200 active:scale-95 hover:shadow-cyan-300/20">
              Start Your Log
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {proof.map((item) => (
              <div key={item.name} className="group relative overflow-hidden rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.03] to-white/[0.005] p-6 transition-all duration-300 hover:translate-y-[-4px] hover:border-fuchsia-400/40 hover:shadow-[0_12px_40px_rgba(217,70,239,0.05)]">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-fuchsia-500/5 blur-2xl transition-all duration-500 group-hover:bg-cyan-400/15" />
                
                <div className="relative mb-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-black uppercase leading-none tracking-wide text-white transition-colors duration-200 group-hover:text-fuchsia-300">{item.name}</p>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400">{item.week}</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/5 text-xs font-mono font-black text-cyan-200 shadow-inner group-hover:rotate-[360deg] transition-transform duration-700 ease-out">
                    {item.score}
                  </div>
                </div>

                <p className="relative text-xl font-black uppercase leading-tight tracking-tight text-white min-h-[3rem] line-clamp-2">{item.goal}</p>
                
                <div className="relative mt-4 rounded-xl border border-white/[0.04] bg-black/40 px-3.5 py-2">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">Registered frames</p>
                  <p className="mt-0.5 text-xs font-mono font-bold uppercase tracking-wide text-cyan-300">{item.streak}</p>
                </div>
                
                <p className="relative mt-4 rounded-xl border border-fuchsia-500/10 bg-fuchsia-500/[0.02] p-4 text-xs font-semibold leading-relaxed text-fuchsia-200/80 italic transition-colors duration-200 group-hover:bg-fuchsia-500/[0.04]">
                  &ldquo;{item.line}&rdquo;
                </p>

                <div className="relative mt-5 space-y-2">
                  <div className="flex justify-between text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                    <span>Spiral integrity</span>
                    <span>{item.score}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all duration-1000 ease-out" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CONVERSION MODULE CONTAINER */}
      <section className="border-t border-white/[0.04] px-6 py-28 sm:px-10 lg:px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-4xl text-center space-y-8 relative z-10">
          <h2 className="text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            Ready to track the <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-fuchsia-400 bg-clip-text text-transparent filter contrast-125">mess?</span>
          </h2>
          <p className="mx-auto max-w-lg text-base font-medium text-zinc-400 sm:text-lg">
            Stop pretending execution will be perfectly neat. Build out your goals. Registry stays open. Start logging what happens.
          </p>
          <div className="pt-4">
            <Link href="/signup" className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 px-12 py-5 text-base font-black uppercase tracking-wide text-[#03020a] shadow-[0_0_45px_rgba(59,130,246,0.25)] transition-all duration-300 active:scale-[0.96] hover:scale-[1.02] hover:shadow-[0_0_65px_rgba(34,211,238,0.5)]">
              <span>Start tracking &rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}