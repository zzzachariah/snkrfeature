import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "liquid-interactive w-full rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.48)] bg-[linear-gradient(180deg,rgb(var(--glass-highlight)/0.2),rgb(var(--glass-bg)/0.62))] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none transition duration-200 placeholder:text-[rgb(var(--subtext))] hover:border-[rgb(var(--glass-stroke)/0.5)] focus:border-[rgb(var(--ring)/0.85)] focus:ring-4 focus:ring-[rgb(var(--ring)/0.2)]",
        props.className
      )}
    />
  );
}
