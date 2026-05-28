"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthSession, getStoredSession, verifyStoredSession } from "@/lib/api-client";

export function ProtectedRoute({ children }: { children: ReactNode | ((session: AuthSession) => ReactNode) }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const loginRedirect = pathname && pathname !== "/" ? `/?redirect=${encodeURIComponent(pathname)}` : "/";

      try {
        const stored = getStoredSession();

        setAuthError(null);

        if (!stored?.token || !stored?.user?.id) {
          setChecking(false);
          router.replace(loginRedirect);
          return;
        }

        const verified = await Promise.race([
          verifyStoredSession(),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 6000)),
        ]);
        if (!active) return;

        if (!verified) {
          setAuthError("We could not verify your session. Redirecting you back to sign in.");
          setChecking(false);
          router.replace(loginRedirect);
          return;
        }

        setSession(verified);
        setChecking(false);
      } catch (error) {
        if (active) {
          setAuthError(error instanceof Error ? error.message : "Unexpected authentication error.");
          setChecking(false);
          router.replace(loginRedirect);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [pathname, router, retryKey]);

  if (checking || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05030b] px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-blue-950/30">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">{checking ? "Checking the lock" : "Lock interrupted"}</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-tight">No strangers in the spiral.</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            {authError || "Verifying your session. If this takes too long, we will send you back to sign in instead of leaving you stuck."}
          </p>
          {authError && (
            <button
              type="button"
              onClick={() => {
                setChecking(true);
                setSession(null);
                setRetryKey((value) => value + 1);
              }}
              className="mt-6 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Try again
            </button>
          )}
        </div>
      </main>
    );
  }

  return <>{typeof children === "function" ? children(session) : children}</>;
}
