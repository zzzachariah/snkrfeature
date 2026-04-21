"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";

const CONTACT_EMAIL = "zzzachariah9828@gmail.com";

export function SiteFooter() {
  const pathname = usePathname();
  const { translate } = useLocale();
  const [feedback, setFeedback] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  const isAuthPath = /^\/(login|signup|register)(\/|$)/.test(pathname);

  if (isAuthPath) {
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
    <>
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
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--glass-stroke-soft)/0.5)] px-3 py-1.5 text-xs tracking-[0.02em] transition hover:border-[rgb(var(--accent)/0.4)] hover:text-[rgb(var(--text))]"
          >
            {translate("About")}
          </button>
        </div>
        {feedback && <p aria-live="polite" className="text-[11px]">{feedback}</p>}
        <p>{translate("Information is collected from AI models such as ChatGPT and from users, and is verified by humans.")}</p>
        <p>{translate("This website was created by zzz.")}</p>
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
              aria-label={translate("Close information modal")}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-[rgb(var(--subtext))] transition hover:bg-[rgb(var(--muted)/0.28)] hover:text-[rgb(var(--text))]"
              onClick={() => setInfoOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pr-10">
              <h3 className="text-2xl font-semibold tracking-[0.015em]">{translate("Hi!")}</h3>
              <p className="mt-1 text-sm soft-text">{translate("Some words")}</p>
            </div>
            <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed soft-text">
              <p>
                The idea of a platform with information on sneakers has been with me for a year. Back then, AI coding was not yet a well-developed field. Therefore, since I know absolutely nothing about coding (a bit now, I suppose), I quit. The development of technology enabled me to turn the initial idea into reality.
              </p>
              <p>
                I always spend tons of time choosing which sneaker to purchase. YouTube channels and blogs tend to have biased opinions on a shoe. Moreover, the technologies each brand presents vary in their names, function, and appeal to players. snkrfeature is designed to show unbiased information in the hope of saving you some time when deciding which shoe to purchase, and to make a purchase that fits best with your preference and taste.
              </p>
              <p>
                As a high school student, I am new to both building a website from scratch and maintaining a community. If you have any advice or would like to join as an admin (review shoe uploads) or developer, please feel free to go to the bottom of any page and press &quot;contact&quot;. At the same time, please do not attack or post offensive comments that attack others(you can say a sneaker is shit, though)
              </p>
              <p>
                By the way, if this turned out to be liked by many, perhaps I will charge a one-time fee of a dollar per account in order to cover the fees of databases and domains, etc. I hate ads myself, so there will maybe be 1 or 2, but definitely not scattered around the page. I&apos;ll decide it later.
              </p>
              <p>
                {translate("In the meantime, enjoy!")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
