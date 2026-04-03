import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-[rgb(var(--muted)/0.6)] bg-[rgb(var(--bg-elev)/0.78)] px-3 py-2 text-sm text-[rgb(var(--text))] outline-none transition duration-150 placeholder:text-[rgb(var(--subtext))] hover:border-[rgb(var(--ring)/0.4)] focus:border-[rgb(var(--ring)/0.9)] focus:ring-4 focus:ring-[rgb(var(--ring)/0.2)]",
        props.className
      )}
    />
  );
}
