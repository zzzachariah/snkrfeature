"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

const SECTIONS = [
  { id: "compare-top", label: "Top" },
  { id: "compare-lineup", label: "Lineup" },
  { id: "compare-perf", label: "Performance" },
  { id: "compare-specs", label: "Specs" }
];

export function CompareSectionNav() {
  const { translate } = useLocale();
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visible = new Set<string>();

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
          const firstVisible = SECTIONS.find((s) => visible.has(s.id));
          if (firstVisible) setActive(firstVisible.id);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Compare sections"
      className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
    >
      {SECTIONS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => jump(id)}
            aria-label={translate(label)}
            aria-current={isActive ? "true" : undefined}
            className="pointer-events-auto group relative flex h-4 w-4 items-center justify-center"
          >
            <span
              className={`pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[rgb(var(--bg-elev)/0.92)] px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.18em] opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                isActive ? "text-[rgb(var(--text))]" : "soft-text"
              }`}
            >
              {translate(label)}
            </span>
            <span
              className={`block rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isActive
                  ? "h-2 w-2 bg-[rgb(var(--text))]"
                  : "h-1.5 w-1.5 bg-[rgb(var(--muted)/0.85)] group-hover:bg-[rgb(var(--text)/0.6)]"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
