import { SNEAKER_PROTECTED_TERMS } from "@/lib/i18n/sneakerGlossary";
import { Locale } from "@/lib/i18n/types";

const NON_TRANSLATABLE_FIELDS = new Set([
  "shoe_name",
  "brand",
  "model_line",
  "version_name",
  "slug",
  "forefoot_midsole_tech",
  "heel_midsole_tech",
  "outsole_tech",
  "upper_tech",
  "tags"
]);

const TRANSLATABLE_FIELDS = new Set([
  "playstyle_summary",
  "story_summary",
  "title",
  "content",
  "cushioning_feel",
  "court_feel",
  "bounce",
  "stability",
  "traction",
  "fit",
  "containment",
  "support",
  "torsional_rigidity"
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ORDERED_TERMS = [...SNEAKER_PROTECTED_TERMS].sort((a, b) => b.length - a.length);
const PROTECTED_REGEX = new RegExp(ORDERED_TERMS.map((term) => escapeRegex(term)).join("|"), "gi");

function protectTerms(input: string): { text: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let index = 0;

  const text = input.replace(PROTECTED_REGEX, (matched) => {
    const token = `__SNKR_TERM_${index++}__`;
    placeholders.set(token, matched);
    return token;
  });

  return { text, placeholders };
}

function restoreTerms(input: string, placeholders: Map<string, string>): string {
  let restored = input;
  placeholders.forEach((value, token) => {
    restored = restored.replaceAll(token, value);
  });
  return restored;
}

const PHRASE_MAP: Array<[RegExp, string]> = [
  [/\bthe shoe uses\b/gi, "这双鞋使用"],
  [/\bin the forefoot\b/gi, "在前掌"],
  [/\bin the heel\b/gi, "在后跟"],
  [/\bforefoot\b/gi, "前掌"],
  [/\bheel\b/gi, "后跟"],
  [/\bmidsole\b/gi, "中底"],
  [/\boutsole\b/gi, "外底"],
  [/\bupper\b/gi, "鞋面"],
  [/\bcushioning\b/gi, "缓震"],
  [/\btraction\b/gi, "抓地"],
  [/\bstability\b/gi, "稳定性"],
  [/\bbounce\b/gi, "回弹"],
  [/\bfit\b/gi, "包裹"],
  [/\bsupport\b/gi, "支撑"],
  [/\bguard(s)?\b/gi, "后卫"],
  [/\bwing(s)?\b/gi, "锋线"],
  [/\bbig(s)?\b/gi, "内线"],
  [/\bresponsive\b/gi, "响应直接"],
  [/\bsoft\b/gi, "偏软"],
  [/\bfirm\b/gi, "偏硬"],
  [/\bbalanced\b/gi, "均衡"],
  [/\bgood\b/gi, "不错"],
  [/\bgreat\b/gi, "优秀"],
  [/\bexcellent\b/gi, "出色"],
  [/\bwith\b/gi, "带"],
  [/\band\b/gi, "和"],
  [/\bfor\b/gi, "适合"],
  [/\bbetter for\b/gi, "更适合"],
  [/\bmore suitable for\b/gi, "更适合"],
  [/\bcarrier\b/gi, "承托结构"],
  [/\bmesh\/textile\b/gi, "网布/纺织"],
  [/\bsummary\b/gi, "总结"]
];

function translateEnglishToChinese(input: string): string {
  let output = input;
  PHRASE_MAP.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, replacement);
  });

  output = output
    .replace(/\s+,/g, "，")
    .replace(/,\s*/g, "，")
    .replace(/\s*\.\s*/g, "。")
    .replace(/\s*;\s*/g, "；")
    .replace(/\s*:\s*/g, "：")
    .replace(/\(\s*/g, "（")
    .replace(/\s*\)/g, "）")
    .replace(/\s{2,}/g, " ")
    .trim();

  return output;
}

export function localizeGlossaryAwareText(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  if (locale === "en") return value;

  try {
    const { text, placeholders } = protectTerms(value);
    const translated = translateEnglishToChinese(text);
    const restored = restoreTerms(translated, placeholders);
    return restored || value;
  } catch {
    return value;
  }
}

export function isGlossarySensitiveField(field: string): boolean {
  return NON_TRANSLATABLE_FIELDS.has(field);
}

export function isTranslatableField(field: string): boolean {
  return TRANSLATABLE_FIELDS.has(field);
}
