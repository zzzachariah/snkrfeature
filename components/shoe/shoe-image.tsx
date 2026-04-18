"use client";

import { useState } from "react";

type ShoeImageProps = {
  src?: string | null;
  alt: string;
  fallbackLabel: string;
  variant?: "thumbnail" | "detail" | "suggestion" | "compare";
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<ShoeImageProps["variant"]>, string> = {
  thumbnail: "h-12 w-16",
  detail: "h-52 w-full max-w-xl md:h-64",
  suggestion: "h-12 w-14",
  compare: "h-36 w-full"
};

export function ShoeImage({ src, alt, fallbackLabel, variant = "thumbnail", className = "" }: ShoeImageProps) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(src) && !failed;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[rgb(var(--muted)/0.42)] bg-[rgb(var(--bg-elev)/0.85)] ${VARIANT_CLASS[variant]} ${className}`}
    >
      {hasImage ? (
        <img
          src={src ?? ""}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain bg-white p-2 transition dark:brightness-95 dark:contrast-110"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[rgb(var(--bg-elev)/0.72)] px-2 text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] soft-text">{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
}
