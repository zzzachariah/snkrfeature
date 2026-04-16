"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
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
  metricExtremaMap: Map<string, { min: number; max: number }>;
  highlightDiffs: boolean;
  onRemove: (id: string) => void;
};

type MetricConfig = {
  key: string;
  label: string;
  score: number;
  differs?: boolean;
};

const METRIC_GAUGE_SIZE = 48;
const METRIC_GAUGE_STROKE = 4.5;
const METRIC_GAUGE_RADIUS = (METRIC_GAUGE_SIZE - METRIC_GAUGE_STROKE) / 2;
const METRIC_GAUGE_CIRCUMFERENCE = 2 * Math.PI * METRIC_GAUGE_RADIUS;
const METRIC_GAUGE_ARC_RATIO = 0.9;
const METRIC_GAUGE_ARC_LENGTH = METRIC_GAUGE_CIRCUMFERENCE * METRIC_GAUGE_ARC_RATIO;

function getMetricConfigs(shoe: Shoe): MetricConfig[] {
  return [
    {
      key: "cushioning_feel",
      label: "Cushioning Feel",
      score: getCushioningFeelScore(shoe.spec.cushioning_feel ?? "")
    },
    {
      key: "court_feel",
      label: "Court Feel",
      score: getCourtFeelScore(shoe.spec.court_feel ?? "")
    },
    {
      key: "bounce",
      label: "Bounce",
      score: getBounceScore(shoe.spec.bounce ?? "")
    },
    {
      key: "stability",
      label: "Stability",
      score: getStabilityScore(shoe.spec.stability ?? "")
    },
    {
      key: "traction",
      label: "Traction",
      score: getTractionScore(shoe.spec.traction ?? "")
    },
    {
      key: "fit",
      label: "Fit",
      score: getFitScore(shoe.spec.fit ?? "")
    }
  ];
}

function getGaugeStrokeClass({
  highlightDiffs,
  isBetter,
  isWorse
}: {
  highlightDiffs: boolean;
  isBetter: boolean;
  isWorse: boolean;
}) {
  if (!highlightDiffs) return "stroke-[rgb(var(--ring)/0.92)]";
  if (isBetter) return "stroke-emerald-500";
  if (isWorse) return "stroke-rose-500";
  return "stroke-[rgb(var(--ring)/0.82)]";
}

function getGaugeTextClass({
  highlightDiffs,
  isBetter,
  isWorse
}: {
  highlightDiffs: boolean;
  isBetter: boolean;
  isWorse: boolean;
}) {
  if (!highlightDiffs) return "text-[rgb(var(--ring)/0.96)]";
  if (isBetter) return "text-emerald-400";
  if (isWorse) return "text-rose-400";
  return "text-[rgb(var(--text)/0.82)]";
}

export function CompareCard({
  shoe,
  fields,
  metricDiffMap,
  metricExtremaMap,
  highlightDiffs,
  onRemove
}: CompareCardProps) {
  const { locale, translate } = useLocale();
  const [showTechDetails, setShowTechDetails] = useState(false);

  function getTechLabel(field: CardField) {
    if (field.key === "forefoot_midsole_tech") return "前掌中底科技";
    if (field.key === "heel_midsole_tech") return "后掌中底科技";
    return translate(field.label);
  }

  function getMetricLabel(label: string) {
    if (locale === "zh" && label === "Bounce") return "回弹";
    return translate(label);
  }

  const metrics = getMetricConfigs(shoe).map((metric) => ({
    ...metric,
    score: Math.max(0, Math.min(100, Math.round(metric.score))),
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
          aria-label={translate("Remove shoe from compare")}
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

      <div className="mt-3 rounded-xl border border-[rgb(var(--muted)/0.36)] bg-[rgb(var(--bg-elev)/0.44)] p-2.5">
        <p className="text-[10px] uppercase tracking-[0.16em] soft-text">{translate("Performance profile")}</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {metrics.map((metric) => {
            const extrema = metricExtremaMap.get(metric.key);
            const isHighest = (extrema?.max ?? metric.score) === metric.score;
            const isLowest = (extrema?.min ?? metric.score) === metric.score;
            const shouldCompareColors = highlightDiffs && metric.differs;
            const isBetter = shouldCompareColors && isHighest && !isLowest;
            const isWorse = shouldCompareColors && isLowest && !isHighest;

            return (
              <div key={`${shoe.id}-${metric.key}`} className="rounded-md border border-[rgb(var(--muted)/0.32)] bg-[rgb(var(--bg-elev)/0.36)] px-1.5 py-1">
                <div className="flex h-[82px] items-center gap-2">
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <svg
                      width={METRIC_GAUGE_SIZE}
                      height={METRIC_GAUGE_SIZE}
                      viewBox={`0 0 ${METRIC_GAUGE_SIZE} ${METRIC_GAUGE_SIZE}`}
                      className="-rotate-[228deg]"
                    >
                      <circle
                        cx={METRIC_GAUGE_SIZE / 2}
                        cy={METRIC_GAUGE_SIZE / 2}
                        r={METRIC_GAUGE_RADIUS}
                        fill="none"
                        strokeWidth={METRIC_GAUGE_STROKE}
                        className="stroke-[rgb(var(--muted)/0.32)]"
                        strokeLinecap="round"
                        strokeDasharray={`${METRIC_GAUGE_ARC_LENGTH} ${METRIC_GAUGE_CIRCUMFERENCE}`}
                      />
                      <motion.circle
                        cx={METRIC_GAUGE_SIZE / 2}
                        cy={METRIC_GAUGE_SIZE / 2}
                        r={METRIC_GAUGE_RADIUS}
                        fill="none"
                        strokeWidth={METRIC_GAUGE_STROKE}
                        className={`${getGaugeStrokeClass({ highlightDiffs, isBetter, isWorse })} transition-[stroke] duration-300 ease-out`}
                        strokeLinecap="round"
                        strokeDasharray={`${METRIC_GAUGE_ARC_LENGTH} ${METRIC_GAUGE_CIRCUMFERENCE}`}
                        initial={{ strokeDashoffset: METRIC_GAUGE_ARC_LENGTH }}
                        animate={{ strokeDashoffset: METRIC_GAUGE_ARC_LENGTH * (1 - metric.score / 100) }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </svg>
                    <span className={`absolute text-[11px] font-semibold transition-colors duration-300 ease-out ${getGaugeTextClass({ highlightDiffs, isBetter, isWorse })}`}>
                      {metric.score}
                    </span>
                  </div>
                  <span className="line-clamp-2 text-[11px] leading-4 soft-text">{getMetricLabel(metric.label)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowTechDetails((prev) => !prev)}
        className="mt-3 inline-flex items-center justify-between rounded-lg border border-[rgb(var(--muted)/0.42)] bg-[rgb(var(--bg-elev)/0.42)] px-2.5 py-2 text-xs soft-text transition hover:border-[rgb(var(--ring)/0.45)] hover:text-[rgb(var(--text))]"
        aria-expanded={showTechDetails}
      >
        <span>{showTechDetails ? translate("Hide tech details") : translate("Show tech details")}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${showTechDetails ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {showTechDetails ? (
          <motion.div
            key="tech-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-2 overflow-hidden"
          >
            <div className="space-y-1.5">
              {fields.map((field) => (
                <div
                  key={`${shoe.id}-${field.key}`}
                  className={`rounded-lg border px-2.5 py-2 transition ${
                    highlightDiffs && field.differs
                      ? "border-[rgb(var(--ring)/0.52)] bg-[rgb(var(--accent)/0.11)]"
                      : "border-[rgb(var(--muted)/0.34)] bg-[rgb(var(--bg-elev)/0.44)]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] soft-text">{getTechLabel(field)}</p>
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
          </motion.div>
        ) : null}
      </AnimatePresence>

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
