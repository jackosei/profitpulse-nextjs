"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mk-theme";

/**
 * Marketing-site theme toggle. Dark is the default; "light" is stored in
 * localStorage and applied as data-theme on .mk-root (a pre-paint inline
 * script in the marketing layout prevents a flash on load).
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "light") setTheme("light");
    } catch {
      /* storage unavailable: stay on dark */
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.querySelector(".mk-root");
    if (next === "light") {
      root?.setAttribute("data-theme", "light");
    } else {
      root?.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-fatal */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "light"}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className="border border-[var(--mk-line)] px-2.5 py-1.5 font-mono text-xs text-[var(--mk-ink)] hover:bg-[var(--mk-ink)] hover:text-[var(--mk-bg)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mk-ink)]"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
