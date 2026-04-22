import { cn } from "@/lib/utils";

export function AnimatedBackground({
  className,
  showGrid = true
}: {
  className?: string;
  showGrid?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="mesh-bg" />
      {showGrid && <div className="mesh-grid" />}
    </div>
  );
}
