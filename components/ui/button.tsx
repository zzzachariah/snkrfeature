import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "liquid-interactive interactive-soft inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium tracking-[-0.01em] transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--ring)/0.2)]",
  {
    variants: {
      variant: {
        primary: "border-[rgb(var(--accent)/0.95)] bg-[rgb(var(--accent))] text-white shadow-[0_4px_14px_rgb(var(--accent)/0.24)] hover:bg-[rgb(var(--accent)/0.9)]",
        secondary: "border-[rgb(var(--glass-stroke-soft)/0.78)] bg-[rgb(var(--bg-elev)/0.92)] text-[rgb(var(--text))] shadow-[0_1px_1px_rgb(var(--shadow)/0.08)] hover:border-[rgb(var(--accent)/0.4)] hover:bg-[rgb(var(--bg-elev))]",
        ghost: "border-transparent bg-transparent text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent)/0.08)]"
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
