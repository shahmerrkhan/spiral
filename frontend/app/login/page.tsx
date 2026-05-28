// app/login/page.tsx
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03020a] px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.16),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-400">Spiral</p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-[-0.06em]">Back in the mess.</h1>
          <p className="mt-3 text-sm font-semibold text-zinc-400">Log back in. The spiral kept going without you.</p>
        </div>
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <AuthForm mode="login" />
        </div>
        <p className="mt-6 text-center text-xs font-semibold text-zinc-500">
          No account?{" "}
          <a href="/signup" className="font-black text-cyan-300 underline-offset-4 hover:underline">Start one.</a>
        </p>
      </div>
    </main>
  );
}