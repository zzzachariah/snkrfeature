import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "interactive-soft inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--ring)/0.2)]",
  {
    variants: {
      variant: {
        primary: "border-[rgb(var(--accent)/0.38)] bg-[linear-gradient(170deg,rgb(var(--glass-highlight)/0.32),rgb(var(--accent)/0.9)_44%,rgb(var(--accent)/0.84))] text-white shadow-[0_12px_28px_rgb(var(--accent)/0.28),inset_0_1px_0_rgb(255_255_255/0.35)] hover:border-[rgb(var(--accent)/0.5)] hover:brightness-105",
        secondary: "border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[linear-gradient(170deg,rgb(var(--glass-highlight)/0.28),rgb(var(--glass-bg)/0.62))] text-[rgb(var(--text))] shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.3)] hover:bg-[linear-gradient(170deg,rgb(var(--glass-highlight)/0.34),rgb(var(--glass-bg-strong)/0.7))]",
        ghost: "border-transparent bg-transparent text-[rgb(var(--text))] hover:border-[rgb(var(--glass-stroke-soft)/0.4)] hover:bg-[rgb(var(--glass-bg)/0.35)]"
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
