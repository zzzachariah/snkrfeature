"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandLoader } from "@/components/ui/brand-loader";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/ui/turnstile";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/locale-provider";

const CLIENT_TIMEOUT_MS = 12000;
const SESSION_SYNC_TIMEOUT_MS = 5000;

function devLog(step: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[login] ${step}`, payload ?? "");
  }
}

function normalizeRedirectTarget(raw: string | null): Route {
  if (!raw) return "/dashboard" as Route;
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard" as Route;
  return raw as Route;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = CLIENT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export default function LoginPage() {
  const { translate } = useLocale();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const redirectTarget = normalizeRedirectTarget(nextPath);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    devLog("form submit started");
    setError(false);
    setMessage("");
    setSubmitting(true);

    try {
      if (!turnstileToken) {
        setError(true);
        setMessage("Please complete human verification.");
        return;
      }

      const res = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, turnstileToken })
      });

      const data = await res.json();
      devLog("api response", data);

      if (!res.ok || !data.ok) {
        setError(true);
        setMessage(data.message ?? "Login failed.");
        return;
      }

      devLog("login success response received");
      devLog("session sync start");

      const supabase = createClient();
      if (supabase && data.session?.access_token && data.session?.refresh_token) {
        const syncPromise = supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        const timeoutPromise = new Promise<{ error: Error }>((resolve) =>
          setTimeout(() => resolve({ error: new Error("Session sync timeout") }), SESSION_SYNC_TIMEOUT_MS)
        );

        const { error: sessionError } = await Promise.race([syncPromise, timeoutPromise]);
        if (sessionError) {
          throw sessionError;
        }
      }

      devLog("session sync end", "client session synchronized");

      setMessage("Login successful. Redirecting...");
      devLog("redirect start", { target: redirectTarget });
      if (pathname !== redirectTarget) {
        router.replace(redirectTarget);
        router.refresh();
      }
      devLog("redirect end");

      const currentSession = supabase ? await supabase.auth.getSession() : null;
      devLog(
        "auth state updated",
        currentSession?.data?.session ? "session present" : "session not present"
      );
    } catch (err) {
      setError(true);
      setMessage("Login request timed out or failed. Please try again.");
      devLog("flow failed", err);
    } finally {
      setSubmitting(false);
      devLog("loading cleared");
    }
  }

  return (
    <main className="container-shell py-10">
      <form
        onSubmit={onSubmit}
        className="surface-card premium-border mx-auto max-w-md space-y-4 rounded-3xl p-7"
      >
        <h1 className="text-2xl font-semibold tracking-[0.02em]">{translate("Login")}</h1>
        <p className="text-sm soft-text">{translate("Sign in with email or username.")}</p>

        <div>
          <label className="mb-1 block text-xs soft-text">{translate("Email or username")}</label>
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={translate("kobe24 or mail@domain.com")}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs soft-text">{translate("Password")}</label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={translate("••••••••")}
            type="password"
            required
          />
        </div>

        <TurnstileWidget onToken={setTurnstileToken} />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? translate("Signing in...") : translate("Sign in")}
        </Button>

        {submitting && <BrandLoader compact label="Authenticating" />}
        {message && <FeedbackMessage message={message} isError={error} />}

        <p className="text-xs soft-text">
          {translate("Need an account?")}{" "}
          <Link href="/signup" className="text-[rgb(var(--accent))] hover:underline">
            {translate("Sign up")}
          </Link>
        </p>
      </form>
    </main>
  );
}
