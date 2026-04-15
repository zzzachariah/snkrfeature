"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

export function BrandLoader({
  label = "Loading",
  compact = false,
  className
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const { translate } = useLocale();

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <p className={cn("font-semibold tracking-[0.12em] uppercase", compact ? "text-sm" : "text-base")}> 
        <span className="brand-shimmer">snkrfeature</span>
      </p>
      <p className="text-xs soft-text">{translate(label)}</p>
    </div>
  );
}
