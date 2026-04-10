"use client";

import { useState } from "react";

const CONTACT_EMAIL = "zzzachariah9828@gmail.com";

export function SiteFooter() {
  const [feedback, setFeedback] = useState("");

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
    <footer className="container-shell px-4 pb-8 pt-10 text-center text-xs leading-relaxed text-[rgb(var(--subtext))] md:pb-10">
      <div className="mx-auto max-w-2xl space-y-2">
        <button
          type="button"
          onClick={copyContact}
          className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--glass-stroke-soft)/0.5)] px-3 py-1.5 text-xs tracking-[0.02em] transition hover:border-[rgb(var(--accent)/0.4)] hover:text-[rgb(var(--text))]"
        >
          Contact
        </button>
        {feedback && <p aria-live="polite" className="text-[11px]">{feedback}</p>}
        <p>Information is collected from AI models such as ChatGPT and from users, and is verified by humans.</p>
        <p>This website was created by zzz.</p>
      </div>
    </footer>
  );
}
