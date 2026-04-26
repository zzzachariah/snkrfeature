import { Shoe } from "@/lib/types";
import {
  getBounceScore,
  getCourtFeelScore,
  getCushioningFeelScore,
  getFitScore,
  getStabilityScore,
  getTractionScore
} from "@/lib/shoe-scoring";

export type MetricKey = "cushioning_feel" | "court_feel" | "bounce" | "stability" | "traction" | "fit";

export type MetricDef = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  score: (shoe: Shoe) => number;
  descriptor: (shoe: Shoe) => string;
};

export const METRICS: MetricDef[] = [
  {
    key: "cushioning_feel",
    label: "Cushioning",
    shortLabel: "Cushioning",
    score: (shoe) => getCushioningFeelScore(shoe.spec.cushioning_feel ?? ""),
    descriptor: (shoe) => shoe.spec.cushioning_feel ?? ""
  },
  {
    key: "court_feel",
    label: "Court Feel",
    shortLabel: "Court Feel",
    score: (shoe) => getCourtFeelScore(shoe.spec.court_feel ?? ""),
    descriptor: (shoe) => shoe.spec.court_feel ?? ""
  },
  {
    key: "bounce",
    label: "Bounce",
    shortLabel: "Bounce",
    score: (shoe) => getBounceScore(shoe.spec.bounce ?? ""),
    descriptor: (shoe) => shoe.spec.bounce ?? ""
  },
  {
    key: "stability",
    label: "Stability",
    shortLabel: "Stability",
    score: (shoe) => getStabilityScore(shoe.spec.stability ?? ""),
    descriptor: (shoe) => shoe.spec.stability ?? ""
  },
  {
    key: "traction",
    label: "Traction",
    shortLabel: "Traction",
    score: (shoe) => getTractionScore(shoe.spec.traction ?? ""),
    descriptor: (shoe) => shoe.spec.traction ?? ""
  },
  {
    key: "fit",
    label: "Fit",
    shortLabel: "Fit",
    score: (shoe) => getFitScore(shoe.spec.fit ?? ""),
    descriptor: (shoe) => shoe.spec.fit ?? ""
  }
];

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreFor(shoe: Shoe, key: MetricKey) {
  const metric = METRICS.find((m) => m.key === key);
  return metric ? clampScore(metric.score(shoe)) : 0;
}

export type ShoeLineStyle = {
  strokeWidth: number;
  dashArray?: string;
  opacity: number;
};

export const SHOE_LINE_STYLES: ShoeLineStyle[] = [
  { strokeWidth: 1.8, opacity: 0.92 },
  { strokeWidth: 1.4, dashArray: "6 4", opacity: 0.78 },
  { strokeWidth: 1.2, dashArray: "2 4", opacity: 0.7 },
  { strokeWidth: 1.1, dashArray: "4 3 1 3", opacity: 0.65 },
  { strokeWidth: 1, dashArray: "1 3", opacity: 0.6 }
];

export function getLineStyle(index: number) {
  return SHOE_LINE_STYLES[index] ?? SHOE_LINE_STYLES[SHOE_LINE_STYLES.length - 1];
}

export const SPEC_ROWS: Array<{
  key: string;
  label: string;
  get: (shoe: Shoe) => string | null;
  /**
   * When true the row's value renders untranslated (forefoot/heel midsole
   * tech names are kept in their original language per editorial direction).
   */
  protectValue?: boolean;
}> = [
  {
    key: "forefoot",
    label: "Forefoot Midsole",
    get: (shoe) => shoe.spec.forefoot_midsole_tech ?? null,
    protectValue: true,
  },
  {
    key: "heel",
    label: "Heel Midsole",
    get: (shoe) => shoe.spec.heel_midsole_tech ?? null,
    protectValue: true,
  },
  { key: "outsole", label: "Outsole", get: (shoe) => shoe.spec.outsole_tech ?? null },
  { key: "upper", label: "Upper", get: (shoe) => shoe.spec.upper_tech ?? null },
  { key: "traction", label: "Traction", get: (shoe) => shoe.spec.traction ?? null },
  { key: "fit_profile", label: "Fit Profile", get: (shoe) => shoe.spec.fit ?? null },
];
