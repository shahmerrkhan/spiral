"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, signInWithEmail, signUpWithEmail } from "@/lib/api-client";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function routeAfterAuth() {
    const storedSession = getStoredSession();

    if (!storedSession?.token) {
      throw new Error("Login succeeded, but no saved token was found before redirect. Please try again.");
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!email.includes("@") || password.length < 6) {
        throw new Error("Use a real-ish email and at least 6 password characters. Tiny passwords are raccoon bait.");
      }

      await (mode === "signup" ? signUpWithEmail(email.trim(), password) : signInWithEmail(email.trim(), password));
      await routeAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something snapped. Try again, less elegantly.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-[#05030b] px-6 py-10 text-white sm:px-10">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.26),transparent_30%)]" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <a href="/" className="mb-8 text-sm font-black uppercase tracking-[0.35em] text-cyan-300">← Spiral</a>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-blue-950/30 backdrop-blur sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-200">{isSignup ? "Make the account" : "Get back in"}</p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.06em] sm:text-5xl">
            {isSignup ? "Start badly. Start anyway." : "You fell off. Log back in."}
          </h1>
          <p className="mt-4 text-sm font-medium leading-6 text-zinc-400">
            {isSignup
              ? "Email, password, one private account. Your goal mess stays yours."
              : "No shame screen. No streak funeral. Just open the door."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-bold text-white outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                placeholder="chaos@spiral.app"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-zinc-300">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-bold text-white outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
                placeholder="At least 6 characters"
              />
            </label>

            {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</div>}
            {message && <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 px-6 py-4 text-base font-black uppercase tracking-wide text-[#05030b] shadow-[0_0_42px_rgba(59,130,246,0.4)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Spiraling..." : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-bold text-zinc-400">
            {isSignup ? "Already started the mess? " : "New disaster? "}
            <a className="text-cyan-300 hover:text-cyan-100" href={isSignup ? "/login" : "/signup"}>
              {isSignup ? "Log in" : "Sign up"}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
