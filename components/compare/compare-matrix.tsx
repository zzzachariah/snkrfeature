"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shoe } from "@/lib/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { CompareCard } from "@/components/compare/compare-card";
import {
  getBounceScore,
  getCourtFeelScore,
  getCushioningFeelScore,
  getFitScore,
  getStabilityScore,
  getTractionScore
} from "@/lib/shoe-scoring";

type FieldConfig = {
  key: string;
  label: string;
  contentType: "descriptive" | "brand" | "username" | "email" | "shoe_name" | "technology";
  keepRaw?: boolean;
  get: (shoe: Shoe) => string;
};

const EMPTY_TEXT = "Not yet added";

const techFields: FieldConfig[] = [
  {
    key: "forefoot_midsole_tech",
    label: "Forefoot tech",
    keepRaw: true,
    contentType: "technology",
    get: (shoe) => shoe.spec.forefoot_midsole_tech ?? EMPTY_TEXT
  },
  {
    key: "heel_midsole_tech",
    label: "Heel tech",
    keepRaw: true,
    contentType: "technology",
    get: (shoe) => shoe.spec.heel_midsole_tech ?? EMPTY_TEXT
  },
  {
    key: "outsole_tech",
    label: "Outsole tech",
    contentType: "technology",
    get: (shoe) => shoe.spec.outsole_tech ?? EMPTY_TEXT
  },
  {
    key: "upper_tech",
    label: "Upper tech",
    contentType: "technology",
    get: (shoe) => shoe.spec.upper_tech ?? EMPTY_TEXT
  }
];

const metricFields: Array<{ key: string; get: (shoe: Shoe) => number }> = [
  { key: "cushioning_feel", get: (shoe) => getCushioningFeelScore(shoe.spec.cushioning_feel ?? "") },
  { key: "court_feel", get: (shoe) => getCourtFeelScore(shoe.spec.court_feel ?? "") },
  { key: "bounce", get: (shoe) => getBounceScore(shoe.spec.bounce ?? "") },
  { key: "stability", get: (shoe) => getStabilityScore(shoe.spec.stability ?? "") },
  { key: "traction", get: (shoe) => getTractionScore(shoe.spec.traction ?? "") },
  { key: "fit", get: (shoe) => getFitScore(shoe.spec.fit ?? "") }
];

export function CompareMatrix({ shoes: initialShoes }: { shoes: Shoe[] }) {
  const { translate } = useLocale();
  const [highlightDiffs, setHighlightDiffs] = useState(false);
  const [shoes, setShoes] = useState(initialShoes);

  const techDiffMap = useMemo(
    () =>
      new Map(
        techFields.map((field) => {
          const values = new Set(shoes.map((shoe) => field.get(shoe)));
          return [field.key, values.size > 1];
        })
      ),
    [shoes]
  );

  const metricDiffMap = useMemo(
    () =>
      new Map(
        metricFields.map((field) => {
          const values = new Set(shoes.map((shoe) => Math.round(field.get(shoe))));
          return [field.key, values.size > 1];
        })
      ),
    [shoes]
  );

  if (!shoes.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[rgb(var(--muted)/0.7)] p-8 soft-text">
        {translate("No shoes selected. Add IDs via the URL query string.")}
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setHighlightDiffs((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
            highlightDiffs
              ? "border-[rgb(var(--ring)/0.55)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text))] shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.18)]"
              : "border-[rgb(var(--muted)/0.5)] bg-[rgb(var(--bg-elev)/0.55)] soft-text hover:border-[rgb(var(--ring)/0.35)]"
          }`}
        >
          <span className={`h-2 w-2 rounded-full transition ${highlightDiffs ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--muted))]"}`} />
          {translate("Highlight differences")}
        </button>
        <p className="text-xs soft-text">
          {shoes.length} {translate("shoes selected for compare")}
        </p>
      </div>

      <motion.div layout className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence initial={false}>
          {shoes.map((shoe) => (
            <CompareCard
              key={shoe.id}
              shoe={shoe}
              metricDiffMap={metricDiffMap}
              highlightDiffs={highlightDiffs}
              onRemove={(id) => setShoes((prev) => prev.filter((item) => item.id !== id))}
              fields={techFields.map((field) => ({
                key: field.key,
                label: field.label,
                value: field.get(shoe),
                contentType: field.contentType,
                keepRaw: field.keepRaw,
                differs: techDiffMap.get(field.key) ?? false
              }))}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
