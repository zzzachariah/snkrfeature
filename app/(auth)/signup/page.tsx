"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLoader } from "@/components/ui/brand-loader";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/ui/turnstile";
import { RequiredReadingGate } from "@/components/auth/required-reading-gate";
import { createClient } from "@/lib/supabase/client";

const CLIENT_TIMEOUT_MS = 12000;

function devLog(step: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[signup] ${step}`, payload ?? "");
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

export default function SignupPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gateOpen, setGateOpen] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const redirectTarget = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    devLog("form submit started");
    setError(false);
    setMessage("");
    setSubmitting(true);

    try {
      if (!form.username || !form.email || !form.password) {
        setError(true);
        setMessage("Please fill in username, email, and password.");
        return;
      }

      if (!form.email.includes("@")) {
        setError(true);
        setMessage("Please enter a valid email address.");
        return;
      }

      if (form.password.length < 8) {
        setError(true);
        setMessage("Password must be at least 8 characters.");
        return;
      }

      if (!turnstileToken) {
        setError(true);
        setMessage("Please complete verification before signing up.");
        return;
      }

      const res = await fetchWithTimeout("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken })
      });

      const data = await res.json();
      devLog("api response", data);

      if (!res.ok || !data.ok) {
        setError(true);
        setMessage(data.message ?? "Sign up failed.");
        return;
      }

      const supabase = createClient();
      if (supabase) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

        devLog(
          "supabase sign-in completed",
          signInError ? { error: signInError.message } : { ok: true }
        );

        if (signInError) {
          setError(true);
          setMessage(`Account created, but auto-login failed: ${signInError.message}`);
          return;
        }
      }

      setMessage("Account created successfully. Redirecting...");
      devLog("navigation start", { target: redirectTarget });
      router.push(redirectTarget);
    } catch {
      setError(true);
      setMessage("Signup request timed out or failed. Please try again.");
      devLog("flow failed");
    } finally {
      setSubmitting(false);
      devLog("loading cleared");
    }
  }

  return (
    <main className="container-shell py-10">
      {gateOpen && <RequiredReadingGate onContinue={() => setGateOpen(false)} />}
      <form onSubmit={onSubmit} className={`surface-card premium-border mx-auto max-w-md space-y-4 rounded-3xl p-7 ${gateOpen ? "pointer-events-none select-none" : ""}`}>
        <h1 className="text-2xl font-semibold tracking-[0.02em]">Sign up</h1>
        <p className="text-sm soft-text">
          Create your account to submit sneaker data and join discussions.
        </p>

        <div>
          <label className="mb-1 block text-xs soft-text">Username</label>
          <Input
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs soft-text">Email</label>
          <Input
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            type="email"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs soft-text">Password</label>
          <Input
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            type="password"
            required
          />
        </div>

        <TurnstileWidget onToken={setTurnstileToken} />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>

        {submitting && <BrandLoader compact label="Creating your account" />}
        {message && <FeedbackMessage message={message} isError={error} />}

        <p className="text-xs soft-text">
          Already have an account?{" "}
          <Link href="/login" className="text-[rgb(var(--accent))] hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
