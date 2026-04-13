const DASH_VARIANTS_REGEX = /[‐‑‒–—―−]/g;
const SPACE_REGEX = /\s+/g;

const STABILITY_DEFAULT = 70;
const TRACTION_DEFAULT = 72;
const FIT_DEFAULT = 78;

export const STABILITY_EXACT: Record<string, number> = {
  "very poor": 12,
  "poor": 20,
  "below expectation": 32,
  "below average": 35,
  "low": 40,
  "low-moderate": 48,
  "limited": 50,
  "limited-moderate": 54,
  "moderate": 58,
  "average": 60,
  "decent": 64,
  "moderate to good": 66,
  "moderate-good": 68,
  "good": 74,
  "solid": 77,
  "solid platform": 79,
  "good to very good": 81,
  "strong": 84,
  "very good": 88,
  "very strong": 90,
  "high": 92,
  "very high": 96,
  "excellent": 98,
  "elite": 100,
  "top-tier": 100,
  "top tier": 100,
  "stable": 80,
  "supportive platform": 82,
  "supportive": 84,
  "highly stable": 94,
  "elite stability": 100
};

export const TRACTION_BASE: Record<string, number> = {
  "very poor": 12,
  "poor": 20,
  "below average": 35,
  mixed: 42,
  polarizing: 48,
  "mixed to good": 56,
  decent: 64,
  good: 72,
  "good overall": 73,
  "generally good": 73,
  solid: 78,
  "good to very good": 80,
  "strong overall": 86,
  "very good": 88,
  great: 92,
  excellent: 97,
  "excellent overall": 97,
  elite: 100,
  "top-tier": 100,
  "top tier": 100
};

export const TRACTION_MODIFIERS: Record<string, number> = {
  "clean court": 4,
  "clean courts": 4,
  "clean floor": 4,
  "clean floors": 4,
  indoors: 2,
  indoor: 2,
  outdoors: 1,
  outdoor: 1,
  "for the price": 2,
  "flow version": 2,
  "need wiping": -4,
  dust: -6,
  dusty: -6,
  "weaker on dust": -8,
  "less forgiving in dust": -7,
  "less loved outdoors": -4,
  "clean-court dependent": -6,
  "pattern-dependent": -5,
  "depending on rubber": -4,
  "durability mixed": -5,
  "mixed before": -3
};

export const TRACTION_EXACT: Record<string, number> = {
  "excellent on clean courts": 99,
  "excellent on clean floors": 99,
  "excellent for the price": 98,
  "excellent overall": 97,
  "very good; dust can still matter": 83,
  "great on clean courts, weaker on dust": 84,
  "great on clean courts; less forgiving in dust": 85,
  "good but can need wiping": 68,
  "good on clean courts, durability mixed": 66,
  "generally good; can need wiping": 69,
  "mixed to good depending on rubber": 56,
  "polarizing; clean-court dependent": 42,
  "good after outsole revision; more mixed before": 71,
  "very good indoors, less loved outdoors": 82,
  "good outdoors": 73,
  "good indoors, decent outdoors": 74,
  "excellent on flow version": 98,
  "elite traction": 100,
  "top-tier traction": 100
};

export const FIT_BASE: Record<string, number> = {
  painful: 20,
  "poor fit": 30,
  "bad fit": 30,
  "heel slip": 52,
  roomy: 68,
  simple: 70,
  minimal: 70,
  "budget fit": 70,
  traditional: 74,
  straightforward: 76,
  comfortable: 78,
  accommodating: 79,
  "easy to wear": 80,
  "true to size": 82,
  secure: 84,
  structured: 85,
  natural: 85,
  snug: 86,
  athletic: 86,
  agile: 86,
  supportive: 87,
  "premium-feeling": 84,
  "premium feel": 84,
  "close-fitting": 86,
  "form-fitting": 90,
  "foot-hugging": 90,
  "performance fit": 90,
  "performance-ready": 90,
  "performance-oriented": 90,
  contained: 91,
  containment: 91,
  "one-piece fit": 89,
  "one-to-one": 93,
  "glove-like": 95,
  "very secure": 94,
  "locked-in": 95,
  "locked in": 95,
  "dialed-in": 95,
  "dialed in": 95,
  lockdown: 97,
  "excellent lockdown": 98,
  "elite containment": 99,
  "hall-of-fame level lockdown": 100
};

export const FIT_POSITIVE_MODIFIERS: Record<string, number> = {
  "once broken in": 2,
  "broken in": 2,
  "after break-in": 2,
  "glove-like": 4,
  "one-to-one": 4,
  "very secure": 4,
  "excellent lockdown": 5,
  "elite containment": 5,
  "hall-of-fame level lockdown": 6,
  "foot-hugging": 4,
  "form-fitting": 3,
  "heel-contained": 3,
  "midfoot cage": 2,
  "strap helps": 2,
  "strap lockdown": 3
};

export const FIT_NEGATIVE_MODIFIERS: Record<string, number> = {
  "tricky entry": -6,
  "entry is tricky": -6,
  tight: -6,
  "slightly tight": -4,
  "can feel tight": -5,
  narrow: -5,
  narrower: -5,
  "somewhat narrow": -4,
  "slightly narrow": -3,
  "not wide-foot friendly": -8,
  "heel slip": -10,
  "minor heel slip": -3,
  "heel slip reported often": -12,
  polarizing: -8,
  painful: -20,
  bulky: -4,
  overbuilt: -5,
  substantial: -3,
  "not luxurious": -2,
  "not roomy": -3,
  "not especially streamlined": -3,
  "not the most contained laterally": -5,
  "rear feels minimal": -4,
  "can feel high in the heel": -4,
  "quirky entry": -4,
  "snug at first": -2
};

export const FIT_EXACT: Record<string, number> = {
  "secure and supportive": 90,
  "secure and true to size": 86,
  "secure and easy to wear": 84,
  "secure and comfortable": 83,
  "secure and straightforward": 82,
  "secure and accommodating": 84,
  "secure and natural": 86,
  "secure and agile": 87,
  "secure and athletic": 87,
  "secure and polished": 86,
  "secure and streamlined": 87,
  "secure and premium-feeling": 86,
  "supportive and structured": 89,
  "snug and secure": 90,
  "snug and very secure": 92,
  "snug and natural": 88,
  "snug performance fit": 90,
  "locked-in speed fit": 95,
  "secure one-to-one fit": 94,
  "secure and glove-like": 96,
  "excellent containment once sized right": 97,
  "excellent lockdown": 98,
  "hall-of-fame level lockdown": 100,
  "forefoot secure; heel slip reported often": 62,
  "secure but can feel tight in front": 77,
  "secure but simple": 78,
  "secure budget fit": 70,
  "simple, narrow, low-volume fit": 63,
  "very polarizing; tight and painful for some": 20
};

export function normalizeScoreText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(DASH_VARIANTS_REGEX, "-")
    .replace(/\s*([;,])\s*/g, "$1 ")
    .replace(SPACE_REGEX, " ")
    .trim();
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeMap(map: Record<string, number>) {
  return Object.fromEntries(Object.entries(map).map(([phrase, score]) => [normalizeScoreText(phrase), score]));
}

const NORMALIZED_STABILITY_EXACT = normalizeMap(STABILITY_EXACT);
const NORMALIZED_TRACTION_BASE = normalizeMap(TRACTION_BASE);
const NORMALIZED_TRACTION_MODIFIERS = normalizeMap(TRACTION_MODIFIERS);
const NORMALIZED_TRACTION_EXACT = normalizeMap(TRACTION_EXACT);
const NORMALIZED_FIT_BASE = normalizeMap(FIT_BASE);
const NORMALIZED_FIT_POSITIVE_MODIFIERS = normalizeMap(FIT_POSITIVE_MODIFIERS);
const NORMALIZED_FIT_NEGATIVE_MODIFIERS = normalizeMap(FIT_NEGATIVE_MODIFIERS);
const NORMALIZED_FIT_EXACT = normalizeMap(FIT_EXACT);

function findLongestPhraseMatch(text: string, phrases: string[]) {
  return phrases
    .filter((phrase) => phrase.length > 0 && text.includes(phrase))
    .sort((a, b) => b.length - a.length)[0];
}

function sumModifiersOnce(text: string, modifiers: Record<string, number>) {
  const phrases = Object.keys(modifiers).sort((a, b) => b.length - a.length);
  const consumedRanges: Array<{ start: number; end: number }> = [];
  let total = 0;

  for (const phrase of phrases) {
    let from = 0;
    while (from < text.length) {
      const index = text.indexOf(phrase, from);
      if (index === -1) break;

      const end = index + phrase.length;
      const overlaps = consumedRanges.some((range) => index < range.end && end > range.start);

      if (!overlaps) {
        consumedRanges.push({ start: index, end });
        total += modifiers[phrase];
      }

      from = index + phrase.length;
    }
  }

  return total;
}

export function getStabilityScore(text: string) {
  const normalized = normalizeScoreText(text);
  if (!normalized) return STABILITY_DEFAULT;

  if (normalized in NORMALIZED_STABILITY_EXACT) return clampScore(NORMALIZED_STABILITY_EXACT[normalized]);

  const phrase = findLongestPhraseMatch(normalized, Object.keys(NORMALIZED_STABILITY_EXACT));
  if (phrase) return clampScore(NORMALIZED_STABILITY_EXACT[phrase]);

  return STABILITY_DEFAULT;
}

export function getTractionScore(text: string) {
  const normalized = normalizeScoreText(text);
  if (!normalized) return TRACTION_DEFAULT;

  if (normalized in NORMALIZED_TRACTION_EXACT) return clampScore(NORMALIZED_TRACTION_EXACT[normalized]);

  const basePhrase = findLongestPhraseMatch(normalized, Object.keys(NORMALIZED_TRACTION_BASE));
  if (!basePhrase) return TRACTION_DEFAULT;

  const base = NORMALIZED_TRACTION_BASE[basePhrase];
  const modifierTotal = sumModifiersOnce(normalized, NORMALIZED_TRACTION_MODIFIERS);

  return clampScore(base + modifierTotal);
}

export function getFitScore(text: string) {
  const normalized = normalizeScoreText(text);
  if (!normalized) return FIT_DEFAULT;

  if (normalized in NORMALIZED_FIT_EXACT) return clampScore(NORMALIZED_FIT_EXACT[normalized]);

  const basePhrase = findLongestPhraseMatch(normalized, Object.keys(NORMALIZED_FIT_BASE));
  if (!basePhrase) return FIT_DEFAULT;

  const base = NORMALIZED_FIT_BASE[basePhrase];
  const positive = sumModifiersOnce(normalized, NORMALIZED_FIT_POSITIVE_MODIFIERS);
  const negative = sumModifiersOnce(normalized, NORMALIZED_FIT_NEGATIVE_MODIFIERS);

  return clampScore(base + positive + negative);
}

export function getPerformanceLabel(score: number): string {
  if (score <= 24) return "Weak";
  if (score <= 39) return "Below Average";
  if (score <= 54) return "Decent";
  if (score <= 64) return "Solid";
  if (score <= 74) return "Good";
  if (score <= 84) return "Very Good";
  if (score <= 94) return "Excellent";
  return "Elite";
}
