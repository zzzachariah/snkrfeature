"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useLocale } from "@/components/i18n/locale-provider";

type BulkStats = {
  totalShoes: number;
  missingApprovedImages: number;
};

type BulkJob = {
  id: string;
  status: "running" | "cancel_requested" | "cancelled" | "completed" | "failed";
  total_count: number;
  processed_count: number;
  success_count: number;
  skip_count: number;
  failure_count: number;
  current_shoe_label?: string | null;
  started_at: string;
  updated_at: string;
  completed_at?: string | null;
};

type BulkJobItem = {
  shoe_id: string;
  shoe_label: string;
  status: "failed" | "skipped";
  error_message?: string | null;
};

export function BulkImageImportButton() {
  const { translate } = useLocale();
  const [stats, setStats] = useState<BulkStats>({ totalShoes: 0, missingApprovedImages: 0 });
  const [activeJob, setActiveJob] = useState<BulkJob | null>(null);
  const [latestJob, setLatestJob] = useState<BulkJob | null>(null);
  const [latestItems, setLatestItems] = useState<BulkJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const progressPercent = useMemo(() => {
    const total = activeJob?.total_count ?? latestJob?.total_count ?? 0;
    const processed = activeJob?.processed_count ?? latestJob?.processed_count ?? 0;
    if (!total) return 0;
    return Math.min(100, Math.round((processed / total) * 100));
  }, [activeJob, latestJob]);

  const hydrateState = useCallback((payload: { stats?: BulkStats; active_job?: BulkJob | null; latest_job?: BulkJob | null; latest_items?: BulkJobItem[] }) => {
    setStats(payload.stats ?? { totalShoes: 0, missingApprovedImages: 0 });
    setActiveJob(payload.active_job ?? null);
    setLatestJob(payload.latest_job ?? null);
    setLatestItems(payload.latest_items ?? []);
  }, []);

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/admin/shoes/images/bulk", { method: "GET", cache: "no-store" });
    const json = await response.json();
    if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Failed to load bulk image status");
    hydrateState(json);
  }, [hydrateState]);

  const tickJob = useCallback(async () => {
    const response = await fetch("/api/admin/shoes/images/bulk/tick", { method: "POST" });
    const json = await response.json();
    if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Failed to update bulk image progress");
    setStats(json?.stats ?? stats);
    setActiveJob(json?.job?.status === "running" || json?.job?.status === "cancel_requested" ? json.job : null);
    setLatestJob(json?.job ?? latestJob);
  }, [latestJob, stats]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await loadStatus();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load bulk status");
      }
    }

    bootstrap();

    const interval = setInterval(async () => {
      try {
        await loadStatus();
      } catch {
        // best effort
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!activeJob || (activeJob.status !== "running" && activeJob.status !== "cancel_requested")) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      if (cancelled) return;
      try {
        await tickJob();
        await loadStatus();
      } catch {
        // continue polling
      }
    }, 1800);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeJob, tickJob, loadStatus]);

  async function startBulkImport() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/shoes/images/bulk", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Bulk image import failed");
      setMessage(translate(json?.message ?? "Bulk image import started"));
      hydrateState({ stats: json?.stats, active_job: json?.job, latest_job: json?.job, latest_items: latestItems });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk image import failed");
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }

  async function abortBulkImport() {
    setStopping(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/shoes/images/bulk/abort", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Failed to request stop");
      setMessage(translate(json?.message ?? "Stopping..."));
      hydrateState({ stats: json?.stats, active_job: json?.job, latest_job: json?.job, latest_items: latestItems });
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request stop");
    } finally {
      setStopping(false);
    }
  }

  const displayJob = activeJob ?? latestJob;
  const isRunning = activeJob?.status === "running";
  const isStopping = activeJob?.status === "cancel_requested" || stopping;

  return (
    <div className="space-y-3 rounded-2xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-4">
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p><span className="soft-text">{translate("Missing approved images")}: </span><span className="font-semibold">{stats.missingApprovedImages}</span></p>
        <p><span className="soft-text">{translate("Total shoes")}: </span><span className="font-semibold">{stats.totalShoes}</span></p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={startBulkImport} disabled={loading || isRunning || isStopping}>
          {isRunning || isStopping ? translate("Bulk job in progress") : loading ? translate("Searching images...") : translate("Find images for all missing shoes")}
        </Button>
        {(isRunning || isStopping) && (
          <Button type="button" variant="secondary" onClick={abortBulkImport} disabled={isStopping}>
            {isStopping ? translate("Stopping...") : translate("Abort")}
          </Button>
        )}
      </div>

      {message && <FeedbackMessage message={message} />}
      {error && <FeedbackMessage message={error} isError />}

      {displayJob ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">
            {translate("Status")}: {
              displayJob.status === "running"
                ? translate("Running")
                : displayJob.status === "cancel_requested"
                  ? translate("Stopping...")
                  : displayJob.status === "cancelled"
                    ? translate("Cancelled")
                    : displayJob.status === "completed"
                      ? translate("Completed")
                      : translate("Failed")
            }
          </p>
          <p>{translate("Progress")}: {displayJob.processed_count} / {displayJob.total_count}</p>
          <div className="h-2 w-full rounded-full bg-[rgb(var(--muted)/0.35)]">
            <div className="h-2 rounded-full bg-[rgb(var(--accent))]" style={{ width: `${progressPercent}%` }} />
          </div>
          <p>{translate("Imported and approved")}: {displayJob.success_count}</p>
          <p>{translate("Skipped")}: {displayJob.skip_count}</p>
          <p>{translate("Failed")}: {displayJob.failure_count}</p>
          {displayJob.current_shoe_label ? <p>{translate("Current shoe")}: {displayJob.current_shoe_label}</p> : null}
        </div>
      ) : (
        <p className="text-sm soft-text">{translate("No active bulk job")}</p>
      )}

      {latestItems.length > 0 && (
        <div className="text-xs soft-text">
          {latestItems.slice(0, 5).map((item) => (
            <p key={`${item.shoe_id}-${item.status}`}>
              • {item.shoe_label}: {item.status === "failed" ? `${translate("Failed")}${item.error_message ? ` (${item.error_message})` : ""}` : translate("Skipped")}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
