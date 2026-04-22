"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SneakerLoader } from "@/components/ui/sneaker-loader";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { TurnstileWidget } from "@/components/ui/turnstile";
import { RequiredReadingGate } from "@/components/auth/required-reading-gate";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/locale-provider";

const CLIENT_TIMEOUT_MS = 12000;

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const stagger = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } }
};
const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease } }
};

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
  const { translate } = useLocale();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gateOpen, setGateOpen] = useState(true);
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
      if (pathname !== redirectTarget) {
        router.push(redirectTarget);
        router.refresh();
      }
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
    <>
      {gateOpen && <RequiredReadingGate onContinue={() => setGateOpen(false)} />}

      <AuthShell
        eyebrow="new account"
        heading="Build your shelf on snkrfeature."
        accentWord="snkrfeature"
        subheading="Create an account to submit shoe data, keep your saved compares, and join on-court discussions."
      >
        <motion.form
          onSubmit={onSubmit}
          initial="initial"
          animate="animate"
          variants={stagger}
          className={`glass-card mx-auto w-full max-w-md space-y-5 p-7 md:p-8 ${gateOpen ? "pointer-events-none select-none opacity-60" : ""}`}
        >
          <motion.div variants={fadeUp} className="space-y-1.5">
            <p className="auth-eyebrow">{translate("sign up")}</p>
            <h2 className="text-[28px] font-semibold tracking-[-0.02em]">{translate("Create account")}</h2>
            <p className="text-sm soft-text">
              {translate("Create your account to submit sneaker data and join discussions.")}
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <FloatingInput
              label={translate("Username")}
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <FloatingInput
              label={translate("Email")}
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              type="email"
              autoComplete="email"
              required
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <FloatingInput
              label={translate("Password")}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              type="password"
              autoComplete="new-password"
              required
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <TurnstileWidget onToken={setTurnstileToken} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.18, ease }}>
              <Button type="submit" className="group h-11 w-full text-[0.95rem]" disabled={submitting}>
                <span className="inline-flex items-center gap-2">
                  {submitting ? translate("Creating account...") : translate("Create account")}
                  {!submitting && (
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5" />
                  )}
                </span>
              </Button>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitting && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease }}
              >
                <SneakerLoader compact label="Creating your account" />
              </motion.div>
            )}
            {message && !submitting && (
              <motion.div
                key={`${error ? "err" : "ok"}-${message}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.24, ease }}
              >
                <FeedbackMessage message={message} isError={error} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p variants={fadeUp} className="pt-1 text-xs soft-text">
            {translate("Already have an account?")}{" "}
            <Link href="/login" className="text-[rgb(var(--text))] underline-offset-4 hover:underline">
              {translate("Log in")}
            </Link>
          </motion.p>
        </motion.form>
      </AuthShell>
    </>
  );
}
