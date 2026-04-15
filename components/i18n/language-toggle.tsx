"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOCALE_COOKIE, Locale } from "@/lib/i18n/types";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageToggle({ locale, className, onLocaleChange }: { locale: Locale; className?: string; onLocaleChange?: (locale: Locale) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function changeLocale(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    onLocaleChange?.(next);
    const query = searchParams.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
      router.refresh();
    });
  }

  const shared =
    "inline-flex h-10 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)]";

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--glass-bg)/0.62)] p-1 text-[rgb(var(--text))] shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.28)]",
        className
      )}
      role="group"
      aria-label="Language toggle"
    >
      <button
        type="button"
        disabled={isPending}
        className={cn(shared, locale === "en" ? "bg-[rgb(var(--accent)/0.15)] text-[rgb(var(--accent))]" : "hover:bg-[rgb(var(--accent)/0.1)]")}
        onClick={() => changeLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        disabled={isPending}
        className={cn(shared, locale === "zh" ? "bg-[rgb(var(--accent)/0.15)] text-[rgb(var(--accent))]" : "hover:bg-[rgb(var(--accent)/0.1)]")}
        onClick={() => changeLocale("zh")}
      >
        中文
      </button>
    </div>
  );
}
