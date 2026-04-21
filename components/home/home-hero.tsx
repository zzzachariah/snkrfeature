"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

function useCountUp(target: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    let frame: number;
    const step = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [trigger, target, duration]);
  return value;
}

function BrowseButton({ label, href }: { label: string; href: Route }) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative inline-flex h-11 w-[188px] flex-shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--text))] bg-[rgb(var(--text))] text-[rgb(var(--bg))] transition-[border-radius,box-shadow,transform] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]"
      style={{
        borderRadius: hover ? 50 : 9,
        boxShadow: hover ? "0 8px 28px rgb(var(--shadow)/0.4)" : "none"
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-[0.875rem] font-bold tracking-[-0.01em] transition-opacity duration-[110ms]"
        style={{ opacity: hover ? 0 : 1 }}
      >
        {label} <ArrowRight className="ml-1.5 h-4 w-4" />
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center text-[1.25rem] font-bold transition-opacity duration-[160ms]"
        style={{ opacity: hover ? 1 : 0, transitionDelay: hover ? "80ms" : "0ms" }}
      >
        →
      </span>
    </Link>
  );
}

export function HomeHero({ shoesCount, brandsCount }: { shoesCount: number; brandsCount: number }) {
  const { translate } = useLocale();
  const [up, setUp] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    rafRef.current = window.setTimeout(() => setUp(true), 80);
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, []);

  const shoes = useCountUp(shoesCount, 900, up);
  const brands = useCountUp(brandsCount, 700, up);

  const reveal = (delay: number): React.CSSProperties => ({
    opacity: up ? 1 : 0,
    transform: up ? "none" : "translateY(20px)",
    transition: "opacity 500ms cubic-bezier(0.22,1,0.36,1),transform 500ms cubic-bezier(0.22,1,0.36,1)",
    transitionDelay: `${delay}ms`
  });

  const headlineLines = [
    translate("A LIVING INDEX"),
    translate("OF EVERY PAIR"),
    translate("WORTH PLAYING IN.")
  ];

  return (
    <section className="relative overflow-hidden px-0 py-16 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right,rgb(var(--text)/0.02) 1px,transparent 1px),linear-gradient(to bottom,rgb(var(--text)/0.02) 1px,transparent 1px)",
          backgroundSize: "48px 48px"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[40%]"
        style={{ background: "linear-gradient(to top,rgb(var(--bg)),transparent)" }}
      />
      <div className="relative z-10 w-full">
        <p className="t-eyebrow" style={{ marginBottom: 28, ...reveal(0) }}>
          {translate("Basketball Sneaker Database")}
        </p>

        <div style={{ marginBottom: 36 }}>
          {headlineLines.map((line, i) => (
            <div
              key={i}
              className="t-display"
              style={{
                color: "rgb(var(--text))",
                display: "block",
                opacity: up ? 1 : 0,
                transform: up ? "none" : "translateY(32px)",
                transition: "opacity 580ms cubic-bezier(0.22,1,0.36,1),transform 580ms cubic-bezier(0.22,1,0.36,1)",
                transitionDelay: `${60 + i * 75}ms`
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <p
          className="max-w-[460px] text-[1rem] leading-[1.55] tracking-[-0.01em]"
          style={{ color: "rgb(var(--subtext))", marginBottom: 44, ...reveal(300) }}
        >
          {translate(
            "Every basketball sneaker worth playing in — reviewed, compared, and indexed by the community."
          )}
        </p>

        <div className="flex flex-wrap gap-3" style={{ marginBottom: 80, ...reveal(370) }}>
          <BrowseButton label={translate("Browse the index")} href="/search/advanced" />
          <Link
            href="/submit"
            className="inline-flex items-center rounded-[9px] border border-[rgb(var(--glass-stroke-soft)/0.55)] bg-transparent px-6 py-3 text-[0.875rem] font-medium tracking-[-0.01em] text-[rgb(var(--subtext))] transition-[border-color,color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[rgb(var(--text)/0.4)] hover:text-[rgb(var(--text))]"
          >
            {translate("Submit a shoe")}
          </Link>
        </div>

        <div
          className="flex flex-wrap items-center gap-[22px] pt-[22px]"
          style={{ borderTop: "1px solid rgb(var(--muted)/0.25)", ...reveal(440) }}
        >
          <Stat value={shoes.toString()} label={translate("shoes indexed")} />
          <Dot />
          <Stat value={brands.toString()} label={translate("brands represented")} />
          <Dot />
          <Stat value={translate("Live")} label={translate("submission pipeline")} />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="text-[0.78rem] text-[rgb(var(--subtext))]">
      <span className="font-bold tracking-[-0.02em] text-[rgb(var(--text))] tabular-nums">{value}</span>{" "}
      {label}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="select-none text-[0.9rem] leading-none text-[rgb(var(--muted)/0.9)]">
      ·
    </span>
  );
}
