"use client";

import { useEffect, useId, useRef } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

declare global {
  interface Window {
    turnstile?: {
      render: (selector: string | HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = { onToken: (token: string) => void };

export function TurnstileWidget({ onToken }: Props) {
  const { translate } = useLocale();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const id = useId().replace(/:/g, "");
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;

    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const timer = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(timer);
        const container = document.getElementById(id);
        if (container && !widgetId.current) {
          widgetId.current = window.turnstile.render(container, {
            sitekey: siteKey,
            theme: "dark",
            callback: (token: string) => onToken(token)
          });
        }
      }
    }, 150);

    return () => {
      window.clearInterval(timer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, [id, onToken, siteKey]);

  if (!siteKey) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        {translate("Turnstile is not configured. Demo verification mode is active.")}
        <button type="button" className="ml-2 underline" onClick={() => onToken("demo-token")}>{translate("Use demo token")}</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[66px] justify-center md:justify-start">
      <div id={id} />
    </div>
  );
}
