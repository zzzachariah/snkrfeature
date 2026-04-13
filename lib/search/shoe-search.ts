import { Shoe } from "@/lib/types";

const NORMALIZE_SPACE_REGEX = /\s+/g;
const STRIP_PUNCTUATION_REGEX = /[^\p{L}\p{N}]+/gu;

function toCleanLower(value?: string | null) {
  return (value ?? "").toLowerCase().trim().replace(NORMALIZE_SPACE_REGEX, " ");
}

export function normalizeSearchText(value?: string | null) {
  return toCleanLower(value).replace(STRIP_PUNCTUATION_REGEX, " ").replace(NORMALIZE_SPACE_REGEX, " ").trim();
}

export function normalizeCompactText(value?: string | null) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function tokenize(value?: string | null) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function getSearchFields(shoe: Shoe) {
  return [
    shoe.shoe_name,
    shoe.model_line,
    shoe.version_name,
    shoe.brand,
    shoe.player,
    shoe.slug,
    shoe.category,
    shoe.spec.forefoot_midsole_tech,
    shoe.spec.heel_midsole_tech,
    shoe.spec.upper_tech,
    shoe.spec.outsole_tech,
    ...(shoe.spec.tags ?? [])
  ].filter(Boolean) as string[];
}

export function rankShoeMatch(shoe: Shoe, rawQuery?: string | null) {
  const queryClean = toCleanLower(rawQuery);
  if (!queryClean) return 0;

  const queryNormalized = normalizeSearchText(queryClean);
  const queryCompact = normalizeCompactText(queryClean);
  const queryTokens = tokenize(queryClean);

  if (!queryNormalized) return 0;

  const displayNameClean = toCleanLower(shoe.shoe_name);
  const displayNameNormalized = normalizeSearchText(shoe.shoe_name);
  const displayNameCompact = normalizeCompactText(shoe.shoe_name);

  const searchFields = getSearchFields(shoe);
  const combinedText = searchFields.join(" ");
  const combinedNormalized = normalizeSearchText(combinedText);
  const combinedCompact = normalizeCompactText(combinedText);

  if (displayNameClean === queryClean) return 120;
  if (displayNameNormalized === queryNormalized || displayNameCompact === queryCompact) return 110;
  if (combinedNormalized === queryNormalized || combinedCompact === queryCompact) return 100;
  if (combinedCompact.startsWith(queryCompact) || displayNameCompact.startsWith(queryCompact)) return 90;
  if (combinedCompact.includes(queryCompact) || displayNameCompact.includes(queryCompact)) return 80;

  const tokenPool = new Set(tokenize(combinedText));
  const hasAllTokens = queryTokens.length > 0 && queryTokens.every((token) => tokenPool.has(token));
  if (hasAllTokens) return 70;

  if (queryCompact.length >= 4 && queryTokens.length === 1) {
    const startsSingleToken = Array.from(tokenPool).some((token) => token.startsWith(queryCompact));
    if (startsSingleToken) return 60;
  }

  return -1;
}
