// app/signup/page.tsx
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03020a] px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(168,85,247,0.18),transparent_40%),radial-gradient(circle_at_30%_80%,rgba(34,211,238,0.16),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute left-1/2 bottom-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-fuchsia-400">Spiral</p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.06em]">Start the mess.</h1>
          <p className="mt-3 text-sm font-semibold text-zinc-400">One goal. Six months. No lying to yourself.</p>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-fuchsia-950/30 backdrop-blur-xl sm:p-8">
          <AuthForm mode="signup" />
        </div>
        <p className="mt-6 text-center text-xs font-semibold text-zinc-500">
          Already spiraling?{" "}
          <a href="/login" className="font-black text-fuchsia-300 underline-offset-4 hover:underline">Log back in.</a>
        </p>
      </div>
    </main>
  );
}