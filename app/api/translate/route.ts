import { NextResponse } from "next/server";

const translationCache = new Map<string, string>();
const DEFAULT_LOCALE = "zh";
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL;
const TRANSLATION_TIMEOUT_MS = 10000;
const isI18nDebugEnabled = process.env.I18N_DEBUG === "1";
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const OFFLINE_ZH_EXACT: Record<string, string> = {
  "full-length boom forefoot": "全掌 BOOM 前掌",
  "flight plate with zoom air forefoot": "前掌搭载 Zoom Air 的 Flight Plate",
  "rubber traction with tacky broad multi-directional pattern": "橡胶外底，抓地黏性强，宽大多向纹路",
  "comfortable and lively": "舒适且回弹灵动",
  "very good": "很好",
  "slightly narrow but very secure": "略窄，但包裹非常稳固"
};

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

function translateOffline(text: string, target: string) {
  if (target !== "zh") return null;

  const normalized = text.trim().toLowerCase();
  if (OFFLINE_ZH_EXACT[normalized]) return OFFLINE_ZH_EXACT[normalized];

  return null;
}

async function translateWithMyMemory(text: string, target: string) {
  const languagePair = `en|${target === "zh" ? "zh-CN" : target}`;
  const url = new URL(MYMEMORY_URL);
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", languagePair);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    responseData?: { translatedText?: string };
  };

  const translated = payload.responseData?.translatedText?.trim();
  return translated || null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; target?: string };
    const text = String(body.text ?? "").trim();
    const target = String(body.target ?? DEFAULT_LOCALE);

    if (isI18nDebugEnabled) {
      console.log("[i18n/api] request", { text, target });
    }

    if (!text) return NextResponse.json({ translatedText: "" });
    if (shouldSkip(text)) {
      if (isI18nDebugEnabled) {
        console.log("[i18n/api] skipped", { text, reason: "shouldSkip" });
      }
      return NextResponse.json({ translatedText: text, cached: true });
    }

    const cacheKey = makeCacheKey(text, target);
    const cached = translationCache.get(cacheKey);
    if (cached) {
      if (isI18nDebugEnabled) {
        console.log("[i18n/api] cache hit", { cacheKey, value: cached });
      }
      return NextResponse.json({ translatedText: cached, cached: true });
    }

    if (!LIBRETRANSLATE_URL) {
      if (isI18nDebugEnabled) {
        console.log("[i18n/api] no LIBRETRANSLATE_URL; trying fallback provider", { text, target });
      }
      try {
        const fallbackTranslated = await translateWithMyMemory(text, target);
        if (fallbackTranslated) {
          translationCache.set(cacheKey, fallbackTranslated);
          if (isI18nDebugEnabled) {
            console.log("[i18n/api] fallback translated", { cacheKey, translated: fallbackTranslated });
          }
          return NextResponse.json({ translatedText: fallbackTranslated, cached: false, provider: "mymemory_fallback" });
        }
      } catch (fallbackError) {
        if (isI18nDebugEnabled) {
          console.log("[i18n/api] fallback translation failed", { text, target, error: fallbackError });
        }
      }
      const offlineTranslated = translateOffline(text, target);
      if (offlineTranslated) {
        translationCache.set(cacheKey, offlineTranslated);
        if (isI18nDebugEnabled) {
          console.log("[i18n/api] offline translated", { cacheKey, translated: offlineTranslated });
        }
        return NextResponse.json({ translatedText: offlineTranslated, cached: false, provider: "offline_fallback" });
      }
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
      if (isI18nDebugEnabled) {
        console.log("[i18n/api] translated", { cacheKey, translated });
      }
      return NextResponse.json({ translatedText: translated, cached: false });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return NextResponse.json({ translatedText: "", reason: "invalid_request" }, { status: 400 });
  }
}
