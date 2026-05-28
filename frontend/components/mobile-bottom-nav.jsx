"use client";

import Link from "next/link";
import { signOut } from "@/lib/supabase";

export function MobileBottomNav() {
  const shareSpiral = async () => {
    const shareUrl = `${window.location.origin}/dashboard`;
    const shareText = "I’m tracking my goal in Spiral.";

    try {
      if (navigator.share) {
        await navigator.share({ title: "Spiral", text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Sharing can be cancelled by the user; keep the nav calm.
    }
  };

  const takeTour = () => {
    const target = document.querySelector<HTMLElement>("main");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const replay = () => {
    window.location.reload();
  };

  const logOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/10 bg-[#03020a]/90 px-3 py-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-auto rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-center text-[0.65rem] font-black uppercase tracking-[0.28em] text-cyan-100 shadow-lg shadow-cyan-950/30 sm:mx-0">
          SPIRAL EMBER 1
        </div>
            <div className="grid grid-cols-3 items-center justify-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-zinc-300 sm:flex sm:flex-wrap sm:gap-3 sm:text-[0.7rem]">
          <Link href="/dashboard" className="rounded-full border border-white/10 px-3 py-2 transition hover:border-cyan-300/40 hover:text-cyan-100 active:scale-95">
            DASHBOARD
          </Link>
          <button type="button" onClick={shareSpiral} className="rounded-full border border-white/10 px-3 py-2 transition hover:border-cyan-300/40 hover:text-cyan-100 active:scale-95">
            SHARE
          </button>
          <button type="button" onClick={takeTour} className="rounded-full border border-white/10 px-3 py-2 transition hover:border-cyan-300/40 hover:text-cyan-100 active:scale-95">
            TAKE THE TOUR
          </button>
          <button type="button" onClick={replay} className="rounded-full border border-white/10 px-3 py-2 transition hover:border-cyan-300/40 hover:text-cyan-100 active:scale-95">
            REPLAY
          </button>
          <Link href="/battles" className="rounded-full border border-white/10 px-3 py-2 transition hover:border-fuchsia-300/40 hover:text-fuchsia-100 active:scale-95">
            BATTLES
          </Link>
          <Link href="/settings" className="rounded-full border border-white/10 px-3 py-2 transition hover:border-cyan-300/40 hover:text-cyan-100 active:scale-95">
            SETTINGS
          </Link>
          <button type="button" onClick={logOut} className="rounded-full border border-white/10 px-3 py-2 transition hover:border-rose-300/40 hover:text-rose-100 active:scale-95">
            LOG OUT
          </button>
        </div>
      </div>
    </nav>
  );
}
