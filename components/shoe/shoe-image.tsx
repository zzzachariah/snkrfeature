"use client";

import { useEffect, useState } from "react";

type ShoeImageProps = {
  src?: string | null;
  alt: string;
  fallbackLabel: string;
  variant?: "thumbnail" | "detail" | "suggestion" | "compare";
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<ShoeImageProps["variant"]>, string> = {
  thumbnail: "aspect-square w-14 min-w-14",
  detail: "aspect-square w-full max-w-[30rem]",
  suggestion: "aspect-square w-16 min-w-16",
  compare: "aspect-square w-full max-w-[13rem]"
};

export function ShoeImage({ src, alt, fallbackLabel, variant = "thumbnail", className = "" }: ShoeImageProps) {
  const [failed, setFailed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const hasImage = Boolean(src) && !failed;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      const isClassDark = root.classList.contains("dark");
      const isSystemDark = !root.classList.contains("light") && media.matches;
      setIsDarkTheme(isClassDark || isSystemDark);
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    media.addEventListener("change", syncTheme);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncTheme);
    };
  }, []);

  return (
    <div
      className={`mx-auto overflow-hidden rounded-xl border border-[rgb(var(--muted)/0.42)] bg-[rgb(var(--bg-elev)/0.85)] ${VARIANT_CLASS[variant]} ${className}`}
      style={isDarkTheme ? { backgroundColor: "#000" } : undefined}
    >
      {hasImage ? (
        <img
          src={src ?? ""}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain object-center p-0.5 transition"
          style={
            isDarkTheme
              ? { filter: "invert(1) brightness(1.1) contrast(1.1)", backgroundColor: "#000" }
              : { filter: "none", backgroundColor: "#fff" }
          }
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[rgb(var(--bg-elev)/0.72)] px-2 text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] soft-text">{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
}
