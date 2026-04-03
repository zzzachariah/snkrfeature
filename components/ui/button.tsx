import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "interactive-soft inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgb(var(--ring)/0.2)]",
  {
    variants: {
      variant: {
        primary: "border-[rgb(var(--accent)/0.4)] bg-[rgb(var(--accent)/0.9)] text-white shadow-[0_10px_24px_rgb(var(--accent)/0.34)] hover:bg-[rgb(var(--accent))]",
        secondary: "border-[rgb(var(--muted)/0.8)] bg-[rgb(var(--muted)/0.4)] text-[rgb(var(--text))] hover:bg-[rgb(var(--muted)/0.7)]",
        ghost: "border-transparent bg-transparent text-[rgb(var(--text))] hover:bg-[rgb(var(--muted)/0.35)]"
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
