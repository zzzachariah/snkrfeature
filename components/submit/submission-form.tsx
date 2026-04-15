"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/ui/turnstile";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/i18n/locale-provider";

const fields = [
  ["shoe_name", "Shoe name", true],
  ["brand", "Brand", true],
  ["model", "Model / version", false],
  ["release_year", "Release year", false],
  ["forefoot_midsole_tech", "Forefoot midsole tech", false],
  ["heel_midsole_tech", "Heel midsole tech", false],
  ["outsole_tech", "Outsole tech", false],
  ["upper_tech", "Upper tech", false],
  ["cushioning_feel", "Cushioning feel", false],
  ["court_feel", "Court feel", false],
  ["bounce", "Bounce", false],
  ["stability", "Stability", false],
  ["traction", "Traction", false],
  ["fit", "Fit / containment", false],
  ["tags", "Tags (comma separated)", false],
  ["source_links", "Source links (comma separated)", false]
] as const;

type FormMode = "new_shoe" | "correction";

export function SubmissionForm({
  mode,
  initialValues = {},
  targetShoeId,
  targetShoeLabel,
  originalSnapshot
}: {
  mode: FormMode;
  initialValues?: Record<string, string | number | null | undefined>;
  targetShoeId?: string;
  targetShoeLabel?: string;
  originalSnapshot?: Record<string, unknown>;
}) {
  const { translate } = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setIsError(true);
      setMessage("Complete Turnstile verification first.");
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setMessage("");

    try {
      const formData = new FormData(e.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...payload, turnstileToken: token })
      });

      const rawText = await res.text();
      let data: { ok?: boolean; message?: string } | null = null;

      if (rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText) as { ok?: boolean; message?: string };
        } catch {
          setIsError(true);
          setMessage(`Server returned invalid JSON (status ${res.status}).`);
          return;
        }
      }

      if (!res.ok) {
        setIsError(true);
        setMessage(data?.message ?? `Submit failed with status ${res.status}.`);
        return;
      }

      if (!data) {
        setIsError(true);
        setMessage("Submit failed: server returned an empty response.");
        return;
      }

      setIsError(data.ok === false);
      setMessage(data.message ?? "Submitted");
      if (data.ok !== false) {
        setResultModalOpen(true);
      }
    } catch {
      setIsError(true);
      setMessage("Network error while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleModalConfirm() {
    setResultModalOpen(false);
    formRef.current?.reset();
    setToken("");
    setMessage("");
    setIsError(false);
  }

  return (
    <main className="container-shell py-8">
      <form ref={formRef} onSubmit={onSubmit} className="surface-card premium-border mx-auto grid max-w-5xl gap-4 rounded-2xl p-6 md:grid-cols-2">
        <input type="hidden" name="submission_type" value={mode} />
        {targetShoeId && <input type="hidden" name="target_shoe_id" value={targetShoeId} />}
        {originalSnapshot && <input type="hidden" name="original_snapshot" value={JSON.stringify(originalSnapshot)} />}

        <div className="md:col-span-2 space-y-2">
          <h1 className="text-2xl font-semibold tracking-[0.015em]">
            {mode === "correction" ? translate("Submit correction") : translate("Submit sneaker information")}
          </h1>
          <p className="text-sm soft-text">
            {mode === "correction"
              ? `${translate("You're submitting a correction for")} ${targetShoeLabel ?? translate("an existing published shoe")}. ${translate("This goes to the same review queue and approval will update the existing record.")}`
              : translate("Submissions are stored as raw payload, normalized server-side, and routed to admin review before publication.")}
          </p>
        </div>

        {fields.map(([name, label, required]) => (
          <div key={name}>
            <label className="mb-1 block text-xs soft-text">{translate(label)}</label>
            <Input
              name={name}
              placeholder={translate(label)}
              required={required}
              type={name === "release_year" ? "number" : "text"}
              defaultValue={initialValues[name] == null ? "" : String(initialValues[name])}
            />
          </div>
        ))}

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs soft-text">{translate("Story / background notes")}</label>
          <textarea
            name="story_notes"
            defaultValue={initialValues.story_notes == null ? "" : String(initialValues.story_notes)}
            className="min-h-24 w-full rounded-xl border border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.78)] p-3 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--ring)/0.8)] focus:ring-4 focus:ring-[rgb(var(--ring)/0.16)]"
            placeholder={translate("Release context, design intent, notable versions, community notes.")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs soft-text">{translate("Raw notes (required)")}</label>
          <textarea
            name="raw_text"
            defaultValue={initialValues.raw_text == null ? "" : String(initialValues.raw_text)}
            className="min-h-40 w-full rounded-xl border border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.78)] p-3 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--ring)/0.8)] focus:ring-4 focus:ring-[rgb(var(--ring)/0.16)]"
            placeholder={translate("Paste your full performance observations and source snippets...")}
            required
          />
        </div>

        <div className="md:col-span-2 rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.5)] p-3">
          <TurnstileWidget onToken={setToken} />
        </div>

        <div className="md:col-span-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? translate("Submitting...") : translate("Submit for review")}
          </Button>
          {message && isError && <p className="text-xs text-red-400">{message}</p>}
        </div>
      </form>

      <Modal open={resultModalOpen} onClose={handleModalConfirm} title="Submission received">
        <p className="text-sm soft-text">{message}</p>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={handleModalConfirm}>
            {translate("Back to submit")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
