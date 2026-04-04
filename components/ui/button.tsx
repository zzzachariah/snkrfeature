import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "liquid-interactive interactive-soft inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--ring)/0.2)]",
  {
    variants: {
      variant: {
        primary: "border-[rgb(var(--accent)/0.5)] bg-[rgb(var(--accent)/0.95)] text-white shadow-[0_10px_22px_rgb(var(--accent)/0.28)] hover:bg-[rgb(var(--accent))] hover:shadow-[0_12px_24px_rgb(var(--accent)/0.32)]",
        secondary: "border-[rgb(var(--glass-stroke-soft)/0.62)] bg-[rgb(var(--glass-bg)/0.96)] text-[rgb(var(--text))] shadow-[0_4px_12px_rgb(var(--glass-shadow)/0.1)] hover:bg-[rgb(var(--glass-bg-strong)/0.98)]",
        ghost: "border-transparent bg-transparent text-[rgb(var(--text))] hover:border-[rgb(var(--glass-stroke-soft)/0.46)] hover:bg-[rgb(var(--accent)/0.08)]"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {}

export function Button({ className, variant, ...props }: Props) {
  return <button className={cn(buttonStyles({ variant }), className)} {...props} />;
}
