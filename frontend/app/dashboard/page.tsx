"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { archiveGoal, createCheckIn, getActiveGoal, getCheckIns, getMilestones, CheckIn, Goal, Milestone, SpiralSession } from "@/lib/supabase";
import { signOut, fetchWithTimeout } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { HelpCircle, MessageCircle, Share2, X } from "lucide-react";

type CoachMood = "Focused" | "Chaotic" | "Burnt out" | "Locked in";

type WeeklyReflection = {
    focus: string;
    questions: string[];
    source?: string;
};

function deterministicIndex(seed: number, length: number) {
    if (length <= 0) return 0;
    return Math.abs(Math.trunc(seed)) % length;
}

function inferCoachMood(text: string): CoachMood {
    const normalized = text.toLowerCase();
    if (/burn|tired|exhaust|overwhelm|drain|rest|recover/.test(normalized)) return "Burnt out";
    if (/lock|win|attack|dominate|crush|compete|finish/.test(normalized)) return "Locked in";
    if (/chaos|mess|spiral|scattered|random|panic/.test(normalized)) return "Chaotic";
    return "Focused";
}

function getLocalMotivationalLine(seed: number) {
    return MOTIVATIONAL_LINES[deterministicIndex(seed, MOTIVATIONAL_LINES.length)] || "Return once. That is the whole engine.";
}

function buildLocalCoachResponse(
    userMessage: string,
    goal: Goal | null,
    currentWeek: number,
    streak: number,
    weeksActive: number,
    weeksMissed: number,
    spiralScore: number,
    checkIns: CheckIn[],
    mood: CoachMood = inferCoachMood(userMessage)
) {
    const message = userMessage.trim();
    if (!message) return "Write one honest sentence. The spiral can work with that.";

    const effortTotal = checkIns.reduce((sum, checkIn) => sum + Number(checkIn.effort_score || 0), 0);
    const seed = message.length + currentWeek * 13 + streak * 7 + weeksActive * 5 + weeksMissed * 11 + spiralScore + effortTotal + mood.length * 17;
    const line = getLocalMotivationalLine(seed);
    const goalText = goal?.goal_text?.trim() || "the goal";

    const moodCopy: Record<CoachMood, string> = {
        Focused: `Cut the noise. For week ${currentWeek}, protect one clean action for ${goalText}.`,
        Chaotic: "Good. The mess is data. Pick the smallest visible next move and make chaos pay rent.",
        "Burnt out": "Lower the friction. Recovery is not quitting; it is how the next return stays possible.",
        "Locked in": "No romance. No delay. Convert that pressure into proof before the day cools down.",
    };

    return `${moodCopy[mood]} ${line} You have ${weeksActive} active ${weeksActive === 1 ? "week" : "weeks"}, ${weeksMissed} missed ${weeksMissed === 1 ? "week" : "weeks"}, and a ${spiralScore}% spiral score. Next instruction: log the smallest undeniable proof.`;
}

function buildLocalWeeklyReflection(goal: Goal | null, currentWeek: number, streak: number, checkIns: CheckIn[], mood: CoachMood = "Focused"): WeeklyReflection {
    const goalText = goal?.goal_text?.trim() || "this goal";
    const effortTotal = checkIns.reduce((sum, checkIn) => sum + Number(checkIn.effort_score || 0), 0);
    const seed = goalText.length + currentWeek * 19 + streak * 23 + effortTotal + mood.length * 29;
    const line = getLocalMotivationalLine(seed);

    const questionSets: Record<CoachMood, string[]> = {
        Focused: [
            `What single action moved ${goalText} forward this week?`,
            "Where did your attention leak, and what boundary fixes it?",
            "What is the first repeatable move for next week?",
        ],
        Chaotic: [
            "What part of the mess was actually useful information?",
            "Which tiny task would create the fastest sense of control?",
            "What can be deleted, delayed, or simplified before the next check-in?",
        ],
        "Burnt out": [
            "What would make returning feel 10% easier, not heroic?",
            "Where does your body need recovery before ambition can work again?",
            "What is the lowest-friction promise you can keep next week?",
        ],
        "Locked in": [
            "Where did you leave points on the board this week?",
            "What opponent, excuse, or delay gets beaten first next week?",
            "What proof would make future you impossible to ignore?",
        ],
    };

    return {
        focus: `${mood} week ${currentWeek} reset`,
        questions: questionSets[mood],
        source: `local deterministic engine • ${line}`,
    };
}

function generateLocalCoachMessage(
    userMessage: string,
    goal: Goal | null,
    currentWeek: number,
    streak: number,
    weeksActive: number,
    weeksMissed: number,
    spiralScore: number,
    checkIns: CheckIn[],
    mood?: CoachMood
) {
    return buildLocalCoachResponse(userMessage, goal, currentWeek, streak, weeksActive, weeksMissed, spiralScore, checkIns, mood);
}

function generateWeeklyReflectionPrompt(goal: Goal | null, currentWeek: number, streak: number, checkIns: CheckIn[], mood?: CoachMood): WeeklyReflection {
    return buildLocalWeeklyReflection(goal, currentWeek, streak, checkIns, mood);
}

function WeeklyReflectionCard(_: { reflection: WeeklyReflection | null; loading: boolean; currentWeek: number; onRefresh: () => void | Promise<void> }) {
    return null;
}

type PlaybackState = "idle" | "playing" | "paused" | "complete";

function WreckagePlayback({ checkIns }: { checkIns: CheckIn[] }) {
    const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
    const [currentStep, setCurrentStep] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(800);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number | null>(null);
    const timeRef = useRef(0);

    const totalSteps = checkIns.length;
    const visibleCheckIns = checkIns.slice(0, currentStep + 1);

    useEffect(() => {
        if (playbackState !== "playing" || currentStep >= totalSteps - 1) return;
        const timer = window.setInterval(() => {
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
        }, playbackSpeed);
        return () => window.clearInterval(timer);
    }, [playbackState, currentStep, totalSteps, playbackSpeed]);

    useEffect(() => {
        if (playbackState === "playing" && totalSteps > 0 && currentStep >= totalSteps - 1) {
            const timer = window.setTimeout(() => setPlaybackState("complete"), 0);
            return () => window.clearTimeout(timer);
        }
    }, [playbackState, currentStep, totalSteps]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const W = canvas.width = 480;
        const H = canvas.height = 480;
        const cx = W / 2;
        const cy = H / 2;

        const draw = (t: number) => {
            ctx.clearRect(0, 0, W, H);

            // Deep space background
            const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.75);
            bg.addColorStop(0, "rgba(8,4,28,1)");
            bg.addColorStop(1, "rgba(2,1,8,1)");
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Subtle grid
            ctx.strokeStyle = "rgba(34,211,238,0.04)";
            ctx.lineWidth = 1;
            for (let i = 0; i < W; i += 40) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
            }

            const steps = visibleCheckIns.length;
            const maxR = 190;
            const minR = 18;

            // Draw rings for each check-in
            visibleCheckIns.forEach((checkIn, idx) => {
                const effort = Math.max(1, Math.min(10, Number(checkIn.effort_score || 5)));
                const ratio = effort / 10;
                const r = minR + (idx / Math.max(1, totalSteps - 1)) * (maxR - minR);
                const isLatest = idx === steps - 1;

                // Glow for high effort rings
                if (ratio > 0.6) {
                    const glow = ctx.createRadialGradient(cx, cy, r - 8, cx, cy, r + 8);
                    const alpha = (ratio - 0.6) * 0.8;
                    if (effort >= 8) {
                        glow.addColorStop(0, `rgba(34,211,238,${alpha})`);
                        glow.addColorStop(1, "rgba(34,211,238,0)");
                    } else {
                        glow.addColorStop(0, `rgba(168,85,247,${alpha * 0.6})`);
                        glow.addColorStop(1, "rgba(168,85,247,0)");
                    }
                    ctx.strokeStyle = glow;
                    ctx.lineWidth = 14;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Color based on effort
                let color: string;
                if (effort >= 9) color = `rgba(250,204,21,${0.5 + ratio * 0.5})`;
                else if (effort >= 7) color = `rgba(34,211,238,${0.4 + ratio * 0.5})`;
                else if (effort >= 5) color = `rgba(168,85,247,${0.35 + ratio * 0.4})`;
                else if (effort >= 3) color = `rgba(244,114,182,${0.3 + ratio * 0.4})`;
                else color = `rgba(239,68,68,${0.25 + ratio * 0.35})`;

                // Dashed arc segments
                const dashLen = 8 + ratio * 28;
                const gapLen = 4 + (1 - ratio) * 14;
                const circumference = 2 * Math.PI * r;
                const totalDashes = Math.floor(circumference / (dashLen + gapLen));
                const angleStep = (Math.PI * 2) / totalDashes;
                const dashAngle = (dashLen / circumference) * Math.PI * 2;
                const rotOffset = isLatest ? t * 0.0008 : t * 0.0002 * (idx % 2 === 0 ? 1 : -1);

                ctx.strokeStyle = color;
                ctx.lineWidth = isLatest ? 3.5 + ratio * 2 : 1.5 + ratio * 1.5;
                ctx.lineCap = "round";

                for (let d = 0; d < totalDashes; d++) {
                    const startAngle = d * angleStep + rotOffset;
                    const endAngle = startAngle + dashAngle * (isLatest ? 1 : 0.7 + ratio * 0.3);
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, startAngle, endAngle);
                    ctx.stroke();
                }

                // Effort node dot
                const nodeAngle = rotOffset;
                const nx = cx + Math.cos(nodeAngle) * r;
                const ny = cy + Math.sin(nodeAngle) * r;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(nx, ny, isLatest ? 5 : 3, 0, Math.PI * 2);
                ctx.fill();

                // Week label on latest ring
                if (isLatest && steps > 0) {
                    const labelAngle = nodeAngle + 0.3;
                    const lx = cx + Math.cos(labelAngle) * (r + 16);
                    const ly = cy + Math.sin(labelAngle) * (r + 16);
                    ctx.fillStyle = "rgba(255,255,255,0.7)";
                    ctx.font = "bold 10px monospace";
                    ctx.textAlign = "center";
                    ctx.fillText(`W${idx + 1}`, lx, ly);
                }
            });

            // Center core pulse
            const pulseR = 6 + Math.sin(t * 0.004) * 3;
            const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 3);
            coreGlow.addColorStop(0, "rgba(34,211,238,0.9)");
            coreGlow.addColorStop(0.4, "rgba(34,211,238,0.3)");
            coreGlow.addColorStop(1, "rgba(34,211,238,0)");
            ctx.fillStyle = coreGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, pulseR * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(cx, cy, pulseR * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Scanline overlay
            for (let y = 0; y < H; y += 4) {
                ctx.fillStyle = "rgba(0,0,0,0.06)";
                ctx.fillRect(0, y, W, 1);
            }
        };

        const loop = (t: number) => {
            timeRef.current = t;
            draw(t);
            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [visibleCheckIns, totalSteps]);

    const handlePlay = () => {
        if (playbackState === "complete" || currentStep >= totalSteps - 1) {
            setCurrentStep(0);
            setPlaybackState("playing");
        } else if (playbackState === "paused") {
            setPlaybackState("playing");
        } else {
            setPlaybackState("playing");
        }
    };

    const handlePause = () => setPlaybackState("paused");
    const handleReset = () => { setCurrentStep(0); setPlaybackState("idle"); };

    if (totalSteps === 0) return null;

    const latestCheckIn = visibleCheckIns[visibleCheckIns.length - 1];
    const effort = Number(latestCheckIn?.effort_score || 0);
    const effortColor = effort >= 9 ? "#facc15" : effort >= 7 ? "#22d3ee" : effort >= 5 ? "#a855f7" : effort >= 3 ? "#f472b6" : "#ef4444";

    return (
        <section className="my-8 overflow-hidden rounded-[2.5rem] border border-cyan-300/20 bg-black/60 shadow-2xl shadow-cyan-950/40" style={{ backdropFilter: "blur(20px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{ animation: playbackState === "playing" ? "pulse 1s infinite" : "none" }} />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-200">Wreckage Playback</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={handlePlay} disabled={playbackState === "playing"}
                        className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-300/25 disabled:opacity-40 disabled:cursor-not-allowed">
                        {playbackState === "playing" ? "Playing..." : playbackState === "complete" ? "Replay" : "Play"}
                    </button>
                    <button type="button" onClick={handlePause} disabled={playbackState !== "playing"}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.15em] text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        Pause
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_280px]">
                {/* Canvas */}
                <div className="relative flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.04),transparent_70%)]" />
                    <canvas ref={canvasRef} width={480} height={480} className="w-full max-w-[280px] sm:max-w-[360px] rounded-2xl" style={{ imageRendering: "crisp-edges" }} />
                </div>

                {/* Side panel */}
                <div className="flex flex-col justify-between border-l border-white/[0.06] p-6">
                    {/* Current week info */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Current</p>
                        <p className="mt-1 text-5xl font-black tracking-[-0.05em] text-white">W{currentStep + 1}</p>
                        <p className="text-xs font-bold text-zinc-500">of {totalSteps} weeks</p>

                        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Effort</p>
                                <p className="text-2xl font-black" style={{ color: effortColor }}>{effort}<span className="text-sm text-zinc-500">/10</span></p>
                            </div>
                            {/* Effort bar */}
                            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${effort * 10}%`, backgroundColor: effortColor, boxShadow: `0 0 8px ${effortColor}` }} />
                            </div>
                            {latestCheckIn?.log_text && (
                                <p className="mt-3 text-xs italic leading-5 text-zinc-400">
                                    &ldquo;{latestCheckIn.log_text.slice(0, 120)}{latestCheckIn.log_text.length > 120 ? "..." : ""}&rdquo;
                                </p>
                            )}
                        </div>

                        {/* All weeks mini timeline */}
                        <div className="mt-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">All weeks</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {checkIns.map((c, i) => {
                                    const e = Number(c.effort_score || 0);
                                    const active = i <= currentStep;
                                    const col = e >= 9 ? "#facc15" : e >= 7 ? "#22d3ee" : e >= 5 ? "#a855f7" : e >= 3 ? "#f472b6" : "#ef4444";
                                    return (
                                        <div key={i} title={`Week ${i + 1}: ${e}/10`}
                                            className="h-5 w-5 rounded-md transition-all duration-300 cursor-pointer"
                                            style={{ backgroundColor: active ? col : "rgba(255,255,255,0.05)", opacity: active ? 1 : 0.3, boxShadow: active && i === currentStep ? `0 0 8px ${col}` : "none" }}
                                            onClick={() => setCurrentStep(i)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Speed */}
                    <div className="mt-6">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                            <span>Speed</span>
                            <span>{playbackSpeed}ms</span>
                        </div>
                        <input type="range" min="200" max="2000" step="200" value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                            className="mt-2 w-full accent-cyan-400" />
                    </div>
                </div>
            </div>
        </section>
    );
}

function generateWeeklyLetterFromPastSelf(goal: Goal | null, checkIns: CheckIn[], latestEffort: number, latestNote: string) {
    const goalTitle = goal?.goal_text?.trim() || "this goal";
    const allEfforts = [...checkIns.map((checkIn) => Number(checkIn.effort_score ?? 0)), latestEffort].filter((score) => Number.isFinite(score) && score > 0);
    const totalShows = allEfforts.length;
    const averageEffort = allEfforts.length ? allEfforts.reduce((sum, score) => sum + score, 0) / allEfforts.length : latestEffort;
    const strongestEffort = allEfforts.length ? Math.max(...allEfforts) : latestEffort;
    const weekOneEffort = Number(checkIns[0]?.effort_score ?? latestEffort);
    const trimmedNote = latestNote.trim();
    const honestLine = trimmedNote
        ? `I saw what you wrote this week: “${trimmedNote.slice(0, 140)}${trimmedNote.length > 140 ? "…" : ""}” That counts. That is evidence.`
        : "Even without a perfect story this week, you left evidence. You checked in instead of disappearing.";

    const tone = averageEffort >= 8 ? "You are not just keeping this alive — you are giving it heat." : averageEffort >= 5 ? "It has not been flawless, but it has been real, and real is what changes people." : "Some weeks were thin. Some weeks probably felt embarrassing. But the spiral did not need perfection; it needed a return.";

    return `Week 1 me had no idea what was coming. I only knew we picked “${goalTitle}” and hoped future us would not quietly abandon it.\n\nYou have shown up ${totalShows} ${totalShows === 1 ? "time" : "times"}. Your strongest week hit ${strongestEffort}/10, and even compared with that first ${weekOneEffort}/10, you are still here building a pattern I could only imagine. ${honestLine}\n\n${tone} If I could say one thing from the beginning of this spiral, it would be this: do not waste this proof. Log the next small thing. Keep becoming the person I was trying to start.`;
}

function CardSkeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`w-full max-w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 transition-all duration-300 ease-out sm:rounded-[2rem] sm:p-8 ${className}`}>
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="mt-6 h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
            <div className="mt-5 space-y-4">
                <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    const [isTakingTooLong, setIsTakingTooLong] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setIsTakingTooLong(true), 3000);
        const dismissTimer = window.setTimeout(() => {
            window.location.reload();
        }, 8000);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(dismissTimer);
        };
    }, []);
    return (
        <div className="space-y-6" role="status" aria-live="polite">
            {isTakingTooLong && (
                <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-300/10 p-5 text-amber-50 shadow-2xl shadow-amber-950/20">
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-200">Still loading?</p>
                    <p className="mt-2 text-sm text-amber-50/80">
                        The dashboard is taking longer than expected. You can keep waiting, refresh the page, or sign out and back in if the session is stale.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="rounded-full bg-amber-200 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-950 transition hover:bg-amber-100"
                        >
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                window.localStorage.removeItem("spiral_auth_session");
                                window.location.href = "/";
                            }}
                            className="rounded-full border border-amber-200/40 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-200/10"
                        >
                            Reset session
                        </button>
                    </div>
                </div>
            )}
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                <CardSkeleton className="min-h-[280px] md:col-span-2 xl:col-span-3" />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton className="md:col-span-2" />
                <CardSkeleton />
            </div>
        </div>
    );
}

function WeekOneOnboardingChecklist() {
    const goTo = (matchers: string[], clickMatch = false) => {
        if (typeof document === "undefined") return;
        const targets = Array.from(document.querySelectorAll<HTMLElement>("main button, main a, main article, main section"));
        const target = targets.find((element) => {
            const text = (element.innerText || element.textContent || "").toUpperCase();
            return matchers.some((matcher) => text.includes(matcher));
        });

        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            if (clickMatch && (target.tagName === "BUTTON" || target.tagName === "A")) window.setTimeout(() => target.click(), 350);
        }
    };

    const items = [
        { label: "Name the goal ✓", action: () => goTo(["YOUR GOAL", "THE TARGET", "EDIT THE TARGET"]) },
        { label: "Read this week's move", action: () => goTo(["MICRO", "WEEKLY ACTION", "ACTION FOR THIS WEEK"]) },
        { label: "Write week 1 down", action: () => goTo(["LOG THIS WEEK"], true) },
        { label: "Share the mess", action: () => goTo(["SHARE"], true) },
    ];

    return (
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-cyan-300/[0.07] p-5 shadow-2xl shadow-cyan-950/30 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">Week 1 launch checklist</p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-white">Four taps to start the spiral.</h2>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-zinc-300">Use this quick path for your first five minutes. Once week 1 is logged, this guide disappears.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[34rem]">
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.action}
                            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left text-sm font-black uppercase tracking-[0.12em] text-zinc-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/15 hover:text-cyan-100"
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CinematicPepTalk({ text, weeklyLetter }: { text: string; weeklyLetter?: string }) {
    const displayText = text.trim() || "Reading the wreckage...";
    const words = useMemo(() => displayText.split(/\s+/).filter(Boolean), [displayText]);
    const [visibleWords, setVisibleWords] = useState(0);

    useEffect(() => {
        setVisibleWords(0);
        const timer = window.setInterval(() => {
            setVisibleWords((current) => {
                if (current >= words.length) {
                    window.clearInterval(timer);
                    return current;
                }
                return current + 1;
            });
        }, 135);

        return () => window.clearInterval(timer);
    }, [displayText, words.length]);

    return (
        <div className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-5 opacity-0 shadow-2xl shadow-fuchsia-950/40 backdrop-blur-xl transition-opacity duration-1000 animate-in fade-in sm:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_80%_35%,rgba(217,70,239,0.24),transparent_30%),linear-gradient(135deg,rgba(8,47,73,0.45),rgba(88,28,135,0.28),rgba(0,0,0,0.6))] opacity-80 animate-pulse" />
            <div className="absolute -left-24 top-8 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl animate-pulse" />
            <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse" />
            <p className="relative text-2xl font-black leading-tight text-white sm:text-4xl">
                {words.map((word, index) => (
                    <span key={`${word}-${index}`} className={`inline-block pr-2 transition duration-500 ${index < visibleWords ? "translate-y-0 opacity-100 blur-0" : "translate-y-3 opacity-0 blur-sm"}`}>
                        {word}
                    </span>
                ))}
                <span className="ml-1 inline-block h-8 w-1 translate-y-1 animate-pulse rounded-full bg-cyan-200 sm:h-10" />
            </p>
            {weeklyLetter?.trim() ? (
                <div className="relative mt-6 rounded-[1.5rem] border border-amber-200/20 bg-amber-100/[0.08] p-5 shadow-2xl shadow-amber-950/20">
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-200">A weekly letter from week 1 you</p>
                    <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.03em] text-white">They wrote through the spiral.</h3>
                    <p className="mt-4 whitespace-pre-line text-base font-semibold leading-8 text-amber-50/90">{weeklyLetter}</p>
                </div>
            ) : null}
        </div>
    );
}

const MANIFESTO_STORAGE_PREFIX = "spiral-manifesto:";

function getManifestoGoalText(goal: Goal | null): string {
    const record = (goal || {}) as { goal_text?: string; goalText?: string; title?: string; text?: string };
    return record.goal_text || record.goal_text || record.title || record.text || "one ridiculous goal";
}

function getManifestoEffort(checkIn: CheckIn): number {
    const record = checkIn as unknown as { effort_score?: number; effortScore?: number; effort?: number };
    return Math.max(1, Math.min(10, Number(record.effort_score || record.effort_score || record.effort || 1)));
}

function getManifestoLog(checkIn: CheckIn): string {
    const record = checkIn as unknown as { log_text?: string; logText?: string; notes?: string; log?: string };
    return record.log_text || record.log_text || record.notes || record.log || "";
}

function generateSpiralManifesto(goal: Goal | null, checkIns: CheckIn[]): string {
    const goalText = getManifestoGoalText(goal).replace(/[.!?]+$/, "");
    const averageEffort = checkIns.length ? Math.round((checkIns.reduce((sum, item) => sum + getManifestoEffort(item), 0) / checkIns.length) * 10) : 0;
    const proofWords = checkIns
        .map(getManifestoLog)
        .join(" ")
        .toLowerCase();
    const signal = proofWords.includes("hard") || proofWords.includes("tired") || proofWords.includes("miss") ? "even when it gets ugly" : "with zero excuses";
    return `You are chasing ${goalText} with ${averageEffort}% energy and ${signal}.`;
}

function SpiralManifesto({ goal, checkIns }: { goal: Goal | null; checkIns: CheckIn[] }) {
    const storageKey = `${MANIFESTO_STORAGE_PREFIX}${((goal || {}) as { id?: string }).id || "active"}`;
    const autoManifesto = useMemo(() => generateSpiralManifesto(goal, checkIns), [goal, checkIns]);
    const [manifesto, setManifesto] = useState(autoManifesto);
    const [draft, setDraft] = useState(autoManifesto);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = window.localStorage.getItem(storageKey);
        const next = saved || autoManifesto;
        setManifesto(next);
        setDraft(next);
    }, [autoManifesto, storageKey]);

    if (checkIns.length < 1) return null;

    const saveManifesto = () => {
        const next = draft.trim() || autoManifesto;
        setManifesto(next);
        setDraft(next);
        setEditing(false);
        if (typeof window !== "undefined") window.localStorage.setItem(storageKey, next);
    };

    return (
        <section className="my-8 overflow-hidden rounded-[2.5rem] border border-fuchsia-300/25 bg-fuchsia-300/[0.07] p-6 shadow-2xl shadow-fuchsia-950/30 sm:p-8">
            <div className={`flex flex-col gap-6 ${editing ? "" : "lg:flex-row lg:items-start lg:justify-between"}`}>
                <div className="w-full max-w-4xl">
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-fuchsia-200">Your Manifesto</p>
                    {editing ? (
                        <textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            className="mt-5 min-h-40 w-full resize-y rounded-[2rem] border border-fuchsia-200/20 bg-black/45 px-5 py-5 text-2xl font-black leading-tight text-white shadow-inner shadow-black/30 outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-300/70 focus:bg-black/55 focus:ring-4 focus:ring-fuchsia-300/10 sm:px-6 sm:py-6 sm:text-4xl"
                            aria-label="Edit your manifesto"
                        />
                    ) : (
                        <button type="button" onClick={() => setEditing(true)} className="mt-4 block text-left text-3xl font-black uppercase leading-[0.95] tracking-[-0.06em] text-white transition hover:text-fuchsia-100 sm:text-5xl">
                            “{manifesto}”
                        </button>
                    )}
                    <p className="mt-4 text-sm font-semibold leading-6 text-zinc-300">Auto-generated from your goal, effort scores, and weekly logs. Click it to make it yours.</p>
                </div>
                <div className={`${editing ? "mt-1 flex w-full flex-col gap-3 sm:flex-row sm:justify-end" : "flex shrink-0 gap-3"}`}>
                    {editing ? (
                        <>
                            <button type="button" onClick={() => { setDraft(manifesto); setEditing(false); }} className="rounded-full border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:border-white/30 hover:bg-white/10">
                                Cancel
                            </button>
                            <button type="button" onClick={saveManifesto} className="rounded-full bg-fuchsia-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#05030b] transition hover:bg-white">
                                Save
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={() => setEditing(true)} className="rounded-full border border-fuchsia-300/40 bg-fuchsia-300/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-300 hover:text-[#05030b]">
                            Edit manifesto
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

function getSpiralDnaEffort(checkIn: CheckIn): number {
    const record = checkIn as unknown as { effort_score?: number; effortScore?: number; effort?: number };
    return Math.max(1, Math.min(10, Number(record.effort_score || record.effort_score || record.effort || 1)));
}

function SpiralDna({ goal, checkIns, compact = false }: { goal: Goal | null; checkIns: CheckIn[]; compact?: boolean }) {
    const efforts = checkIns.map(getSpiralDnaEffort);
    const fingerprint = efforts.length ? efforts : [2, 4, 3, 5, 4, 6, 5, 7];
    const goalSeed = getManifestoGoalText(goal)
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const average = fingerprint.reduce((sum, score) => sum + score, 0) / fingerprint.length;
    const rings = fingerprint.slice(-10);
    const wavePoints = fingerprint
        .map((score, index) => {
            const x = 22 + (index / Math.max(1, fingerprint.length - 1)) * 216;
            const y = 142 - score * 8.8 + Math.sin((goalSeed + index * 17) / 13) * 7;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <section className={`overflow-hidden rounded-[2.5rem] border border-cyan-300/25 bg-cyan-300/[0.06] shadow-2xl shadow-cyan-950/30 ${compact ? "p-5" : "my-8 p-6 sm:p-8"}`}>
            <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-center">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-cyan-200">Spiral DNA</p>
                    <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-5xl">Your effort fingerprint.</h2>
                    <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-zinc-300">Every ring is a week. Every bend is an effort score. This SVG is generated from your actual journey, so no two spirals are the same.</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-200">
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2">{fingerprint.length} weeks encoded</span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2">avg {average.toFixed(1)}/10</span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-2">seed #{goalSeed % 997}</span>
                    </div>
                </div>
                <div className="relative mx-auto aspect-square w-full max-w-[18rem] rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-inner shadow-black/40">
                    <svg viewBox="0 0 260 260" role="img" aria-label="Spiral DNA visual fingerprint based on weekly effort scores" className="h-full w-full overflow-visible">
                        <defs>
                            <radialGradient id="spiralDnaGlow" cx="50%" cy="45%" r="60%">
                                <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.9" />
                                <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.55" />
                                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                            </radialGradient>
                            <linearGradient id="spiralDnaStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="50%" stopColor="#e879f9" />
                                <stop offset="100%" stopColor="#facc15" />
                            </linearGradient>
                        </defs>
                        <circle cx="130" cy="130" r="108" fill="url(#spiralDnaGlow)" opacity="0.28" />
                        {rings.map((score, index) => {
                            const radius = 22 + index * (86 / Math.max(1, rings.length));
                            const dash = 10 + score * 2 + ((goalSeed + index) % 9);
                            const gap = 7 + (10 - score) * 1.25;
                            return <circle key={`${score}-${index}`} cx="130" cy="130" r={radius} fill="none" stroke="url(#spiralDnaStroke)" strokeWidth={1.5 + score / 4} strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" opacity={0.25 + score / 14} transform={`rotate(${goalSeed % 360 + index * 19} 130 130)`} />;
                        })}
                        <polyline points={wavePoints} fill="none" stroke="#fef3c7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.88" />
                        {fingerprint.map((score, index) => {
                            const angle = (index / fingerprint.length) * Math.PI * 2 + goalSeed / 57;
                            const radius = 34 + score * 8.4;
                            const x = 130 + Math.cos(angle) * radius;
                            const y = 130 + Math.sin(angle) * radius;
                            return <circle key={`node-${index}`} cx={x} cy={y} r={2.5 + score / 3} fill={score >= 8 ? "#facc15" : score >= 5 ? "#22d3ee" : "#e879f9"} opacity="0.9" />;
                        })}
                        <circle cx="130" cy="130" r="7" fill="#ffffff" opacity="0.9" />
                    </svg>
                </div>
            </div>
        </section>
    );
}

function getWallWeekNumber(goal: Goal | null): number {
    const record = (goal || {}) as { created_at?: string; createdAt?: string; started_at?: string; startDate?: string };
    const rawDate = record.created_at || record.created_at || record.started_at || record.startDate;
    if (!rawDate) return 1;
    const started = new Date(rawDate).getTime();
    if (!Number.isFinite(started)) return 1;
    const days = Math.floor((Date.now() - started) / 86_400_000);
    return Math.max(1, Math.floor(days / 7) + 1);
}

function hasWallWeekCheckIn(checkIns: CheckIn[]): boolean {
    return checkIns.some((checkIn, index) => {
        const record = checkIn as unknown as { week_number?: number; weekNumber?: number; week?: number };
        const week = Number(record.week_number || record.week_number || record.week || index + 1);
        return week === 3;
    });
}

function WallIntervention({ goal, checkIns }: { goal: Goal | null; checkIns: CheckIn[] }) {
    const weekNumber = getWallWeekNumber(goal);
    const shouldShow = weekNumber === 3 && !hasWallWeekCheckIn(checkIns);

    if (!shouldShow) return null;

    const jumpToCheckIn = () => {
        if (typeof document === "undefined") return;
        const targets = Array.from(document.querySelectorAll<HTMLElement>("main button, main a, main article, main section, form"));
        const target = targets.find((element) => {
            const text = (element.innerText || element.textContent || "").toUpperCase();
            return text.includes("LOG THIS WEEK") || text.includes("CHECK IN") || text.includes("SUBMIT CHECK-IN") || text.includes("SAVE CHECK-IN");
        });

        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (target && (target.tagName === "BUTTON" || target.tagName === "A")) window.setTimeout(() => target.click(), 350);
    };

    return (
        <section className="relative my-8 flex min-h-[82vh] overflow-hidden rounded-[3rem] border border-red-400/35 bg-red-950/25 p-6 shadow-2xl shadow-red-950/40 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(239,68,68,0.32),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(250,204,21,0.16),transparent_28%),linear-gradient(135deg,rgba(127,29,29,0.35),rgba(0,0,0,0.76))]" />
            <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/10 bg-red-500/5 blur-3xl" />
            <div className="relative z-10 m-auto max-w-5xl text-center">
                <p className="text-xs font-black uppercase tracking-[0.55em] text-red-200">Week 3 intervention</p>
                <h2 className="mt-6 text-6xl font-black uppercase leading-[0.82] tracking-[-0.09em] text-white sm:text-8xl lg:text-9xl">You've hit the wall.</h2>
                <p className="mx-auto mt-8 max-w-3xl text-xl font-black leading-8 text-zinc-100 sm:text-2xl sm:leading-10">Every person who ever built something real hit this exact moment. The spiral is still alive. Log something, anything, right now.</p>
                <div className="mx-auto mt-8 max-w-2xl rounded-[2rem] border border-red-200/20 bg-black/35 p-5 text-left shadow-inner shadow-black/40">
                    <p className="text-sm font-bold leading-7 text-zinc-300">This is not a reminder. This is the part of the story where most people quietly disappear. One honest check-in keeps the thread from snapping.</p>
                </div>
                <button type="button" onClick={jumpToCheckIn} className="mt-10 rounded-full bg-red-300 px-8 py-5 text-sm font-black uppercase tracking-[0.24em] text-[#120407] shadow-2xl shadow-red-950/40 transition hover:bg-white hover:scale-[1.02]">
                    Log something now
                </button>
            </div>
        </section>
    );
}

function buildGoalAutopsy(goal: Goal | null, checkIns: CheckIn[]) {
    const efforts = checkIns.map(getSpiralDnaEffort);
    const totalWeeks = Math.max(checkIns.length, getWallWeekNumber(goal));
    const averageEffort = efforts.length ? efforts.reduce((sum, effort) => sum + effort, 0) / efforts.length : 0;
    const highestIndex = efforts.length ? efforts.indexOf(Math.max(...efforts)) : -1;
    const lowestIndex = efforts.length ? efforts.indexOf(Math.min(...efforts)) : -1;
    const highestWeek = highestIndex >= 0 ? highestIndex + 1 : 0;
    const lowestWeek = lowestIndex >= 0 ? lowestIndex + 1 : 0;
    const goalText = getManifestoGoalText(goal);
    const summary = efforts.length
        ? `This chapter chased “${goalText}” for ${totalWeeks} week${totalWeeks === 1 ? "" : "s"}. It peaked in week ${highestWeek} with ${efforts[highestIndex]}/10 effort and dipped in week ${lowestWeek} at ${efforts[lowestIndex]}/10, leaving an average of ${averageEffort.toFixed(1)}/10. The story was not whether every week was heroic; it was that the spiral produced evidence, resistance, returns, and a clean ending instead of a quiet disappearance.`
        : `This chapter chased “${goalText}” but ended before the first logged proof. Even that matters: the autopsy names the pattern instead of letting it vanish silently, so the next spiral can begin with sharper honesty.`;

    return { totalWeeks, averageEffort, highestWeek, lowestWeek, highestEffort: highestIndex >= 0 ? efforts[highestIndex] : 0, lowestEffort: lowestIndex >= 0 ? efforts[lowestIndex] : 0, summary };
}

function GoalAutopsyOverlay({ goal, checkIns, onClose }: { goal: Goal | null; checkIns: CheckIn[]; onClose: () => void }) {
    const autopsy = buildGoalAutopsy(goal, checkIns);

    return (
        <div className="fixed inset-0 z-[9998] overflow-y-auto bg-[#05030b] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(250,204,21,0.16),transparent_28%),radial-gradient(circle_at_84%_24%,rgba(217,70,239,0.18),transparent_30%),radial-gradient(circle_at_50%_88%,rgba(34,211,238,0.14),transparent_30%)]" />
            <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-8 sm:px-8">
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-100 transition hover:bg-white hover:text-[#05030b]">Close chapter</button>
                </div>
                <section className="flex flex-1 flex-col justify-center py-10 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.55em] text-amber-200">Goal autopsy</p>
                    <h1 className="mx-auto mt-6 max-w-6xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] sm:text-7xl lg:text-9xl">A chapter closed without pretending.</h1>
                    <p className="mx-auto mt-8 max-w-3xl text-lg font-semibold leading-8 text-zinc-300">{autopsy.summary}</p>
                </section>
                <section className="grid gap-4 md:grid-cols-4">
                    <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Weeks active</p><p className="mt-3 text-4xl font-black">{autopsy.totalWeeks}</p></article>
                    <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Average effort</p><p className="mt-3 text-4xl font-black">{autopsy.averageEffort.toFixed(1)}</p></article>
                    <article className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-5"><p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">Highest week</p><p className="mt-3 text-4xl font-black">{autopsy.highestWeek || "—"}</p><p className="mt-1 text-sm font-bold text-zinc-400">{autopsy.highestEffort ? `${autopsy.highestEffort}/10` : "No score"}</p></article>
                    <article className="rounded-[2rem] border border-red-300/20 bg-red-300/[0.06] p-5"><p className="text-xs font-black uppercase tracking-[0.25em] text-red-200">Lowest week</p><p className="mt-3 text-4xl font-black">{autopsy.lowestWeek || "—"}</p><p className="mt-1 text-sm font-bold text-zinc-400">{autopsy.lowestEffort ? `${autopsy.lowestEffort}/10` : "No score"}</p></article>
                </section>
                <SpiralDna goal={goal} checkIns={checkIns} />
            </main>
        </div>
    );
}

type CoachMessage = {
    role: "user" | "coach";
    content: string;
};

type SoundtrackMode = "off" | "lofi" | "white-noise" | "rain";

type SoundtrackSettings = {
    mode: SoundtrackMode;
    volume: number;
};

const SOUNDTRACK_STORAGE_KEY = "spiral-soundtrack-settings";

const MOTIVATIONAL_LINES = [
    "The spiral doesn't care about your mood.",
    "Consistency isn't discipline. It's just showing up anyway.",
    "You don't need a better personality. You need one logged action.",
    "The week is not ruined. Your ego is just loud.",
    "Do the ugly version. The clean version is procrastination in a blazer.",
    "Nobody is coming to rescue this goal. Good. Move anyway.",
    "Motivation is a weather report. Evidence is the climate.",
    "Your excuses can ride along, but they don't get to drive.",
];

const WEEKLY_MOOD_OPTIONS = ["Focused", "Chaotic", "Burnt out", "Locked in"] as const;
type WeeklyMood = (typeof WEEKLY_MOOD_OPTIONS)[number];

function getCheckInMood(checkIn: CheckIn): WeeklyMood | null {
    const value = checkIn as unknown as { mood?: string; weekly_mood?: string };
    const mood = value.mood || value.weekly_mood;
    return WEEKLY_MOOD_OPTIONS.includes(mood as WeeklyMood) ? (mood as WeeklyMood) : null;
}

async function copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.className = "fixed left-[-9999px] top-0 opacity-0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        document.execCommand("copy");
    } finally {
        document.body.removeChild(textarea);
    }
}

function triggerCheckInConfetti() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const confetti = (window as unknown as { confetti?: (options: Record<string, unknown>) => void }).confetti;
    if (typeof confetti === "function") {
        confetti({ particleCount: 90, spread: 72, origin: { y: 0.72 }, scalar: 0.95 });
        window.setTimeout(() => confetti({ particleCount: 45, spread: 52, origin: { x: 0.25, y: 0.78 }, scalar: 0.75 }), 120);
        window.setTimeout(() => confetti({ particleCount: 45, spread: 52, origin: { x: 0.75, y: 0.78 }, scalar: 0.75 }), 180);
        return;
    }

    const layer = document.createElement("div");
    layer.className = "pointer-events-none fixed inset-0 z-[9999] overflow-hidden";
    document.body.appendChild(layer);

    const colors = ["bg-cyan-300", "bg-fuchsia-400", "bg-amber-300", "bg-lime-300", "bg-white"];
    Array.from({ length: 34 }).forEach((_, index) => {
        const piece = document.createElement("span");
        const left = 10 + Math.random() * 80;
        const delay = Math.random() * 120;
        const duration = 650 + Math.random() * 550;
        const drift = (Math.random() - 0.5) * 160;
        piece.className = `absolute top-[18%] h-3 w-2 rounded-sm ${colors[index % colors.length]} shadow-lg`;
        piece.style.left = `${left}%`;
        piece.style.transform = `translate3d(0, 0, 0) rotate(${Math.random() * 180}deg)`;
        piece.animate(
            [
                { transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1 },
                { transform: `translate3d(${drift}px, ${window.innerHeight * 0.68}px, 0) rotate(${260 + Math.random() * 260}deg)`, opacity: 0 },
            ],
            { duration, delay, easing: "cubic-bezier(.16,.84,.44,1)", fill: "forwards" },
        );
        layer.appendChild(piece);
    });

    window.setTimeout(() => layer.remove(), 1500);
}

function readSoundtrackSettings(): SoundtrackSettings {
    if (typeof window === "undefined") return { mode: "off", volume: 0.25 };
    try {
        const parsed = JSON.parse(window.localStorage.getItem(SOUNDTRACK_STORAGE_KEY) || "{}");
        const mode = ["lofi", "white-noise", "rain"].includes(parsed.mode) ? (parsed.mode as SoundtrackMode) : "off";
        const volume = typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : 0.25;
        return { mode, volume };
    } catch {
        return { mode: "off", volume: 0.25 };
    }
}

function startAmbientSoundtrack(settings: SoundtrackSettings): () => void {
    if (typeof window === "undefined" || settings.mode === "off") return () => undefined;
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return () => undefined;

    const context = new AudioContextCtor();
    const master = context.createGain();
    master.gain.value = Math.max(0, Math.min(0.55, settings.volume * 0.55));
    master.connect(context.destination);
    const cleanup: Array<() => void> = [];

    const unlock = () => {
        if (context.state === "suspended") void context.resume();
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    cleanup.push(() => document.removeEventListener("pointerdown", unlock));

    const makeNoise = () => {
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        cleanup.push(() => source.stop());
        return source;
    };

    if (settings.mode === "lofi") {
        const notes = [130.81, 164.81, 196, 246.94];
        notes.forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = index === 0 ? "sine" : "triangle";
            oscillator.frequency.value = frequency;
            gain.gain.value = index === 0 ? 0.16 : 0.05;
            oscillator.connect(gain).connect(master);
            oscillator.start();
            cleanup.push(() => oscillator.stop());
        });
    }

    if (settings.mode === "white-noise") {
        const source = makeNoise();
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1200;
        source.connect(filter).connect(master);
        source.start();
    }

    if (settings.mode === "rain") {
        const source = makeNoise();
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1800;
        filter.Q.value = 0.6;
        source.connect(filter).connect(master);
        source.start();
        const dripTimer = window.setInterval(() => {
            const drip = context.createOscillator();
            const dripGain = context.createGain();
            drip.type = "sine";
            drip.frequency.setValueAtTime(700 + Math.random() * 700, context.currentTime);
            dripGain.gain.setValueAtTime(0.001, context.currentTime);
            dripGain.gain.exponentialRampToValueAtTime(0.04, context.currentTime + 0.01);
            dripGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
            drip.connect(dripGain).connect(master);
            drip.start();
            drip.stop(context.currentTime + 0.18);
        }, 520);
        cleanup.push(() => window.clearInterval(dripTimer));
    }

    return () => {
        cleanup.forEach((item) => item());
        void context.close();
    };
}

type TourStep = {
  selector: string;
  title: string;
  description: string;
};

const TOUR_STEPS = [
    {
        selector: "[data-tour='spiral-energy']",
        title: "Your Spiral Energy",
        description: "This is your momentum score. It measures consistency, effort, and how recently you showed up. Log a week and watch it move.",
    },
    {
        selector: "[data-tour='goal-card']",
        title: "The Six-Month Target",
        description: "This is what you committed to. Big enough that you can't fake caring about it. Track your progress toward the finish line.",
    },
    {
        selector: "[data-tour='milestones']",
        title: "Monthly Milestones & Weekly Actions",
        description: "Broken down into months and weeks. Pick the one thing this week that's too obvious to dodge.",
    },
    {
        selector: "[data-tour='week-grid']",
        title: "Your Spiral Progress",
        description: "Every color is a logged week. Effort scores from 1–10. Missed weeks are gray. Click any week to see what you actually wrote.",
    },
    {
        selector: "[data-tour='check-in-button']",
        title: "Log a Week",
        description: "Write what happened. Rate your effort. Get a response that isn't motivational nonsense. That's the spiral.",
    },
    {
        selector: "[data-tour='replay']",
        title: "Replay Your Story",
        description: "Watch your entire spiral play back week by week. See the pattern. See the proof.",
    },
    {
        selector: "[data-tour='battles']",
        title: "Spiral Battles",
        description: "Challenge someone to chase the same goal. Both of you log weekly effort. One person wins. Find it in the nav.",
    },
];

function findTourTarget(step: TourStep): HTMLElement | null {
    const viewportArea = window.innerWidth * window.innerHeight;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("main button, main article, main section, main div"));

    const scoredTargets = nodes
        .filter((element) => {
            const selector = step.selector;
            return element.matches(selector) || element.closest(selector);
        })
        .map((element) => {
            const target = element.closest<HTMLElement>("article, section") ?? element;
            const rect = target.getBoundingClientRect();
            const area = rect.width * rect.height;
            const isVisible = rect.width > 36 && rect.height > 36 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
            const isPageWrapper = area > viewportArea * 0.68;
            const isButtonMatch = target.tagName === "BUTTON" || target.getAttribute("role") === "button";
            const score =
                area +
                (target.matches("article, section") ? -50000 : 0);
            return { target, rect, area, isVisible, isPageWrapper, score };
        })
        .filter((item, index, array) => item.isVisible && !item.isPageWrapper && array.findIndex((other) => other.target === item.target) === index)
        .sort((a, b) => a.score - b.score);

    return scoredTargets[0]?.target ?? null;
}

function startOnboardingTour(userId: string) {
    const storageKey = `spiral-onboarding-tour-complete:${userId}`;
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey);

    let stepIndex = 0;
    let tourActive = true;

    function cleanup() {
        document.querySelectorAll("[data-spiral-tour]").forEach((el) => el.remove());
    }

    function finish() {
        tourActive = false;
        window.localStorage.setItem(storageKey, "true");
        cleanup();
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
    }

    function render() {
        if (!tourActive) return;
        cleanup();

        const step = TOUR_STEPS[stepIndex];
        if (!step) { finish(); return; }

        const target = document.querySelector<HTMLElement>(step.selector);
        if (!target) {
            stepIndex < TOUR_STEPS.length - 1 ? (stepIndex++, render()) : finish();
            return;
        }

        // Scroll target into view first, then render after scroll settles
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        target.scrollIntoView({ behavior: "smooth", block: "center" });

        setTimeout(() => {
            if (!tourActive) return;

            const rect = target.getBoundingClientRect();
            const pad = 16;
            const t = Math.max(0, rect.top - pad);
            const l = Math.max(0, rect.left - pad);
            const rawW = rect.width + pad * 2;
            const rawH = rect.height + pad * 2;
            const minSize = 80;
            const w = Math.min(window.innerWidth - l, Math.max(minSize, rawW));
            const maxH = window.innerHeight - t - 20;
            const h = Math.min(maxH, Math.max(minSize, rawH));
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // 4-piece dim frame
            const dimStyles = [
                `top:0;left:0;right:0;height:${t}px`,
                `top:${t}px;left:${l + w}px;right:0;height:${h}px`,
                `top:${t + h}px;left:0;right:0;bottom:0`,
                `top:${t}px;left:0;width:${l}px;height:${h}px`,
            ];

            dimStyles.forEach((pos) => {
                const d = document.createElement("div");
                d.setAttribute("data-spiral-tour", "dim");
                d.style.cssText = `position:fixed;${pos};background:rgba(0,0,0,0.82);z-index:9997;pointer-events:auto;transition:all 350ms ease;`;
                document.body.appendChild(d);
            });

            // Ring
            const ring = document.createElement("div");
            ring.setAttribute("data-spiral-tour", "ring");
            ring.style.cssText = `
        position:fixed;
        top:${t}px;left:${l}px;
        width:${w}px;height:${h}px;
        border:2px solid #22d3ee;
        border-radius:2.5rem;
        box-shadow:0 0 0 4px rgba(34,211,238,0.15), 0 0 60px rgba(34,211,238,0.85), inset 0 0 20px rgba(34,211,238,0.1);
        z-index:9999;
        pointer-events:none;
        animation:tourRingPulse 2s ease-in-out infinite;
      `;
            document.body.appendChild(ring);

            // Inject pulse animation if not already there
            if (!document.getElementById("tour-keyframes")) {
                const style = document.createElement("style");
                style.id = "tour-keyframes";
                style.textContent = `
          @keyframes tourRingPulse {
            0%, 100% { box-shadow: 0 0 0 4px rgba(34,211,238,0.15), 0 0 40px rgba(34,211,238,0.6), inset 0 0 15px rgba(34,211,238,0.1); }
            50% { box-shadow: 0 0 0 8px rgba(34,211,238,0.25), 0 0 80px rgba(34,211,238,0.95), inset 0 0 25px rgba(34,211,238,0.2); }
          }
          @keyframes tourBubbleIn {
            from { opacity: 0; transform: translateY(10px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `;
                document.head.appendChild(style);
            }

            // Bubble positioning
            const bw = Math.min(380, vw - 32);
            let bTop = t + h + 20;
            let bLeft = l + w / 2 - bw / 2;
            if (bTop + 260 > vh) bTop = Math.max(20, t - 270);
            bLeft = Math.max(16, Math.min(bLeft, vw - bw - 16));

            // Progress dots
            const dots = TOUR_STEPS.map((_, i) =>
                `<div style="width:${i === stepIndex ? '20px' : '6px'};height:6px;border-radius:9999px;background:${i === stepIndex ? '#22d3ee' : 'rgba(255,255,255,0.2)'};transition:all 300ms;"></div>`
            ).join("");

            const bubble = document.createElement("div");
            bubble.setAttribute("data-spiral-tour", "bubble");
            bubble.style.cssText = `
        position:fixed;top:${bTop}px;left:${bLeft}px;width:${bw}px;
        background:linear-gradient(135deg,#0f0820 0%,#07051a 60%,#05020d 100%);
        border:1px solid rgba(34,211,238,0.45);
        border-radius:2rem;padding:24px;color:white;
        box-shadow:0 0 80px rgba(34,211,238,0.25),0 24px 60px rgba(0,0,0,0.6);
        z-index:10000;pointer-events:auto;
        animation:tourBubbleIn 300ms ease forwards;
      `;
            bubble.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:6px;height:6px;border-radius:50%;background:#22d3ee;box-shadow:0 0 10px #22d3ee"></div>
            <span style="font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#22d3ee">${step.title}</span>
          </div>
          <button data-tour-btn="close" style="background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:16px;padding:0;line-height:1">✕</button>
        </div>
        <p style="font-size:13px;line-height:1.65;color:#d4d4d8;margin:0 0 20px 0">${step.description}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="display:flex;gap:5px;align-items:center">${dots}</div>
          <div style="display:flex;gap:8px">
            <button data-tour-btn="prev" style="padding:9px 18px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#a1a1aa;font-size:11px;font-weight:900;text-transform:uppercase;border-radius:12px;cursor:pointer;opacity:${stepIndex === 0 ? '.35' : '1'};pointer-events:${stepIndex === 0 ? 'none' : 'auto'}">← Back</button>
            <button data-tour-btn="next" style="padding:9px 18px;background:linear-gradient(to right,#22d3ee,#06b6d4);color:#03020a;font-size:11px;font-weight:900;text-transform:uppercase;border-radius:12px;border:none;cursor:pointer;box-shadow:0 0 24px rgba(34,211,238,0.4)">${stepIndex === TOUR_STEPS.length - 1 ? "Got it →" : "Next →"}</button>
          </div>
        </div>
      `;
            document.body.appendChild(bubble);

            bubble.querySelector("[data-tour-btn='close']")?.addEventListener("click", finish);
            bubble.querySelector("[data-tour-btn='prev']")?.addEventListener("click", () => {
                if (stepIndex > 0) { stepIndex--; render(); }
            });
            bubble.querySelector("[data-tour-btn='next']")?.addEventListener("click", () => {
                stepIndex < TOUR_STEPS.length - 1 ? (stepIndex++, render()) : finish();
            });

            const onKey = (e: KeyboardEvent) => {
                if (e.key === "Escape") { finish(); document.removeEventListener("keydown", onKey); }
                if (e.key === "ArrowRight") bubble.querySelector<HTMLButtonElement>("[data-tour-btn='next']")?.click();
                if (e.key === "ArrowLeft") bubble.querySelector<HTMLButtonElement>("[data-tour-btn='prev']")?.click();
            };
            document.addEventListener("keydown", onKey);

}, 800);
    }

    render();
}

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

    function getGoalText(goal: Goal | null) {
        if (!goal) return "Build the thing you keep dodging";
        const value = goal as unknown as { title?: string; name?: string; description?: string; goal_text?: string; target?: string };
        return value.title || value.name || value.goal_text || value.target || value.description || "Build the thing you keep dodging";
    }

    function getCheckInEffort(checkIn: CheckIn) {
        const value = checkIn as unknown as { effort_score?: number; effort?: number; score?: number };
        return Math.max(1, Math.min(10, Number(value.effort_score ?? value.effort ?? value.score ?? 5)));
    }

    function getCheckInNote(checkIn: CheckIn) {
        const value = checkIn as unknown as { note?: string; content?: string; text?: string; reflection?: string };
        return value.note || value.content || value.text || value.reflection || "Evidence logged.";
    }

    type EffortComparison = {
        thisWeek: number | null;
        lastWeek: number | null;
        delta: number | null;
    };

    function getCalendarWeekKey(date: Date) {
        const start = new Date(date.getFullYear(), 0, 1);
        return `${date.getFullYear()}-${Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)}`;
    }

    function getEffortComparison(checkIns: CheckIn[]): EffortComparison {
        const now = new Date();
        const previousWeek = new Date(now.getTime() - 7 * 86400000);
        const thisWeekKey = getCalendarWeekKey(now);
        const lastWeekKey = getCalendarWeekKey(previousWeek);
        const scoresByWeek = checkIns.reduce<Record<string, number[]>>((acc, checkIn) => {
            const createdDate = checkIn.created_at || new Date().toISOString(); const key = getCalendarWeekKey(new Date(createdDate));
            if (!acc[key]) acc[key] = [];
            acc[key].push(getCheckInEffort(checkIn));
            return acc;
        }, {});
        const average = (scores?: number[]) => (scores?.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null);
        const thisWeekScore = average(scoresByWeek[thisWeekKey]);
        const lastWeekScore = average(scoresByWeek[lastWeekKey]);

        return {
            thisWeek: thisWeekScore,
            lastWeek: lastWeekScore,
            delta: thisWeekScore !== null && lastWeekScore !== null ? thisWeekScore - lastWeekScore : null,
        };
    }

    function EffortComparisonCard({ comparison }: { comparison: EffortComparison }) {
        const hasBothWeeks = comparison.thisWeek !== null && comparison.lastWeek !== null && comparison.delta !== null;
        const indicator = !hasBothWeeks ? "→" : comparison.delta! > 0 ? "↑" : comparison.delta! < 0 ? "↓" : "→";
        const indicatorClass = !hasBothWeeks
            ? "text-zinc-400"
            : comparison.delta! > 0
                ? "text-emerald-300"
                : comparison.delta! < 0
                    ? "text-red-300"
                    : "text-yellow-200";
        const message = !hasBothWeeks
            ? "Log what happened and last week to unlock the comparison."
            : comparison.delta! > 0
                ? `Up ${Math.abs(comparison.delta!)} from last week. Momentum is visible.`
                : comparison.delta! < 0
                    ? `Down ${Math.abs(comparison.delta!)} from last week. Adjust, don't disappear.`
                    : "Same as last week. Stable beats imaginary.";

        return (
            <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-zinc-500">This week vs last week</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-4xl font-black tracking-[-0.08em] text-white">{comparison.thisWeek ?? "—"}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">This week</p>
                    </div>
                    <div className={`pb-5 text-4xl font-black ${indicatorClass}`}>{indicator}</div>
                    <div className="text-right">
                        <p className="text-4xl font-black tracking-[-0.08em] text-zinc-500">{comparison.lastWeek ?? "—"}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Last week</p>
                    </div>
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-zinc-400">{message}</p>
            </article>
        );
    }

    function computeShareStats(checkIns: CheckIn[]) {
        const sorted = [...checkIns].sort((a, b) => new Date(a.created_at || new Date().toISOString()).getTime() - new Date(b.created_at || new Date().toISOString()).getTime());
        const uniqueWeeks = new Set(sorted.map((item) => {
            const date = new Date(item.created_at || new Date().toISOString());
            const start = new Date(date.getFullYear(), 0, 1);
            return `${date.getFullYear()}-${Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)}`;
        }));
        const weeksActive = uniqueWeeks.size;
        const averageEffort = sorted.length ? sorted.reduce((sum, item) => sum + getCheckInEffort(item), 0) / sorted.length : 0;
        const score = Math.min(999, Math.round(weeksActive * 22 + averageEffort * 18 + sorted.length * 7));

        let streak = 0;
        let cursor = new Date();
        for (let i = 0; i < 26; i += 1) {
            const weekKey = `${cursor.getFullYear()}-${Math.ceil(((cursor.getTime() - new Date(cursor.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(cursor.getFullYear(), 0, 1).getDay() + 1) / 7)}`;
            if (!uniqueWeeks.has(weekKey)) break;
            streak += 1;
            cursor = new Date(cursor.getTime() - 7 * 86400000);
        }

        return { score, streak, weeksActive };
    }

    function buildSpiralSummary(goalText: string, stats: { score: number; streak: number; weeksActive: number }) {
        if (stats.streak >= 4) return `${stats.streak} weeks logged for ${goalText}. The proof is starting to pile up.`;
        if (stats.score >= 220) return `Chaotic but consistent — the pattern is getting louder every week.`;
        if (stats.weeksActive >= 3) return `A scrappy builder spiral: imperfect, visible, and very much alive.`;
        return `Early spiral formation: dodging less, logging more, momentum waking up.`;
    }

    function createShareSnapshot(goal: Goal | null, checkIns: CheckIn[]): SpiralShareSnapshot {
        const goalText = getGoalText(goal);
        const stats = computeShareStats(checkIns);
        return {
            id: `spiral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            goal: goalText,
            ...stats,
            summary: buildSpiralSummary(goalText, stats),
            timeline: [...checkIns]
                .sort((a, b) => new Date(a.created_at || new Date().toISOString()).getTime() - new Date(b.created_at || new Date().toISOString()).getTime())
                .slice(-18)
                .map((item) => ({ date: item.created_at || new Date().toISOString(), effort: getCheckInEffort(item), note: getCheckInNote(item) })),
            createdAt: new Date().toISOString(),
        };
    }

    function shareCardSvg(snapshot: SpiralShareSnapshot) {
        const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const goal = escape(snapshot.goal.length > 62 ? `${snapshot.goal.slice(0, 59)}...` : snapshot.goal);
        const summary = escape(snapshot.summary.length > 88 ? `${snapshot.summary.slice(0, 85)}...` : snapshot.summary);
        return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <radialGradient id="g1" cx="30%" cy="20%" r="80%"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.55"/><stop offset="0.45" stop-color="#7c3aed" stop-opacity="0.28"/><stop offset="1" stop-color="#05030b"/></radialGradient>
      <linearGradient id="line" x1="0" x2="1"><stop stop-color="#22d3ee"/><stop offset="0.5" stop-color="#a78bfa"/><stop offset="1" stop-color="#f0abfc"/></linearGradient>
    </defs>
    <rect width="1200" height="675" fill="#05030b"/>
    <rect width="1200" height="675" fill="url(#g1)"/>
    <g opacity="0.12" stroke="#ffffff"><path d="M0 120H1200M0 240H1200M0 360H1200M0 480H1200M0 600H1200M120 0V675M240 0V675M360 0V675M480 0V675M600 0V675M720 0V675M840 0V675M960 0V675M1080 0V675"/></g>
    <rect x="56" y="56" width="1088" height="563" rx="44" fill="#07051a" fill-opacity="0.74" stroke="#ffffff" stroke-opacity="0.14"/>
    <text x="96" y="126" fill="#67e8f9" font-family="Arial, sans-serif" font-size="28" font-weight="900" letter-spacing="8"></text>
    <text x="96" y="248" fill="#ffffff" font-family="Arial, sans-serif" font-size="58" font-weight="900">${goal}</text>
    <text x="96" y="318" fill="#d4d4d8" font-family="Arial, sans-serif" font-size="28" font-weight="700">${summary}</text>
    <rect x="96" y="390" width="1008" height="150" rx="30" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.12"/>
    <text x="150" y="452" fill="#22d3ee" font-family="Arial, sans-serif" font-size="24" font-weight="900"> SCORE</text>
    <text x="150" y="508" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="900">${snapshot.score}</text>
    <text x="500" y="452" fill="#c4b5fd" font-family="Arial, sans-serif" font-size="24" font-weight="900">STREAK</text>
    <text x="500" y="508" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="900">${snapshot.streak}w</text>
    <text x="800" y="452" fill="#f0abfc" font-family="Arial, sans-serif" font-size="24" font-weight="900">WEEKS ACTIVE</text>
    <text x="800" y="508" fill="#ffffff" font-family="Arial, sans-serif" font-size="54" font-weight="900">${snapshot.weeksActive}</text>
    <path d="M96 578 C 260 500, 360 630, 530 548 S 820 514, 1104 584" fill="none" stroke="url(#line)" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
  </svg>`;
    }

    function buildLocalCoachReply(message: string, goal: Goal | null, currentWeek: number, checkIns: CheckIn[]) {
        const goalText = getGoalText(goal);
        const recentNotes = checkIns.slice(0, 3).map(getCheckInNote).filter(Boolean);
        const lower = message.toLowerCase();
        const stats = computeShareStats(checkIns);
        const evidence = recentNotes.length ? `Your recent evidence: ${recentNotes.join(" / ")}.` : "You do not need a dramatic reset; you need one visible receipt.";

        if (lower.includes("stuck") || lower.includes("overwhelm") || lower.includes("can't") || lower.includes("cannot")) {
            return `You are not stuck, you are negotiating with the task. For ${goalText}, make the next move insultingly small: 10 minutes, one draft, one rep, one message. ${evidence} Week ${currentWeek} only needs proof, not theatre.`;
        }

        if (lower.includes("motivat") || lower.includes("discipline") || lower.includes("focus")) {
            return `For ${goalText}, pick one action you can do while tired. Then log it before you talk yourself out of it. Logged weeks: ${stats.streak}.`;
        }

        if (lower.includes("plan") || lower.includes("what should") || lower.includes("next")) {
            return `Here is the plan: 1) choose the smallest useful action for ${goalText}, 2) timebox it to 25 minutes, 3) log what happened without polishing the story. ${evidence} The spiral grows from receipts, not intentions.`;
        }

        return `For ${goalText}, your next best move is boring and specific: do one measurable action this week, then log it. ${evidence} Ask me for a plan, motivation, or help getting unstuck and I will keep it sharp.`;
    }

    function DashboardInner({
        session,
    }: {
        session: SpiralSession;
    }) {
        const router = useRouter();
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";  // add this


        const replayOnboardingTour = useCallback(() => {
            if (typeof window === "undefined") return;
            const userId = session?.user?.id;
            if (!userId) {
                console.error("No user ID for tour");
                return;
            }
            try {
                const storageKey = `spiral-onboarding-tour-complete:${userId}`;
                window.localStorage.removeItem(storageKey);
                startOnboardingTour(userId);
            } catch (err) {
                console.error("Tour failed:", err);
            }
        }, [session?.user?.id]);

        const [goal, setGoal] = useState<Goal | null>(null);
        const [weeklyReflection, setWeeklyReflection] = useState<WeeklyReflection | null>(null);
        const [weeklyReflectionLoading, setWeeklyReflectionLoading] = useState(false);
        const [reflectionRefreshKey, setReflectionRefreshKey] = useState(0);

        const dashboardCacheKey = `spiral-dashboard:${session.user.id}`;
        const cachedDashboard = (() => {
            if (typeof window === "undefined") return null;
            try {
                const cached = window.sessionStorage.getItem(dashboardCacheKey);
                return cached ? (JSON.parse(cached) as { goal: Goal | null; milestones: Milestone[]; checkIns: CheckIn[] }) : null;
            } catch {
                return null;
            }
        })();
        const [milestones, setMilestones] = useState<Milestone[]>(cachedDashboard?.milestones ?? []);
        const [checkIns, setCheckIns] = useState<CheckIn[]>(cachedDashboard?.checkIns ?? []);
        const effortComparison = useMemo(() => getEffortComparison(checkIns), [checkIns]);
        const [loading, setLoading] = useState(!cachedDashboard);
        const [refreshing, setRefreshing] = useState(Boolean(cachedDashboard));
        const [error, setError] = useState("");
        const [modalOpen, setModalOpen] = useState(false);
        const [logText, setLogText] = useState("");
        const [effortScore, setEffortScore] = useState(5);
        const [selectedMood, setSelectedMood] = useState<WeeklyMood>("Focused");
        const [savingCheckIn, setSavingCheckIn] = useState(false);
        const [checkInError, setCheckInError] = useState("");
        const [pepTalk, setPepTalk] = useState("");
        const [pepTalkMomentOpen, setPepTalkMomentOpen] = useState(false);
        const [autopsyGoal, setAutopsyGoal] = useState<{ goal: Goal | null; checkIns: CheckIn[] } | null>(null);
        const [archiving, setArchiving] = useState(false);
        const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
        const [soundtrackSettings, setSoundtrackSettings] = useState<SoundtrackSettings>(() => readSoundtrackSettings());
        const [coachInput, setCoachInput] = useState("");
        const [coachLoading, setCoachLoading] = useState(false);
        const [coachTyping, setCoachTyping] = useState(false);
        const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([
            {
                role: "coach",
                content:
                    "Hey. I'm your Spiral Coach. I see your pattern — the good weeks, the bad ones, the ones where you just barely showed up. That's all data. Ask me anything about your goal, or vent. I'll keep it real.",
            },
        ]);
        const [motivationalLine] = useState(() => MOTIVATIONAL_LINES[Math.floor(Math.random() * MOTIVATIONAL_LINES.length)]);
        const [referralCount, setReferralCount] = useState(0);
        const [shareSnapshot, setShareSnapshot] = useState<SpiralShareSnapshot | null>(null);
        const [copiedShare, setCopiedShare] = useState(false);
        const [shareOpen, setShareOpen] = useState(false);
        const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
        const [chaosMode, setChaosMode] = useState(false);
        const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number; opacity: number; hue: number }>>([]);
        const animationFrameRef = useRef<number | null>(null);
        const lastTimeRef = useRef<number>(0);

        useEffect(() => {
            if (!chaosMode) {
                setParticles([]);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                return;
            }

            const initialParticles = Array.from({ length: 30 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 4 + 1,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.5 + 0.2,
                hue: Math.random() * 60 + 160,
            }));
            setParticles(initialParticles);

            const animate = (time: number) => {
                if (time - lastTimeRef.current > 16) {
                    lastTimeRef.current = time;
                    setParticles((prev) =>
                        prev.map((p) => ({
                            ...p,
                            y: (p.y - p.speed + 100) % 100,
                            x: (p.x + Math.sin(time * 0.001 + p.id) * 0.1 + 100) % 100,
                            opacity: 0.2 + Math.sin(time * 0.003 + p.id * 0.5) * 0.3,
                        }))
                    );
                }
                animationFrameRef.current = requestAnimationFrame(animate);
            };

            animationFrameRef.current = requestAnimationFrame(animate);

            return () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
            };
        }, [chaosMode]);

        useEffect(() => {
            if (typeof window === "undefined") return;
            const storageKey = "spiral-dashboard-welcome-seen";
            if (window.localStorage.getItem(storageKey)
                !== "true") {
                setShowWelcomeBanner(true);
            }
        }, []);

        const closeWelcomeBanner = useCallback(() => {
            if (typeof window !== "undefined") {
                window.localStorage.setItem("spiral-dashboard-welcome-seen", "true");
            }
            setShowWelcomeBanner(false);
        }, []);
        const [coachOpen, setCoachOpen] = useState(false);
        const COACH_DISABLED = false;

        const shareUrl = useMemo(() => {
            if (!shareSnapshot || typeof window === "undefined") return "";
            const productionOrigin = "https://spiralchaosbgrj.prettiflow.com";
            const origin = window.location.origin.includes("e2b.app") ? productionOrigin : window.location.origin;
            return `${origin}/share/${shareSnapshot.id}`;
        }, [shareSnapshot]);

        const openShareCard = useCallback(async () => {
            if (typeof window === "undefined") return;

            const goalText = getGoalText(goal);
            const stats = computeShareStats(checkIns);
            const snapshot: SpiralShareSnapshot = {
                id: `spiral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                goal: goalText,
                score: stats.score,
                streak: stats.streak,
                weeksActive: stats.weeksActive,
                summary: buildSpiralSummary(goalText, stats),
                timeline: [...checkIns]
                    .sort((a, b) => new Date(b.created_at || new Date().toISOString()).getTime() - new Date(a.created_at || new Date().toISOString()).getTime())
                    .slice(0, 8)
                    .map((item) => ({
                        date: item.created_at || new Date().toISOString(),
                        effort: getCheckInEffort(item),
                        note: getCheckInNote(item),
                    })),
                createdAt: new Date().toISOString(),
            };
            const shareUrl = `${window.location.origin}/share/${snapshot.id}`;
            window.localStorage.setItem(`spiral-share:${snapshot.id}`, JSON.stringify(snapshot));
            window.localStorage.setItem("spiral-latest-share-id", snapshot.id);
            setShareSnapshot(snapshot);
            try {
              await fetch(`${API_BASE_URL}/api/shares`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: snapshot.id,
                  goal: snapshot.goal,
                  summary: snapshot.summary,
                  score: snapshot.score,
                  streak: snapshot.streak,
                  weeks_active: snapshot.weeksActive,
                  timeline: snapshot.timeline,
                }),
              });
            } catch { }
            setShareOpen(true);
            document.body.style.overflow = "hidden";

            try {
                await fetchWithTimeout(`${API_BASE_URL}/api/share`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: snapshot.id, data: snapshot }),
                });
            } catch (error) {
                console.error("Failed to save public share snapshot", error);
            }

            void copyTextToClipboard(shareUrl)
                .catch(() => undefined)
                .then(() => setCopiedShare(true));
            window.setTimeout(() => setCopiedShare(false), 2000);
            return;

            // Reuse the existing snapshot created earlier in this scope.
            if (typeof window !== "undefined") {
                window.localStorage.setItem(`spiral-public-share:${snapshot.id}`, JSON.stringify(snapshot));
                window.localStorage.setItem("spiral-latest-share", snapshot.id);
            }
            setShareSnapshot(snapshot);
            setShareOpen(true);
        }, [goal, checkIns]);

        const copyShareLink = useCallback(async () => {
            if (!shareUrl) return;
            try {
                await copyTextToClipboard(shareUrl);
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = shareUrl;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopiedShare(true);
            window.setTimeout(() => setCopiedShare(false), 2000);
        }, [shareUrl]);

        const sendCoachMessage = useCallback(async () => {
            const question = coachInput.trim();
            if (!question || coachLoading) return;

            const userMessage: CoachMessage = { role: "user", content: question };
            setCoachMessages((messages) => [...messages, userMessage]);
            setCoachInput("");
            setCoachLoading(true);
           const recent = checkIns
                .slice(0, 5)
                .map((checkIn) => `Week ${checkIn.week_number}: effort ${checkIn.effort_score}/10 — ${checkIn.log_text}`)
                .join("\n");
            const context = `Goal: ${goal?.goal_text || "No active goal"}\nCurrent week: ${currentWeek}\nLogged weeks: ${streak}\nRecent check-ins:\n${recent || "No check-ins yet."}`;

            try {
                    const response = await fetchWithTimeout(`${API_BASE_URL}/api/coach`, {
                        method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
                    },
                    body: JSON.stringify({
                        message: question,
                        context,
                        tone: "Raw Spiral tone: honest, direct, useful, no motivational poster language.",
                    }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(data?.error || "coach unavailable");
                setCoachMessages((messages) => [
    ...messages,
    { role: "coach", content: data.text || data.reply || data.message || "The coach came back empty. That is also a signal: simplify the next move." },
]);
            } catch {
                const averageEffort = checkIns.length
                    ? Math.round((checkIns.reduce((sum, checkIn) => sum + (checkIn.effort_score || 0), 0) / checkIns.length) * 10) / 10
                    : 0;
                setCoachMessages((messages) => [
                    ...messages,
                    {
                        role: "coach",
                        content: `Backend smoke. Here's the blunt read anyway: your goal is "${goal?.goal_text || "undefined"}", you're on week ${currentWeek}, logged weeks ${streak}, average effort ${averageEffort || "unknown"}. Pick the smallest action you can repeat while tired. If week 3 keeps eating you, stop designing week 3 for your best self. Design it for the version of you that's exhausted.on of you that wants to disappear.`,
                    },
                ]);
            } finally {
                setCoachTyping(true);
                 setCoachLoading(false);
                setCoachTyping(false);
            }
        }, [API_BASE_URL, checkIns, coachInput, coachLoading, goal?.created_at, goal?.goal_text, session?.token]);

        const downloadShareImage = useCallback(() => {
            if (!shareSnapshot || typeof window === "undefined") return;
            const blob = new Blob([shareCardSvg(shareSnapshot)], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "spiral-share-card.svg";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }, [shareSnapshot]);

        useEffect(() => {
            const updateReferralCount = () => {
                try {
                    const referrals = JSON.parse(window.localStorage.getItem(`spiral-referrals:${session.user.id}`) || "[]") as unknown[];
                    setReferralCount(referrals.length);
                } catch {
                    setReferralCount(0);
                }
            };

            updateReferralCount();
            window.addEventListener("storage", updateReferralCount);
            window.addEventListener("spiral-referrals-change", updateReferralCount);
            return () => {
                window.removeEventListener("storage", updateReferralCount);
                window.removeEventListener("spiral-referrals-change", updateReferralCount);
            };
        }, [session.user.id]);

        useEffect(() => {
            const handleStorage = () => setSoundtrackSettings(readSoundtrackSettings());
            window.addEventListener("storage", handleStorage);
            window.addEventListener("spiral-soundtrack-change", handleStorage);
            return () => {
                window.removeEventListener("storage", handleStorage);
                window.removeEventListener("spiral-soundtrack-change", handleStorage);
            };
        }, []);

        useEffect(() => startAmbientSoundtrack(soundtrackSettings), [soundtrackSettings]);


        useEffect(() => {
            let cancelled = false;

            async function refreshDashboard() {
                setRefreshing(true);
                try {
                    const activeGoal = await getActiveGoal(session);
                    if (cancelled) return;
                    if (!activeGoal) {
                        window.sessionStorage.removeItem(dashboardCacheKey);
                        router.replace("/onboarding");
                        return;
                    }

                    setGoal(activeGoal);
                    setLoading(false);

                    const [goalMilestones, goalCheckIns] = await Promise.all([
                        getMilestones(session, activeGoal.id),
                        getCheckIns(session, activeGoal.id),
                    ]);
                    if (cancelled) return;
                    setMilestones(goalMilestones);
                    setCheckIns(goalCheckIns);
                    window.sessionStorage.setItem(
                        dashboardCacheKey,
                        JSON.stringify({ goal: activeGoal, milestones: goalMilestones, checkIns: goalCheckIns }),
                    );
                } catch (err) {
                    if (!cancelled) setError(err instanceof Error ? err.message : "Dashboard tripped over its own shoes.");
                } finally {
                    if (!cancelled) {
                        setLoading(false);
                        setRefreshing(false);
                    }
                }
            }

            refreshDashboard();

            return () => {
                cancelled = true;
            };
        }, [dashboardCacheKey, router, session]);

        async function logout() {
            await signOut();
            router.push("/");
        }

        async function handleArchive() {
            setAutopsyGoal({ goal, checkIns });
            return;
        }

        async function handleArchiveConfirm() {
            if (!goal) return;
            setArchiving(true);
            setError("");
            try {
                await archiveGoal(session, goal.id);
                router.push("/archive");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Archive failed. The goal is clinging to life.");
                setArchiving(false);
            }
        }

        async function generatePepTalk(text: string, effort: number) {
            const trimmed = text.trim();

            if (effort === 10) {
                return "That's the chaos we needed. The spiral is alive.";
            }

            if (effort === 1) {
                return "You showed up. In a world of people who quit, that's actually enough.";
            }

            const response = await fetch("/api/pep-talk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logText: trimmed, effortScore: effort }),
            }).catch(() => null);

            if (response?.ok) {
                const data = (await response.json()) as { pepTalk?: string };
                if (data.pepTalk) return data.pepTalk;
            }

            const detail = trimmed.length > 80 ? "You brought receipts, not vibes, and that gives the spiral something real to chew on." : "The log is short, but it is still evidence instead of fog.";

            if (effort <= 3) {
                return `${detail} Low effort is information, not a verdict: something blocked the machine this week. Name the block, then make next week smaller, sharper, and harder to dodge.`;
            }

            if (effort >= 8) {
                return `${detail} That was high-voltage chaos with fingerprints on it. Keep the pressure weird, loud, and measurable before your brain tries to domesticate it.`;
            }

            return `${detail} Middle effort counts when it leaves tracks. Pick one ugly lever from what you wrote and pull it again before the week gets slippery.`;
        }

        async function submitCheckIn() {
            if (!goal) return;

            const trimmedLogText = logText.trim();
            if (!trimmedLogText) {
                setCheckInError("Tell us what happened this week. Even one sentence.");
                return;
            }

            const alreadyLogged = checkIns.some((c) => c.week_number === currentWeek);
            if (alreadyLogged) {
                setCheckInError("You already logged this week. Come back next week.");
                return;
            }

            setSavingCheckIn(true);
            setCheckInError("");
            try {
                const saved = await createCheckIn(session, {
                    goal_id: goal.id,
                    week_number: currentWeek,
                    log_text: trimmedLogText,
                    effort_score: effortScore,
                });
                setCheckIns((existing) => [...existing.filter((item) => item.week_number !== currentWeek), saved].sort((a, b) => a.week_number - b.week_number));
                triggerCheckInConfetti();
                setModalOpen(false);
                setPepTalk("Reading the wreckage...");
                setPepTalkMomentOpen(true);
                const generatedPepTalk = await generatePepTalk(trimmedLogText, effortScore);
                setPepTalk(generatedPepTalk);
                setLogText("");
                setEffortScore(5);
            } catch (err) {
                setCheckInError(err instanceof Error ? err.message : "The log refused to save. Rude. Try again.");
            } finally {
                setSavingCheckIn(false);
            }
        }

        const goalCreatedAt = goal?.created_at ? new Date(goal.created_at) : goal ? new Date(`${goal.start_date}T00:00:00`) : new Date();
        const goalStartTime = Number.isNaN(goalCreatedAt.getTime()) ? Date.now() : goalCreatedAt.getTime();
        const elapsedDays = Math.max(0, Math.floor((Date.now() - goalStartTime) / 86400000));
        const currentWeek = Math.min(26, Math.floor(elapsedDays / 7) + 1);
        const currentMonth = Math.min(6, Math.floor((currentWeek - 1) / 4) + 1);
        const currentMonthMilestone = milestones.find((item) => item.type === "monthly" && item.month_number === currentMonth);
        const currentWeeklyAction = milestones.find((item) => item.type === "weekly" && item.week_number === ((currentWeek - 1) % 4) + 1);
        const loggedWeeks = new Map(checkIns.map((checkIn) => [checkIn.week_number, checkIn]));
        const weeksElapsed = currentWeek;
        const completedWeeks = Math.max(0, currentWeek - 1);
        const weeksActive = new Set(checkIns.filter((checkIn) => checkIn.week_number <= currentWeek).map((checkIn) => checkIn.week_number)).size;

        // Streak calculation
        const streak = (() => {
            let count = 0;
            for (let w = currentWeek - 1; w >= 1; w--) {
                if (loggedWeeks.has(w)) count++;
                else break;
            }
            return count;
        })();
        const streakFlameLevel = streak >= 12 ? "Inferno" : streak >= 8 ? "Blaze" : streak >= 4 ? "Flame" : streak >= 1 ? "Spark" : "Ember";
        const streakFlameSize = streak >= 12 ? "text-7xl" : streak >= 8 ? "text-6xl" : streak >= 4 ? "text-5xl" : streak >= 1 ? "text-4xl" : "text-3xl";
        const streakFlameGlow = streak >= 12
            ? "border-red-300/40 bg-red-500/15 shadow-red-500/40"
            : streak >= 8
                ? "border-orange-300/40 bg-orange-500/15 shadow-orange-500/35"
                : streak >= 4
                    ? "border-amber-300/40 bg-amber-400/15 shadow-amber-400/30"
                    : streak >= 1
                        ? "border-yellow-300/30 bg-yellow-300/10 shadow-yellow-300/25"
                        : "border-zinc-500/20 bg-zinc-500/10 shadow-black/30";
        const streakFlameVisual = (
            <div className={`relative flex min-h-36 flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-5 text-center shadow-2xl ${streakFlameGlow}`} aria-label={`Logged weeks: ${streak}, ${streakFlameLevel}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.28),transparent_35%),radial-gradient(circle_at_50%_75%,rgba(239,68,68,0.18),transparent_45%)]" />
                <div className={`relative drop-shadow-[0_0_24px_rgba(251,146,60,0.75)] transition-all duration-500 ${streakFlameSize}`}>🔥</div>
                <p className="relative mt-3 text-3xl font-black tracking-[-0.05em] text-white">{streak}</p>
                <p className="relative text-[0.65rem] font-black uppercase tracking-[0.24em] text-orange-100">{streakFlameLevel} log</p>
                <p className="relative mt-2 text-xs font-bold text-zinc-300">The flame grows as consecutive logged weeks stack.</p>
            </div>
        );
        useEffect(() => {
            let cancelled = false;
            setWeeklyReflectionLoading(true);
            const reflection = generateWeeklyReflectionPrompt(goal, currentWeek, streak, checkIns);
            if (!cancelled) setWeeklyReflection(reflection);
            setWeeklyReflectionLoading(false);
            return () => {
                cancelled = true;
            };
        }, [goal, currentWeek, streak, checkIns, reflectionRefreshKey]);

        const completedLoggedWeeks = new Set(checkIns.filter((checkIn) => checkIn.week_number <= completedWeeks).map((checkIn) => checkIn.week_number)).size;
        const weeksMissed = Math.max(0, completedWeeks - completedLoggedWeeks);
        const streakAnchorWeek = loggedWeeks.has(currentWeek) ? currentWeek : completedWeeks;
        let currentStreak = 0;
        for (let week = streakAnchorWeek; week >= 1; week -= 1) {
            if (!loggedWeeks.has(week)) break;
            currentStreak += 1;
        }
        const streakBroken = completedWeeks > 0 && !loggedWeeks.has(completedWeeks);

        const spiralEnergyScore = useMemo(() => {
            if (checkIns.length === 0) return 8;
            const loggedWeeksCount = new Set(checkIns.map((checkIn) => checkIn.week_number)).size;
            const consistency = Math.min(1, loggedWeeksCount / Math.max(1, currentWeek)) * 42;
            const averageEffort = checkIns.reduce((sum, checkIn) => sum + (checkIn.effort_score || 0), 0) / checkIns.length;
            const effort = Math.min(1, averageEffort / 10) * 38;
            const lastLoggedWeek = Math.max(...checkIns.map((checkIn) => checkIn.week_number));
            const recency = Math.max(0, 1 - Math.max(0, currentWeek - lastLoggedWeek) / 4) * 20;
            return Math.max(0, Math.min(100, Math.round(consistency + effort + recency)));
        }, [checkIns, currentWeek]);

        const spiralEnergyLabel = spiralEnergyScore < 25 ? "Low but alive" : spiralEnergyScore < 55 ? "Building momentum" : spiralEnergyScore < 80 ? "On fire" : "Unstoppable";
        const spiralScore = currentWeek ? Math.round((weeksActive / currentWeek) * 100) : 0;
        const hasHitSixMonths = currentWeek >= 26;

        return (
            <main className="min-h-screen w-full overflow-x-hidden bg-[#03020a] px-4 pb-28 pt-6 text-white sm:px-10 sm:py-10">
                <div className="mx-auto max-w-5xl">

                    <div className="mb-6 flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={openShareCard}
                            className="flex items-center gap-1.5 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200 transition hover:bg-fuchsia-300/20 active:scale-95">
                            <Share2 className="h-3 w-3" />
                            Share
                        </button>
                        <button type="button" onClick={replayOnboardingTour}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 transition hover:border-white/25 hover:text-zinc-300">
                            <HelpCircle className="h-3 w-3" />
                            Tour
                        </button>
                        <button onClick={(e) => { navigator.clipboard.writeText(session.user.id); const btn = e.currentTarget; btn.textContent = "Copied ✓"; setTimeout(() => { btn.textContent = "Copy My ID"; }, 2000); }}
                            className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/25 hover:text-zinc-200">
                            Copy My ID
                        </button>
                        <div className="flex items-center gap-1.5 rounded-xl border border-orange-400/25 bg-orange-400/10 px-3 py-1.5">
                            <span className="text-sm">🔥</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">{streakFlameLevel} · {currentStreak} week{currentStreak === 1 ? "" : "s"}</span>
                        </div>
                    </div>
                    {loading && !goal && <DashboardSkeleton />}
                    {!loading && goal && checkIns.length === 0 && <WeekOneOnboardingChecklist />}
                    {!loading && goal && <WallIntervention goal={goal} checkIns={checkIns} />}
                    {!loading && goal && (
                        <>
                            <SpiralDna goal={goal} checkIns={checkIns} />
                        </>
                    )}
                    {showWelcomeBanner && !loading && (
                        <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-300/15 via-fuchsia-400/10 to-white/[0.04] p-5 shadow-2xl shadow-cyan-950/30 sm:p-7">
                            <button
                                type="button"
                                onClick={closeWelcomeBanner}
                                className="absolute right-4 top-4 min-h-12 min-w-12 rounded-2xl border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                                aria-label="Dismiss welcome banner"
                            >
                                ×
                            </button>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">First spiral</p>
                            <h2 className="mt-3 max-w-3xl text-3xl font-black uppercase leading-none tracking-[-0.05em] text-white sm:text-5xl">
                                Week 1. The spiral starts now.
                            </h2>
                            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-zinc-200 sm:text-lg">
                                Set your goal, get your first micro-action, log what happens. That&apos;s it.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    closeWelcomeBanner();
                                    setModalOpen(true);
                                }}
                                className="mt-6 min-h-12 animate-pulse rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-black uppercase text-[#05030b] shadow-lg shadow-cyan-400/30 hover:bg-white"
                            >
                                Log your first week
                            </button>
                        </section>
                    )}
                    
                    {!loading && (
                        <section data-tour="spiral-energy" className="relative mb-8 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/40">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,211,238,0.08),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.08),transparent_50%)]" />
                            <div className="relative grid gap-0 lg:grid-cols-[1fr_auto]">
                                <div className="p-6 sm:p-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.55em] text-fuchsia-300">Spiral Energy</p>
                                    <div className="mt-4 flex items-end gap-4">
                                        <span className="text-6xl sm:text-8xl lg:text-9xl font-black leading-none tracking-[-0.08em] text-white">{spiralEnergyScore}</span>
                                        <span className="mb-3 text-2xl sm:text-3xl font-black text-zinc-600">/100</span>
                                    </div>
                                    <p className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]" style={{
                                        color: spiralEnergyScore >= 80 ? "#22d3ee" : spiralEnergyScore >= 55 ? "#a855f7" : spiralEnergyScore >= 25 ? "#f472b6" : "#ef4444"
                                    }}>{spiralEnergyLabel}</p>
                                    <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-zinc-400">
                                        Calculated from consistency, effort scores, and how recently you showed up. Log a week and watch it move.
                                    </p>
                                </div>
                                <div className="flex items-center justify-center p-4 sm:p-8">
                                    <div className="relative h-36 w-36 sm:h-48 sm:w-48">
                                        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                                            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                                            <circle cx="60" cy="60" r="44" fill="none"
                                                stroke={spiralEnergyScore >= 80 ? "#22d3ee" : spiralEnergyScore >= 55 ? "#a855f7" : spiralEnergyScore >= 25 ? "#f472b6" : "#ef4444"}
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={`${(spiralEnergyScore / 100) * 276.5} 276.5`}
                                                className="transition-all duration-1000 ease-out"
                                                style={{ filter: `drop-shadow(0 0 8px ${spiralEnergyScore >= 80 ? "#22d3ee" : spiralEnergyScore >= 55 ? "#a855f7" : "#f472b6"})` }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <p className="text-2xl font-black text-white">{spiralEnergyScore}</p>
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">/100</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {motivationalLine && (
                        <section className="mb-8 relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 p-7 backdrop-blur-xl">
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.04),transparent_50%,rgba(168,85,247,0.04))]" />
                            <div className="relative flex items-start gap-5">
                                <div className="shrink-0 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                                    <svg className="h-5 w-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.45em] text-cyan-300">Today's ugly truth</p>
                                    <p className="mt-2 text-xl font-black uppercase leading-tight tracking-[-0.03em] text-white sm:text-2xl">&ldquo;{motivationalLine}&rdquo;</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {refreshing && goal && (
                        <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-cyan-100">
                            Syncing fresh spiral data in the background...
                        </div>
                    )}
                    {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 font-bold text-red-100">{error}</div>}
                    {goal && (
                        <div className="space-y-6">
                            <EffortComparisonCard comparison={effortComparison} />


                            <section data-tour="goal-card" className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/40">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.06),transparent_50%)]" />

                                {/* Top bar */}
                                <div className="relative border-b border-white/[0.06] px-6 py-5 sm:px-8">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.45em] text-cyan-300">Your six-month target</p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-300/10 px-4 py-2">
                                                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-300" />
                                                <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">{Math.max(0, 182 - elapsedDays)} days left</span>
                                            </div>
                                            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2">
                                                <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Week {currentWeek}<span className="text-zinc-600">/26</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative grid gap-0 lg:grid-cols-[1fr_280px]">
                                    {/* Goal text */}
                                    <div className="p-6 sm:p-8">
                                        <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-6xl">{goal.goal_text}</h1>

                                        {/* Progress bar */}
                                        <div className="mt-8">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">
                                                <span>Progress</span>
                                                <span>{Math.round((elapsedDays / 182) * 100)}% of 6 months</span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 transition-all duration-700"
                                                    style={{ width: `${Math.min(100, Math.round((elapsedDays / 182) * 100))}%` }} />
                                            </div>
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-3">
                                            <button onClick={(e) => { e.stopPropagation(); handleArchive(); }} disabled={archiving}
                                                className="rounded-full border border-purple-300/30 bg-purple-500/10 px-5 py-2.5 text-xs font-black uppercase text-purple-100 transition hover:bg-purple-500/20 disabled:opacity-50">
                                                {archiving ? "Archiving..." : hasHitSixMonths ? "Six months done — archive it" : "Mark complete / archive"}
                                            </button>
                                            <button onClick={() => router.push("/settings")}
                                                className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-black uppercase text-zinc-400 transition hover:border-white/25 hover:text-white">
                                                Edit goal
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right: radial progress */}
                                    <div className="flex items-center justify-center border-t border-white/[0.06] p-8 lg:border-l lg:border-t-0">
                                        <div className="relative h-44 w-44">
                                            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                                                <circle cx="60" cy="60" r="50" fill="none"
                                                    stroke="url(#goalGradient)" strokeWidth="10" strokeLinecap="round"
                                                    strokeDasharray={`${Math.min(100, Math.round((elapsedDays / 182) * 100)) / 100 * 314.2} 314.2`}
                                                    className="transition-all duration-1000 ease-out" />
                                                <defs>
                                                    <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#22d3ee" />
                                                        <stop offset="50%" stopColor="#a855f7" />
                                                        <stop offset="100%" stopColor="#facc15" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <p className="text-3xl font-black text-white">{Math.round((elapsedDays / 182) * 100)}%</p>
                                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">of 6 months</p>
                                                <p className="mt-1 text-sm font-black text-cyan-300">W{currentWeek}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>


                            <section data-tour="milestones" className="grid gap-4 lg:grid-cols-2">
                                {/* Month milestone */}
                                <div className="relative overflow-hidden rounded-[2rem] border border-purple-300/20 bg-black/40 p-6 backdrop-blur-xl shadow-xl shadow-purple-950/20 sm:p-7">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.08),transparent_60%)]" />
                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-300/30 bg-purple-300/10 text-xs font-black text-purple-200">
                                                M{currentMonth}
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-purple-300">Month {currentMonth} milestone</p>
                                        </div>
                                        <h2 className="text-2xl font-black uppercase leading-tight tracking-[-0.04em] sm:text-3xl">
                                            {currentMonthMilestone?.milestone_text || "No milestone found. Keep moving anyway."}
                                        </h2>
                                        <div className="mt-5 h-px w-full bg-white/[0.06]" />
                                        <p className="mt-4 text-xs font-semibold text-zinc-500">
                                            {4 - ((currentWeek - 1) % 4)} week{4 - ((currentWeek - 1) % 4) === 1 ? "" : "s"} left in this month's cycle
                                        </p>
                                    </div>
                                </div>

                                {/* Weekly action */}
                                <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-black/40 p-6 backdrop-blur-xl shadow-xl shadow-cyan-950/20 sm:p-7">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.08),transparent_60%)]" />
                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xs font-black text-cyan-200">
                                                W{currentWeek}
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">This week's action</p>
                                        </div>
                                        <h2 className="text-2xl font-black uppercase leading-tight tracking-[-0.04em] sm:text-3xl">
                                            {currentWeeklyAction?.milestone_text || "Do one loud, measurable thing. Planning doesn't count."}
                                        </h2>
                                        <button data-tour="check-in-button"
                                            onClick={() => { if (checkIns.some((c) => c.week_number === currentWeek)) return; setPepTalk(""); setCheckInError(""); setModalOpen(true); }}
                                            disabled={checkIns.some((c) => c.week_number === currentWeek)}
                                            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 px-6 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_30px_rgba(34,211,238,0.25)] transition hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(34,211,238,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                                            {checkIns.some((c) => c.week_number === currentWeek) ? "Week logged ✓" : "Log this week →"}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section data-tour="week-grid" className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/30">
                                {/* Header */}
                                <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.45em] text-cyan-300">Your spiral</p>
                                            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em]">Progress, but make it messy.</h2>
                                        </div>
                                        {/* Stats row */}
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: "Active", value: weeksActive, color: "text-cyan-300 border-cyan-300/20 bg-cyan-300/10" },
                                                { label: "Missed", value: weeksMissed, color: "text-zinc-400 border-white/10 bg-white/[0.04]" },
                                                { label: "Streak", value: `${currentStreak}🔥`, color: "text-orange-300 border-orange-300/20 bg-orange-300/10" },
                                                { label: "Score", value: `${spiralScore}%`, color: "text-purple-300 border-purple-300/20 bg-purple-300/10" },
                                            ].map(({ label, value, color }) => (
                                                <div key={label} className={`rounded-xl border px-3 py-2 text-center ${color}`}>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">{label}</p>
                                                    <p className="text-base font-black">{value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Sparkline */}
                                {checkIns.length > 1 && (
                                    <div className="border-b border-white/[0.06] px-6 py-4 sm:px-8">
                                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Effort trend</p>
                                        <div className="h-12 w-full">
                                            <svg viewBox={`0 0 ${Math.max(checkIns.length * 20, 200)} 48`} preserveAspectRatio="none" className="h-full w-full">
                                                <defs>
                                                    <linearGradient id="sparkGrad" x1="0" x2="1" y1="0" y2="0">
                                                        <stop offset="0%" stopColor="#22d3ee" />
                                                        <stop offset="50%" stopColor="#a855f7" />
                                                        <stop offset="100%" stopColor="#facc15" />
                                                    </linearGradient>
                                                </defs>
                                                {checkIns.length > 1 && (
                                                    <polyline
                                                        fill="none"
                                                        stroke="url(#sparkGrad)"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        points={checkIns.map((c, i) => {
                                                            const x = (i / (checkIns.length - 1)) * (Math.max(checkIns.length * 20, 200) - 8) + 4;
                                                            const y = 44 - (Number(c.effort_score || 0) / 10) * 40;
                                                            return `${x},${y}`;
                                                        }).join(" ")}
                                                    />
                                                )}
                                                {checkIns.map((c, i) => {
                                                    const effort = Number(c.effort_score || 0);
                                                    const x = checkIns.length > 1 ? (i / (checkIns.length - 1)) * (Math.max(checkIns.length * 20, 200) - 8) + 4 : 100;
                                                    const y = 44 - (effort / 10) * 40;
                                                    const col = effort >= 9 ? "#facc15" : effort >= 7 ? "#22d3ee" : effort >= 5 ? "#a855f7" : effort >= 3 ? "#f472b6" : "#ef4444";
                                                    return <circle key={i} cx={x} cy={y} r="3" fill={col} />;
                                                })}
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {/* Streak broken banner */}
                                {streakBroken && (
                                    <div className="border-b border-orange-300/20 bg-orange-500/10 px-6 py-3 sm:px-8">
                                        <p className="text-xs font-bold text-orange-200">⚡ Streak broken. Spirals don't die from one miss — log this week and restart it.</p>
                                    </div>
                                )}

                                {/* Week grid */}
                                <div className="p-6 sm:p-8">
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: weeksElapsed }, (_, index) => {
                                            const week = index + 1;
                                            const checkIn = loggedWeeks.get(week);
                                            const effort = Number(checkIn?.effort_score || 0);
                                            const isCurrentWeek = week === currentWeek;
                                            const color = effort >= 9 ? "#facc15" : effort >= 7 ? "#22d3ee" : effort >= 5 ? "#a855f7" : effort >= 3 ? "#f472b6" : effort > 0 ? "#ef4444" : null;

                                            return (
                                                <div key={week} className="group relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => checkIn && setSelectedCheckIn(checkIn)}
                                                        disabled={!checkIn}
                                                        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-black transition-all duration-200 ${checkIn
                                                                ? "cursor-pointer hover:-translate-y-1 hover:scale-110"
                                                                : isCurrentWeek
                                                                    ? "cursor-pointer border-dashed border-cyan-300/40 bg-cyan-300/5 text-cyan-500 animate-pulse"
                                                                    : "cursor-default border-white/[0.08] bg-white/[0.03] text-zinc-700"
                                                            }`}
                                                        style={color ? {
                                                            backgroundColor: `${color}18`,
                                                            borderColor: `${color}50`,
                                                            color,
                                                            boxShadow: `0 0 12px ${color}30`,
                                                        } : undefined}
                                                    >
                                                        {checkIn ? effort : isCurrentWeek ? "+" : ""}
                                                    </button>

                                                    {/* Tooltip */}
                                                    {checkIn && (
                                                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0a0818] p-3 opacity-0 shadow-2xl transition-opacity duration-200 group-hover:opacity-100">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: color || "#fff" }}>Week {week} · {effort}/10</p>
                                                            {checkIn.log_text && (
                                                                <p className="mt-1 text-[10px] leading-4 text-zinc-400 line-clamp-3">{checkIn.log_text}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    <span className="mt-1 block text-center text-[8px] font-black uppercase text-zinc-600">W{week}</span>
                                                </div>
                                            );
                                        })}

                                        {/* Next week placeholder */}
                                        {weeksElapsed < 26 && !loggedWeeks.has(currentWeek) && (
                                            <div className="flex flex-col items-center">
                                                <button
                                                    onClick={() => { if (checkIns.some((c) => c.week_number === currentWeek)) return; setPepTalk(""); setCheckInError(""); setModalOpen(true); }}
                                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-dashed border-cyan-300/40 bg-cyan-300/[0.06] text-cyan-400 transition hover:border-cyan-300/70 hover:bg-cyan-300/10 text-lg">
                                                    +
                                                </button>
                                                <span className="mt-1 text-[8px] font-black uppercase text-cyan-600">Log</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {!loading && goal && (
                                <WeeklyReflectionCard
                                    reflection={weeklyReflection}
                                    loading={weeklyReflectionLoading}
                                    currentWeek={currentWeek}
                                    onRefresh={() => setReflectionRefreshKey((key) => key + 1)}
                                />
                            )}

                            <WreckagePlayback checkIns={checkIns} />

                            <SpiralManifesto goal={goal} checkIns={checkIns} />

                        </div>
                    )}
                </div>

                {pepTalkMomentOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#03020a] px-4 py-8">
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.18),transparent_40%)]" />
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px]" />
                        </div>

                        <div className="relative mx-auto max-w-2xl text-center">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2">
                                    <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300">Week {currentWeek} complete</p>
                                </div>
                            </div>

                            <h2 className="text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-6xl">The spiral<br />answers.</h2>

                            <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/50 p-6 text-left backdrop-blur-xl sm:p-8">
                                {pepTalk === "Reading the wreckage..." ? (
                                    <div className="flex items-center gap-4">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-cyan-300" />
                                        <p className="text-sm font-bold text-zinc-400">Reading the wreckage...</p>
                                    </div>
                                ) : (
                                    <p className="text-xl font-black leading-tight text-white sm:text-2xl">{pepTalk}</p>
                                )}
                            </div>

                            {/* Letter from past self */}
                            {checkIns.length > 0 && pepTalk !== "Reading the wreckage..." && (
                                <div className="mt-4 rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.06] p-6 text-left backdrop-blur-xl sm:p-8">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-300 mb-4">A letter from week 1 you</p>
                                    <p className="whitespace-pre-line text-sm font-semibold leading-7 text-amber-50/80">
                                        {generateWeeklyLetterFromPastSelf(goal, checkIns, effortScore, logText)}
                                    </p>
                                </div>
                            )}

                            <button onClick={() => setPepTalkMomentOpen(false)}
                                className="mt-6 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_0_40px_rgba(34,211,238,0.25)] transition hover:scale-105">
                                Back to the spiral →
                            </button>
                        </div>
                    </div>
                )}


                {modalOpen && goal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center">
                        <div className="w-full max-w-xl overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#08051a] shadow-[0_0_100px_rgba(34,211,238,0.15)] sm:rounded-[2.5rem]">
                            {/* Modal header */}
                            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300">Week {currentWeek} check-in</p>
                                    <h2 className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.05em]">Log the mess.</h2>
                                </div>
                                <button onClick={() => setModalOpen(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white">
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {weeksMissed > 0 && (
                                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
                                        <p className="text-xs font-bold text-amber-200">You missed {weeksMissed} week{weeksMissed === 1 ? "" : "s"}. No punishment — what actually happened?</p>
                                    </div>
                                )}

                                {/* Log text */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">What actually happened?</label>
                                    <textarea
                                        value={logText}
                                        onChange={(e) => setLogText(e.target.value)}
                                        className="mt-3 min-h-36 w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-sm font-semibold leading-7 text-white outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/[0.08] placeholder:text-zinc-600"
                                        placeholder="Doom scrolled. Posted anyway. Had one accidental win. Put it here."
                                    />
                                </div>

                                {/* Effort slider */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">Effort this week</label>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full text-base font-black"
                                            style={{
                                                backgroundColor: effortScore >= 9 ? "#facc1530" : effortScore >= 7 ? "#22d3ee30" : effortScore >= 5 ? "#a855f730" : effortScore >= 3 ? "#f472b630" : "#ef444430",
                                                color: effortScore >= 9 ? "#facc15" : effortScore >= 7 ? "#22d3ee" : effortScore >= 5 ? "#a855f7" : effortScore >= 3 ? "#f472b6" : "#ef4444",
                                                border: `1px solid ${effortScore >= 9 ? "#facc1550" : effortScore >= 7 ? "#22d3ee50" : effortScore >= 5 ? "#a855f750" : effortScore >= 3 ? "#f472b650" : "#ef444450"}`,
                                            }}>
                                            {effortScore}
                                        </div>
                                    </div>

                                    {/* Custom slider track */}
                                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
                                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                                            style={{
                                                width: `${effortScore * 10}%`,
                                                backgroundColor: effortScore >= 9 ? "#facc15" : effortScore >= 7 ? "#22d3ee" : effortScore >= 5 ? "#a855f7" : effortScore >= 3 ? "#f472b6" : "#ef4444",
                                            }} />
                                    </div>
                                    <input type="range" min="1" max="10" value={effortScore}
                                        onChange={(e) => setEffortScore(Number(e.target.value))}
                                        className="mt-2 w-full opacity-0 absolute" style={{ marginTop: "-20px", height: "20px", cursor: "pointer" }}
                                    />
                                    <input type="range" min="1" max="10" value={effortScore}
                                        onChange={(e) => setEffortScore(Number(e.target.value))}
                                        className="mt-1 w-full accent-cyan-300" />

                                    {/* Effort labels */}
                                    <div className="mt-1 flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                                        <span>Quit</span>
                                        <span>Survived</span>
                                        <span>Locked in</span>
                                        <span>Chaos</span>
                                    </div>
                                </div>

                                {/* Mood selector */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-400">Your mood this week</label>
                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        {(["Focused", "Chaotic", "Burnt out", "Locked in"] as const).map((mood) => (
                                            <button key={mood} type="button" onClick={() => setSelectedMood(mood)}
                                                className={`rounded-xl border py-2.5 text-xs font-black uppercase transition-all duration-200 ${selectedMood === mood
                                                        ? mood === "Focused" ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                                                            : mood === "Chaotic" ? "border-fuchsia-300/60 bg-fuchsia-300/15 text-fuchsia-100"
                                                                : mood === "Burnt out" ? "border-red-400/60 bg-red-400/15 text-red-200"
                                                                    : "border-amber-300/60 bg-amber-300/15 text-amber-100"
                                                        : "border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                                                    }`}>
                                                {mood === "Focused" ? "🎯" : mood === "Chaotic" ? "🌀" : mood === "Burnt out" ? "🔥" : "⚡"} {mood}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {checkInError && (
                                    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs font-bold text-red-200 animate-in fade-in duration-300">
                                        {checkInError}
                                    </div>
                                )}

                                {!pepTalk ? (
                                    <button onClick={submitCheckIn} disabled={savingCheckIn}
                                        className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_30px_rgba(34,211,238,0.2)] transition hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-50">
                                        {savingCheckIn ? "Saving the mess..." : "Submit check-in →"}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.07] p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 mb-2">Spiral response</p>
                                            <p className="text-sm font-bold leading-6 text-white">{pepTalk}</p>
                                        </div>
                                        <button onClick={() => setModalOpen(false)}
                                            className="w-full rounded-2xl border border-white/10 py-3 text-xs font-black uppercase text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-100">
                                            Back to the spiral
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {shareOpen && shareSnapshot && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                        <div className="w-full max-w-lg overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#08051a] shadow-[0_0_100px_rgba(168,85,247,0.15)] sm:rounded-[2.5rem]">
                            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-300">Share your spiral</p>
                                    <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.04em]">Show the mess.</h2>
                                </div>
                                    <button onClick={() => { setShareOpen(false); document.body.style.overflow = ""; }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white">
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Preview card */}
                                <div className="overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-300/10 via-black/40 to-cyan-300/10 p-5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-fuchsia-300">Your spiral</p>
                                    <p className="mt-2 text-lg font-black uppercase leading-tight tracking-[-0.04em] line-clamp-2">{shareSnapshot.goal}</p>
                                    <p className="mt-3 text-xs font-semibold text-zinc-400">{shareSnapshot.summary}</p>
                                    <div className="mt-4 grid grid-cols-3 gap-3">
                                        {[
                                            { label: "Score", value: shareSnapshot.score, color: "#22d3ee" },
                                            { label: "Streak", value: `${shareSnapshot.streak}w`, color: "#facc15" },
                                            { label: "Active", value: shareSnapshot.weeksActive, color: "#a855f7" },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                                                <p className="mt-1 text-xl font-black" style={{ color }}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Share URL */}
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
                                    <p className="flex-1 truncate text-xs font-mono text-zinc-400">{shareUrl}</p>
                                    <button onClick={copyShareLink}
                                        className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black uppercase transition ${copiedShare ? "bg-cyan-300 text-[#03020a]" : "border border-white/15 text-zinc-300 hover:border-cyan-300/50 hover:text-cyan-100"}`}>
                                        {copiedShare ? "Copied!" : "Copy"}
                                    </button>
                                </div>

                                {/* Download SVG */}
                                <button onClick={downloadShareImage}
                                    className="w-full rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/[0.07] py-3 text-xs font-black uppercase text-fuchsia-200 transition hover:bg-fuchsia-300/15">
                                    Download share card (.svg)
                                </button>

                                {/* Native share if available */}
                                {typeof navigator !== "undefined" && "share" in navigator && (
                                    <button onClick={async () => {
                                        try {
                                            await navigator.share({ title: `${shareSnapshot.goal} — Spiral`, text: shareSnapshot.summary, url: shareUrl });
                                        } catch { }
                                    }}
                                        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-400 to-cyan-400 py-3 text-xs font-black uppercase text-[#03020a] transition hover:scale-[1.01]">
                                        Share via…
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {selectedCheckIn && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center"
                        onClick={() => setSelectedCheckIn(null)}>
                        <div className="w-full max-w-md overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#08051a] shadow-2xl sm:rounded-[2.5rem]"
                            onClick={(e) => e.stopPropagation()}>
                            {(() => {
                                const effort = Number(selectedCheckIn.effort_score || 0);
                                const color = effort >= 9 ? "#facc15" : effort >= 7 ? "#22d3ee" : effort >= 5 ? "#a855f7" : effort >= 3 ? "#f472b6" : "#ef4444";
                                return (
                                    <>
                                        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black"
                                                    style={{ borderColor: `${color}50`, backgroundColor: `${color}18`, color }}>
                                                    {effort}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color }}>Week {selectedCheckIn.week_number}</p>
                                                    <p className="text-base font-black uppercase">Effort {effort}/10</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedCheckIn(null)}
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:text-white">
                                                ✕
                                            </button>
                                        </div>
                                        <div className="p-6">
                                            <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
                                                <div className="h-full rounded-full" style={{ width: `${effort * 10}%`, backgroundColor: color }} />
                                            </div>
                                            <p className="text-sm font-semibold leading-7 text-zinc-200">{selectedCheckIn.log_text}</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
)}
{/* Coach button */}
                {!COACH_DISABLED && (
                    <button
                        onClick={() => { setCoachOpen(true); document.body.style.overflow = "hidden"; }}
                        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-3 text-xs font-black uppercase tracking-wide text-[#03020a] shadow-[0_0_30px_rgba(34,211,238,0.4)] transition hover:scale-105 sm:bottom-8">
                        <MessageCircle className="h-4 w-4" />
                        Coach
                    </button>
                )}

                {/* Coach panel */}
                {coachOpen && !COACH_DISABLED && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                        <div className="flex h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2.5rem] border border-white/10 bg-[#08051a] shadow-[0_0_100px_rgba(34,211,238,0.15)] sm:rounded-[2.5rem]">
                            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300">Spiral Coach</p>
                                    <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.04em]">What's the block?</h2>
                                </div>
                                <button onClick={() => { setCoachOpen(false); document.body.style.overflow = ""; }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/30 hover:text-white">
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {coachMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${msg.role === "user" ? "bg-cyan-300 text-[#03020a]" : "border border-white/10 bg-white/[0.06] text-zinc-100"}`}>
                                            {msg.content || <span className="animate-pulse text-zinc-500">Thinking...</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/[0.06] p-4">
                                <div className="flex gap-3">
                                    <input
                                        value={coachInput}
                                        onChange={(e) => setCoachInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendCoachMessage()}
                                        placeholder="Ask the coach anything..."
                                        className="flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-cyan-300/50 placeholder:text-zinc-600"
                                    />
                                    <button
                                        onClick={sendCoachMessage}
                                        disabled={coachLoading || !coachInput.trim()}
                                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-3 text-xs font-black uppercase text-[#03020a] transition hover:scale-105 disabled:opacity-40">
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        );
}

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            {(authValue: any) => {
                const session = authValue?.user?.id
                    ? authValue
                    : authValue?.session?.user?.id
                        ? authValue.session
                        : authValue?.data?.session?.user?.id
                            ? authValue.data.session
                            : authValue?.id
                                ? { user: authValue }
                                : authValue;

                return (
                    <div className="relative min-h-screen bg-[#03020a] text-white">
                        <DashboardInner session={session as SpiralSession} />
                    </div>
                );
            }}
        </ProtectedRoute>
    );
}




