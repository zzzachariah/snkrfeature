import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "liquid-interactive w-full rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.58)] bg-[rgb(var(--glass-bg)/0.97)] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none transition duration-200 placeholder:text-[rgb(var(--subtext))] hover:border-[rgb(var(--accent)/0.35)] focus:border-[rgb(var(--ring)/0.85)] focus:ring-4 focus:ring-[rgb(var(--ring)/0.2)]",
        props.className
      )}
    />
  );
}
