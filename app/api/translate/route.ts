import { NextResponse } from "next/server";

const translationCache = new Map<string, string>();
const DEFAULT_LOCALE = "zh";
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL;
const TRANSLATION_TIMEOUT_MS = 10000;

function makeCacheKey(text: string, target: string) {
  return `${target}::${text}`;
}

function shouldSkip(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase() === "snkrfeature") return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  if (/^(nike|adidas|jordan|anta|li-ning)$/i.test(trimmed)) return true;
  if (/^(boost|zoom|zoomx|cushlon|lightstrike|boom|boom foam|zoom air)$/i.test(trimmed)) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; target?: string };
    const text = String(body.text ?? "").trim();
    const target = String(body.target ?? DEFAULT_LOCALE);

    if (!text) return NextResponse.json({ translatedText: "" });
    if (shouldSkip(text)) return NextResponse.json({ translatedText: text, cached: true });

    const cacheKey = makeCacheKey(text, target);
    const cached = translationCache.get(cacheKey);
    if (cached) return NextResponse.json({ translatedText: cached, cached: true });

    if (!LIBRETRANSLATE_URL) {
      return NextResponse.json({ translatedText: text, cached: false, reason: "missing_translation_engine" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

    try {
      const response = await fetch(LIBRETRANSLATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "auto", target, format: "text" }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return NextResponse.json({ translatedText: text, cached: false, reason: "engine_error" });
      }

      const data = (await response.json()) as { translatedText?: string };
      const translated = (data.translatedText ?? text).trim() || text;

      translationCache.set(cacheKey, translated);
      return NextResponse.json({ translatedText: translated, cached: false });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return NextResponse.json({ translatedText: "", reason: "invalid_request" }, { status: 400 });
  }
}
