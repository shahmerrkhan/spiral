"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Battles", href: "/battles" },
  { label: "Wall", href: "/spirals" },
  { label: "Replay", href: "/replay" },
  { label: "Stats", href: "/stats" },
  { label: "Archive", href: "/archive" },
  { label: "Settings", href: "/settings" },
];

export function MobileBottomNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  function handleLogout() {
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("spiral-session");
      router.push("/");
    }
  }

  const allItems = [...navItems, { label: "Log Out", href: null }];

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 z-[100] border-b border-white/[0.06] bg-[#03020a]/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="shrink-0 text-[10px] font-black uppercase tracking-[0.55em] text-cyan-300 transition-colors hover:text-cyan-100"
        >
          Spiral
        </Link>

        {/* Right side: items spread out + button */}
        <div className="flex items-center gap-2">

          {/* Nav items — each one animates in individually */}
          <div className="flex items-center gap-1.5 overflow-hidden">
            {allItems.map((item, i) => {
              const isActive = item.href && pathname === item.href;
              const isLogout = item.href === null;
              const delay = open ? `${i * 30}ms` : "0ms";
              const opacity = open ? "1" : "0";
              const transform = open ? "translateX(0px)" : "translateX(20px)";

              if (isLogout) {
                return (
                  <button
                    key="logout"
                    onClick={handleLogout}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-400"
                    style={{
                      opacity,
                      transform,
                      transitionProperty: "opacity, transform",
                      transitionDuration: open ? "350ms" : "150ms",
                      transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: delay,
                      pointerEvents: open ? "auto" : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Log Out
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${
                    isActive
                      ? "border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                      : "border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                  style={{
                    opacity,
                    transform,
                    transitionProperty: "opacity, transform",
                    transitionDuration: open ? "350ms" : "150ms",
                    transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transitionDelay: delay,
                    pointerEvents: open ? "auto" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] ${
              open
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="relative flex h-[12px] w-[14px] flex-col justify-between">
              <span
                className="block h-[2px] w-full rounded-full bg-current transition-all duration-300 origin-center"
                style={{ transform: open ? "translateY(5px) rotate(45deg)" : "translateY(0) rotate(0)" }}
              />
              <span
                className="block h-[2px] w-full rounded-full bg-current transition-all duration-200"
                style={{ opacity: open ? 0 : 1, transform: open ? "scaleX(0)" : "scaleX(1)" }}
              />
              <span
                className="block h-[2px] w-full rounded-full bg-current transition-all duration-300 origin-center"
                style={{ transform: open ? "translateY(-5px) rotate(-45deg)" : "translateY(0) rotate(0)" }}
              />
            </span>
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>
    </div>
  );
}