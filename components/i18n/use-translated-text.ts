"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

type UseTranslatedTextOptions = {
  skipDynamic?: boolean;
  protectTechTerms?: boolean;
  contentType?: "descriptive" | "brand" | "username" | "email" | "shoe_name" | "technology";
};

const resolvedDynamicCache = new Map<string, string>();
const pendingDynamicCache = new Map<string, Promise<string>>();

function isLikelyIsolatedTechTerm(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length > 42) return false;
  if (/[,.!?;:]/.test(trimmed)) return false;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length > 4) return false;

  const upperWordLike = /^[A-Z0-9][A-Za-z0-9+/\-]*$/;
  return parts.every((part) => upperWordLike.test(part));
}

export function useTranslatedText(
  text: string | null | undefined,
  options: UseTranslatedTextOptions = {}
) {
  const { locale, translate, translateDynamic } = useLocale();
  const source = text ?? "";
  const normalized = source.trim();

  const shouldSkipDynamic = useMemo(() => {
    if (!normalized) return true;
    if (options.skipDynamic) return true;
    if (options.contentType === "brand" || options.contentType === "username" || options.contentType === "email" || options.contentType === "shoe_name") return true;
    if (options.contentType === "technology" && isLikelyIsolatedTechTerm(normalized)) return true;
    if (options.protectTechTerms && isLikelyIsolatedTechTerm(normalized)) return true;
    return false;
  }, [normalized, options.contentType, options.protectTechTerms, options.skipDynamic]);

  const [resolved, setResolved] = useState(() => translate(source));

  useEffect(() => {
    const immediate = translate(source);
    setResolved(immediate);

    if (locale !== "zh" || shouldSkipDynamic) return;
    if (!normalized) return;
    if (immediate !== source) return;

    let cancelled = false;
    const cacheKey = `${locale}::${source}`;
    const cachedValue = resolvedDynamicCache.get(cacheKey);
    if (cachedValue) {
      setResolved(cachedValue);
      return;
    }

    const pending = pendingDynamicCache.get(cacheKey) ?? translateDynamic(source);
    if (!pendingDynamicCache.has(cacheKey)) {
      pendingDynamicCache.set(cacheKey, pending);
    }

    pending
      .then((value) => {
        resolvedDynamicCache.set(cacheKey, value);
        if (!cancelled) setResolved(value);
      })
      .finally(() => {
        pendingDynamicCache.delete(cacheKey);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, normalized, shouldSkipDynamic, source, translate, translateDynamic]);

  return resolved;
}
