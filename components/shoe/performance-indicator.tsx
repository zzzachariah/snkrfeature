import { getPerformanceLabel } from "@/lib/shoe-scoring";

type PerformanceIndicatorProps = {
  label: "Cushioning Feel" | "Court Feel" | "Bounce" | "Stability" | "Traction" | "Fit";
  score: number;
  tier?: string;
  rawText?: string | null;
};

function getToneClass(tier: string) {
  if (tier === "Weak" || tier === "Below Average") return "bg-[rgb(var(--muted)/0.72)]";
  if (tier === "Decent" || tier === "Solid") return "bg-[rgb(var(--ring)/0.52)]";
  if (tier === "Good" || tier === "Very Good") return "bg-[rgb(var(--accent)/0.72)]";
  return "bg-[rgb(var(--accent)/0.9)]";
}

export function PerformanceIndicator({ label, score, tier, rawText }: PerformanceIndicatorProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const resolvedTier = tier ?? getPerformanceLabel(clampedScore);

  return (
    <div className="space-y-1.5 rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.45)] bg-[rgb(var(--bg-elev)/0.58)] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="uppercase tracking-[0.14em] soft-text">{label}</p>
        <p className="truncate text-right text-[rgb(var(--text)/0.9)]">{rawText?.trim() || "Not yet added"}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--muted)/0.35)]">
          <div
            className={`h-full rounded-full ${getToneClass(resolvedTier)} transition-all duration-300 ease-out`}
            style={{ width: `${clampedScore}%` }}
          />
        </div>

        <span className="min-w-9 text-right text-sm font-semibold text-[rgb(var(--text)/0.94)]">{clampedScore}</span>
      </div>
    </div>
  );
}
