import { cn } from "@/lib/utils";

export function BrandLoader({
  label = "Loading",
  compact = false,
  className
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <p className={cn("font-semibold tracking-[0.12em] uppercase", compact ? "text-sm" : "text-base")}> 
        <span className="brand-shimmer">snkrfeature</span>
      </p>
      <p className="text-xs soft-text">{label}</p>
    </div>
  );
}
