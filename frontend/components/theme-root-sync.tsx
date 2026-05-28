"use client";

import { useEffect } from "react";

const applyTheme = () => {
  const savedTheme = window.localStorage.getItem("spiral-theme");
  if (savedTheme === "chaos") {
    document.documentElement.setAttribute("data-theme", "chaos");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
};

export function ThemeRootSync() {
  useEffect(() => {
    applyTheme();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "spiral-theme") applyTheme();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("spiral-theme-change", applyTheme);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("spiral-theme-change", applyTheme);
    };
  }, []);

  return null;
}
