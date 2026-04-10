"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RequiredReadingGate({ onContinue }: { onContinue: () => void }) {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--glass-overlay)/0.72)] p-4 backdrop-blur-sm">
      <div className="surface-card premium-border w-full max-w-2xl rounded-3xl p-5 shadow-[0_30px_72px_rgb(var(--glass-shadow)/0.42)] md:p-6">
        <div className="border-b border-[rgb(var(--muted)/0.35)] pb-4">
          <h2 className="text-2xl font-semibold tracking-[0.015em] md:text-3xl">Sample</h2>
          <p className="mt-1 text-sm soft-text">Sample subtitle</p>
          <p className="mt-2 text-xs soft-text">By Sample author</p>
        </div>

        <div className="mt-4 max-h-[46vh] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed soft-text md:max-h-[50vh]">
          <p>
            This is sample reading content designed to behave like a required pre-signup briefing. It demonstrates how longer content remains comfortable to read before account creation.
          </p>
          <p>
            The purpose of this step is to make sure users intentionally acknowledge key information before they proceed. The layout keeps typography calm and clear while preserving focus.
          </p>
          <p>
            You can replace this placeholder with policy details, platform expectations, moderation standards, and other onboarding context at any time without changing the signup logic itself.
          </p>
          <p>
            Once the reading is complete, check the confirmation box below. The continue action will then unlock the existing signup form exactly as it currently works.
          </p>
        </div>

        <div className="mt-5 border-t border-[rgb(var(--muted)/0.35)] pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-4 w-4 accent-[rgb(var(--accent))]"
            />
            <span>Completed reading</span>
          </label>
          <Button className="mt-4 w-full sm:w-auto" disabled={!completed} onClick={onContinue}>
            Continue to Sign Up
          </Button>
        </div>
      </div>
    </div>
  );
}
