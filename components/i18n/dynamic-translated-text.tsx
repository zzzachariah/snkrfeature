"use client";

import { useTranslatedText } from "@/components/i18n/use-translated-text";

type DynamicTranslatedTextProps = {
  text: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
  skipDynamic?: boolean;
  protectTechTerms?: boolean;
};

export function DynamicTranslatedText({
  text,
  className,
  as = "span",
  skipDynamic = false,
  protectTechTerms = false
}: DynamicTranslatedTextProps) {
  const value = useTranslatedText(text, { skipDynamic, protectTechTerms });
  const Component = as;
  return <Component className={className}>{value}</Component>;
}
