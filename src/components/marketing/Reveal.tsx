"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subtle entrance reveal: fade + 1rem rise when the element scrolls into view.
 *
 * - Server-rendered HTML stays fully visible (SEO / no-JS / pre-hydration);
 *   the hidden state is only applied after mount, and only to elements that
 *   are still below the fold at that moment.
 * - Respects prefers-reduced-motion (renders static).
 * - Explicit transition property list — the global `* { transition-[width] }`
 *   rule means a bare `transition` class can't be trusted.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Transition delay in ms, for gentle sequencing within a section. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // "ssr" = untouched server markup; "hidden" = armed; "shown" = revealed
  const [state, setState] = useState<"ssr" | "hidden" | "shown">("ssr");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already in (or above) the viewport at hydration time: leave it static.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        className ?? "",
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        state === "hidden" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0",
      ].join(" ")}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
