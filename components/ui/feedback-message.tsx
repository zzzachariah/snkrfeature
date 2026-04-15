"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";

export function FeedbackMessage({ message, isError }: { message: string; isError?: boolean }) {
  const { translate } = useLocale();
  return <p className={cn("feedback", isError ? "feedback-error" : "feedback-success")}>{translate(message)}</p>;
}
