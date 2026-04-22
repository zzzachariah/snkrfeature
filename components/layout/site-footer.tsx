"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";

const CONTACT_EMAIL = "zzzachariah9828@gmail.com";

export function SiteFooter() {
  const pathname = usePathname();
  const { translate } = useLocale();
  const [feedback, setFeedback] = useState("");

  const isAuthPath = /^\/(login|signup|register)(\/|$)/.test(pathname);
  const isHomePath = pathname === "/";

  if (isAuthPath || isHomePath) {
    return null;
  }

  async function copyContact() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setFeedback(translate("Email address copied to clipboard."));
    } catch {
      setFeedback(translate("Unable to copy automatically. Please try again."));
    }

    window.setTimeout(() => setFeedback(""), 2200);
  }

  return (
    <footer className="container-shell px-4 pb-8 pt-16 text-center text-xs leading-relaxed text-[rgb(var(--subtext))] md:pb-10 md:pt-20">
      <div className="mx-auto max-w-2xl space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={copyContact}
            className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--glass-stroke-soft)/0.5)] px-3 py-1.5 text-xs tracking-[0.02em] transition hover:border-[rgb(var(--accent)/0.4)] hover:text-[rgb(var(--text))]"
          >
            {translate("Contact")}
          </button>
        </div>
        {feedback && <p aria-live="polite" className="text-[11px]">{feedback}</p>}
        <p>{translate("Information is collected from AI models such as ChatGPT and from users, and is verified by humans.")}</p>
        <p>{translate("This website was created by zzz.")}</p>
      </div>
    </footer>
  );
}
