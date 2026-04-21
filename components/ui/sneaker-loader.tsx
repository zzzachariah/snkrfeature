"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

export function SneakerLoader({
  label = "Loading",
  compact = false,
  className
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const { translate } = useLocale();
  const size = compact ? 56 : 112;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        compact ? "gap-2" : "gap-3",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <svg
        width={size}
        height={size * 0.5}
        viewBox="0 0 140 70"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-[rgb(var(--text))]"
      >
        <g className="sneaker-bob">
          <path
            className="sneaker-draw"
            strokeWidth="2"
            d="M 10 46 L 12 28 C 12 20, 18 14, 26 14 L 36 18 C 40 14, 46 12, 54 14 L 64 18 L 100 28 C 115 30, 128 34, 130 40 L 130 46 Z"
          />
          <path
            className="sneaker-draw"
            strokeWidth="1.5"
            d="M 44 22 L 49 20 M 52 24 L 57 22 M 60 26 L 65 24"
          />
          <path
            className="sneaker-draw"
            strokeWidth="1.5"
            d="M 10 46 L 130 46"
          />
        </g>
        <path
          className="sneaker-ground"
          strokeWidth="1.25"
          strokeDasharray="4 6"
          d="M 0 58 L 180 58"
          stroke="rgb(var(--muted))"
        />
      </svg>
      <p className="text-xs uppercase tracking-[0.18em] soft-text">
        {translate(label)}
      </p>
    </div>
  );
}
