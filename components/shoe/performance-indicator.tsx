import { getPerformanceLabel } from "@/lib/shoe-scoring";

type PerformanceIndicatorProps = {
  label: "Stability" | "Traction" | "Fit";
  score: number;
  tier?: string;
  rawText?: string | null;
};

function getTierTone(tier: string) {
  if (tier === "Weak" || tier === "Below Average") {
    return {
      fill: "from-[rgb(var(--muted)/0.68)] via-[rgb(var(--muted)/0.85)] to-[rgb(var(--subtext)/0.7)]",
      badge: "bg-[rgb(var(--muted)/0.36)] text-[rgb(var(--text)/0.9)]"
    };
  }

  if (tier === "Decent" || tier === "Solid") {
    return {
      fill: "from-[rgb(var(--muted)/0.75)] via-[rgb(var(--ring)/0.26)] to-[rgb(var(--ring)/0.38)]",
      badge: "bg-[rgb(var(--ring)/0.18)] text-[rgb(var(--text)/0.9)]"
    };
  }

  if (tier === "Good" || tier === "Very Good") {
    return {
      fill: "from-[rgb(var(--accent)/0.55)] via-[rgb(var(--accent)/0.72)] to-[rgb(var(--accent)/0.84)]",
      badge: "bg-[rgb(var(--accent)/0.16)] text-[rgb(var(--text))]"
    };
  }

  return {
    fill: "from-[rgb(var(--accent)/0.68)] via-[rgb(var(--accent)/0.84)] to-[rgb(var(--ring)/0.95)]",
    badge: "bg-[rgb(var(--accent)/0.2)] text-[rgb(var(--text))]"
  };
}

export function PerformanceIndicator({ label, score, tier, rawText }: PerformanceIndicatorProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const resolvedTier = tier ?? getPerformanceLabel(clampedScore);
  const tone = getTierTone(resolvedTier);
  const scoreInFill = clampedScore >= 28;

  return (
    <div className="rounded-2xl border border-[rgb(var(--glass-stroke-soft)/0.45)] bg-[rgb(var(--bg-elev)/0.62)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] soft-text">{label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] ${tone.badge}`}>{resolvedTier}</span>
      </div>

      <p className="mt-1 text-sm leading-5 text-[rgb(var(--text)/0.92)]">{rawText?.trim() || "Not yet added"}</p>

      <div className="mt-3 relative h-8 overflow-hidden rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.52)] bg-[rgb(var(--glass-bg-strong)/0.85)]">
        <div
          className={`absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r shadow-[0_8px_18px_rgb(var(--accent)/0.2)] transition-all duration-500 ease-out ${tone.fill}`}
          style={{ width: `${clampedScore}%` }}
        >
          {scoreInFill && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold tracking-wide text-white/95">
              {clampedScore}
            </span>
          )}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 via-transparent to-transparent" />
        </div>

        {!scoreInFill && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold tracking-wide text-[rgb(var(--text)/0.9)]">
            {clampedScore}
          </span>
        )}
      </div>
    </div>
  );
}
