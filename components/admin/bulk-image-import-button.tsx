"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useLocale } from "@/components/i18n/locale-provider";

type BulkSummary = {
  total_checked: number;
  skipped: number;
  skipped_approved: number;
  skipped_pending: number;
  imported_and_approved: number;
  failed: number;
  failures: Array<{ shoe_id: string; shoe_name: string; error: string; detail?: string }>;
};

export function BulkImageImportButton() {
  const { translate } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runBulkImport() {
    setLoading(true);
    setError(null);
    setSummary(null);
    setMessage(translate("Bulk image import started"));

    try {
      const response = await fetch("/api/admin/shoes/images/bulk", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "Bulk image import failed");
      }

      setMessage(translate(json?.message ?? "Bulk image import completed"));
      setSummary(json?.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk image import failed");
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={runBulkImport} disabled={loading}>
        {loading ? translate("Searching images...") : translate("Find images for all missing shoes")}
      </Button>

      {message && <FeedbackMessage message={message} />}
      {error && <FeedbackMessage message={error} isError />}

      {summary && (
        <div className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3 text-sm">
          <p>{translate("Bulk image import completed")}</p>
          <div className="mt-1 space-y-1 soft-text">
            <p>{translate("Imported and approved")}: {summary.imported_and_approved}</p>
            <p>{translate("Skipped")}: {summary.skipped} ({translate("Approved")}: {summary.skipped_approved}, {translate("Pending")}: {summary.skipped_pending})</p>
            <p>{translate("Failed")}: {summary.failed}</p>
            <p>{translate("Total checked")}: {summary.total_checked}</p>
          </div>
          {summary.failures.length > 0 && (
            <div className="mt-2 text-xs soft-text">
              {summary.failures.slice(0, 5).map((failure) => (
                <p key={failure.shoe_id}>• {failure.shoe_name}: {failure.error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
