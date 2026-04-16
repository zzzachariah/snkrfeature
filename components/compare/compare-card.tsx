"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";
import { useLocale } from "@/components/i18n/locale-provider";
import { Shoe } from "@/lib/types";
import {
  getBounceScore,
  getCourtFeelScore,
  getCushioningFeelScore,
  getFitScore,
  getStabilityScore,
  getTractionScore
} from "@/lib/shoe-scoring";

type CardField = {
  key: string;
  label: string;
  value: string;
  contentType: "descriptive" | "brand" | "username" | "email" | "shoe_name" | "technology";
  keepRaw?: boolean;
  differs?: boolean;
};

type CompareCardProps = {
  shoe: Shoe;
  fields: CardField[];
  metricDiffMap: Map<string, boolean>;
  highlightDiffs: boolean;
  onRemove: (id: string) => void;
};

type MetricConfig = {
  key: string;
  label: string;
  value: string | null | undefined;
  score: number;
  differs?: boolean;
};

const METRIC_BAR = "h-1.5 overflow-hidden rounded-full bg-[rgb(var(--muted)/0.35)]";

function getMetricConfigs(shoe: Shoe): MetricConfig[] {
  return [
    {
      key: "cushioning_feel",
      label: "Cushioning Feel",
      value: shoe.spec.cushioning_feel,
      score: getCushioningFeelScore(shoe.spec.cushioning_feel ?? "")
    },
    {
      key: "court_feel",
      label: "Court Feel",
      value: shoe.spec.court_feel,
      score: getCourtFeelScore(shoe.spec.court_feel ?? "")
    },
    {
      key: "bounce",
      label: "Bounce",
      value: shoe.spec.bounce,
      score: getBounceScore(shoe.spec.bounce ?? "")
    },
    {
      key: "stability",
      label: "Stability",
      value: shoe.spec.stability,
      score: getStabilityScore(shoe.spec.stability ?? "")
    },
    {
      key: "traction",
      label: "Traction",
      value: shoe.spec.traction,
      score: getTractionScore(shoe.spec.traction ?? "")
    },
    {
      key: "fit",
      label: "Fit",
      value: shoe.spec.fit,
      score: getFitScore(shoe.spec.fit ?? "")
    }
  ];
}

function metricTone(score: number) {
  if (score < 35) return "bg-[rgb(var(--muted)/0.72)]";
  if (score < 55) return "bg-[rgb(var(--ring)/0.52)]";
  if (score < 75) return "bg-[rgb(var(--accent)/0.72)]";
  return "bg-[rgb(var(--accent)/0.9)]";
}

export function CompareCard({ shoe, fields, metricDiffMap, highlightDiffs, onRemove }: CompareCardProps) {
  const { translate } = useLocale();
  const metrics = getMetricConfigs(shoe).map((metric) => ({
    ...metric,
    differs: metricDiffMap.get(metric.key) ?? false
  }));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.985 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="surface-card premium-border flex h-full flex-col rounded-2xl p-3.5 shadow-[0_8px_30px_rgb(var(--bg-shadow)/0.14)] sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-[0.18em] soft-text sm:text-[11px]">
            <span data-field-key="brand">{shoe.brand}</span> • {shoe.release_year ?? translate("Not yet added")}
          </p>
          <h3 data-field-key="shoe_name" className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[rgb(var(--text))] sm:text-base">
            {shoe.shoe_name}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => onRemove(shoe.id)}
          className="rounded-lg border border-[rgb(var(--muted)/0.58)] p-1.5 soft-text transition hover:border-[rgb(var(--ring)/0.5)] hover:text-[rgb(var(--text))]"
          aria-label={translate("Delete")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-[rgb(var(--muted)/0.42)] bg-[rgb(var(--bg-elev)/0.58)] px-2.5 py-2 text-xs leading-5 soft-text">
        {shoe.spec.playstyle_summary ? (
          <DynamicTranslatedText as="p" text={shoe.spec.playstyle_summary} contentType="descriptive" />
        ) : (
          <p>{translate("No playstyle summary available yet.")}</p>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {(shoe.spec.tags ?? []).slice(0, 5).map((tag) => (
          <Badge key={tag}>
            <DynamicTranslatedText as="span" text={tag} contentType="descriptive" />
          </Badge>
        ))}
      </div>

      <div className="mt-3 space-y-1.5">
        {fields.map((field) => (
          <div
            key={`${shoe.id}-${field.key}`}
            className={`rounded-lg border px-2.5 py-2 transition ${
              highlightDiffs && field.differs
                ? "border-[rgb(var(--ring)/0.52)] bg-[rgb(var(--accent)/0.11)]"
                : "border-[rgb(var(--muted)/0.34)] bg-[rgb(var(--bg-elev)/0.44)]"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] soft-text">{translate(field.label)}</p>
            {field.keepRaw ? (
              <p className="mt-1 text-xs font-medium leading-5 text-[rgb(var(--text)/0.94)]">{field.value}</p>
            ) : (
              <DynamicTranslatedText
                as="p"
                className="mt-1 text-xs font-medium leading-5 text-[rgb(var(--text)/0.94)]"
                text={field.value}
                contentType={field.contentType}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-[rgb(var(--muted)/0.36)] bg-[rgb(var(--bg-elev)/0.44)] p-2.5">
        <p className="text-[10px] uppercase tracking-[0.16em] soft-text">{translate("Performance profile")}</p>
        <div className="mt-2 space-y-1.5">
          {metrics.map((metric) => {
            const score = Math.max(0, Math.min(100, Math.round(metric.score)));
            return (
              <div
                key={`${shoe.id}-${metric.key}`}
                className={`rounded-md px-1.5 py-1 ${
                  highlightDiffs && metric.differs ? "bg-[rgb(var(--accent)/0.12)]" : ""
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
                  <span className="soft-text">{translate(metric.label)}</span>
                  <span className="text-[rgb(var(--text)/0.84)]">{score}</span>
                </div>
                <div className={METRIC_BAR}>
                  <div className={`h-full rounded-full transition-all duration-300 ${metricTone(score)}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pt-1">
        <Link
          href={`/shoes/${shoe.slug}`}
          className="interactive-soft inline-flex w-full items-center justify-center rounded-lg border border-[rgb(var(--ring)/0.4)] bg-[rgb(var(--accent)/0.88)] px-3 py-2 text-xs font-medium text-white transition hover:bg-[rgb(var(--accent))]"
        >
          {translate("View shoe")}
        </Link>
      </div>
    </motion.article>
  );
}
