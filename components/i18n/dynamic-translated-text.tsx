"use client";

import { useTranslatedText } from "@/components/i18n/use-translated-text";

type DynamicTranslatedTextProps = {
  text: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
  skipDynamic?: boolean;
  protectTechTerms?: boolean;
  contentType?: "descriptive" | "brand" | "username" | "email" | "shoe_name" | "technology";
};

export function DynamicTranslatedText({
  text,
  className,
  as = "span",
  skipDynamic = false,
  protectTechTerms = false,
  contentType = "descriptive"
}: DynamicTranslatedTextProps) {
  const value = useTranslatedText(text, { skipDynamic, protectTechTerms, contentType });
  const Component = as;
  return <Component className={className}>{value}</Component>;
}
