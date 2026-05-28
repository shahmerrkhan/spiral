"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 700);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div key={pathname} className="min-h-screen overflow-x-hidden bg-[#03020a] pb-24 text-white animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out sm:pb-0">
      {visible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#03020a] animate-out fade-out duration-300 delay-400">
          <div className="flex flex-col items-center gap-6">
            {/* Animated spiral rings */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border border-cyan-300/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-fuchsia-400/30 animate-spin" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-4 rounded-full border border-cyan-300/50 animate-spin" style={{ animationDuration: "1.2s", animationDirection: "reverse" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black tracking-[-0.1em] text-white">S</span>
              </div>
              <div className="absolute inset-0 rounded-full shadow-[0_0_60px_rgba(34,211,238,0.3)]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-400">Spiral</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}