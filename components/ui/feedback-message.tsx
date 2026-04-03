import { cn } from "@/lib/utils";

export function FeedbackMessage({ message, isError }: { message: string; isError?: boolean }) {
  return <p className={cn("feedback", isError ? "feedback-error" : "feedback-success")}>{message}</p>;
}
