import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeRootSync } from "@/components/theme-root-sync";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Spiral — Goal tracking for messy people",
  description: "Track the goal without lying. Pick the thing. Log what happened. Use the evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable} min-h-screen overflow-x-hidden bg-[#03020a] text-white antialiased font-[var(--font-display)]`}>
        <ThemeRootSync />
        {children}
        <script src="/.pf/inspector-client.v15.js" defer />
      </body>
    </html>
  );
}