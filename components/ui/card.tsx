import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card liquid-interactive rounded-2xl premium-border interactive-soft", className)} {...props} />;
}
