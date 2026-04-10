"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

const CONTACT_EMAIL = "zzzachariah9828@gmail.com";

export function SiteFooter() {
  const pathname = usePathname();
  const [feedback, setFeedback] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  const isAuthPath = /^\/(login|signup|register)(\/|$)/.test(pathname);

  if (isAuthPath) {
    return null;
  }

  async function copyContact() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setFeedback("Email address copied to clipboard.");
    } catch {
      setFeedback("Unable to copy automatically. Please try again.");
    }

    window.setTimeout(() => setFeedback(""), 2200);
  }

  return (
    <>
      <footer className="container-shell px-4 pb-8 pt-16 text-center text-xs leading-relaxed text-[rgb(var(--subtext))] md:pb-10 md:pt-20">
      <div className="mx-auto max-w-2xl space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={copyContact}
            className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--glass-stroke-soft)/0.5)] px-3 py-1.5 text-xs tracking-[0.02em] transition hover:border-[rgb(var(--accent)/0.4)] hover:text-[rgb(var(--text))]"
          >
            Contact
          </button>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--glass-stroke-soft)/0.5)] px-3 py-1.5 text-xs tracking-[0.02em] transition hover:border-[rgb(var(--accent)/0.4)] hover:text-[rgb(var(--text))]"
          >
            About
          </button>
        </div>
        {feedback && <p aria-live="polite" className="text-[11px]">{feedback}</p>}
        <p>Information is collected from AI models such as ChatGPT and from users, and is verified by humans.</p>
        <p>This website was created by zzz.</p>
      </div>
      </footer>

      {infoOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(var(--glass-overlay)/0.72)] p-4 backdrop-blur-sm" onClick={() => setInfoOpen(false)}>
          <div
            className="surface-card premium-border relative w-full max-w-2xl rounded-3xl p-5 shadow-[0_30px_72px_rgb(var(--glass-shadow)/0.42)] md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close information modal"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-[rgb(var(--subtext))] transition hover:bg-[rgb(var(--muted)/0.28)] hover:text-[rgb(var(--text))]"
              onClick={() => setInfoOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-10">
              <h3 className="text-2xl font-semibold tracking-[0.015em]">Sample title</h3>
              <p className="mt-1 text-sm soft-text">Sample subtitle</p>
            </div>
            <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed soft-text">
              <p>
                This is sample reading content for the footer information modal. It is intentionally simple and can be replaced with finalized copy later.
              </p>
              <p>
                The layout mirrors the reading-focused style used elsewhere: clear hierarchy, comfortable spacing, and a quiet visual rhythm that fits the site.
              </p>
              <p>
                If this content grows longer, the panel remains scrollable while preserving a stable close button and consistent typography.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
