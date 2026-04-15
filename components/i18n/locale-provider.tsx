"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Modal } from "@/components/ui/modal";

export type Locale = "en" | "zh";
const TRANSLATION_REQUEST_TIMEOUT_MS = 8000;

const MANUAL_TRANSLATIONS: Record<string, string> = {
  "shoe indexed": "双鞋子",
  "shoes indexed": "双鞋子",
  "brand represented": "品牌",
  "brands represented": "品牌",
  "live": "实时",
  "dashboard": "我的账号",
  "home": "主页",
  "player": "球员",
  "search by name, player, tags, technologies...": "按名称、球员、标签、技术搜索……",
  "loading": "加载中…",
  "loading...": "加载中…",
  "preparing your feed": "加载中…",
  "forefoot_midsole_tech": "前掌中底科技",
  "heel_midsole_tech": "后掌中底科技",
  "upper_tech": "鞋面科技",
  "forefoot tech": "前掌中底科技",
  "heel tech": "后掌中底科技",
  "upper tech": "鞋面科技",
  "upper": "鞋面科技",
  "cushioning": "泡棉舒适度",
  "traction": "抓地力/止滑程度",
  "stability": "稳定性",
  "fit": "包裹",
  "admin": "管理员"
};
const LOCALE_STORAGE_KEY = "locale";
const TRANSLATION_DELAY_MS = 700;

type LocaleContextValue = {
  locale: Locale;
  requestLocaleChange: (locale: Locale) => void;
  translate: (text: string) => string;
  isTranslating: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isSkippableText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (!Number.isNaN(Number(trimmed))) return true;
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  if (/^[\d\s.,%:/#()\-+]+$/.test(trimmed)) return true;
  return false;
}

function normalizeTranslationKey(text: string) {
  return text.trim().toLowerCase();
}

function getManualTranslation(text: string) {
  const normalized = normalizeTranslationKey(text);
  return MANUAL_TRANSLATIONS[normalized];
}

function resolveTranslation(text: string, cache: Record<string, string>) {
  if (normalizeTranslationKey(text) === "snkrfeature") return "snkrfeature";
  return getManualTranslation(text) ?? cache[text] ?? text;
}

function shouldTranslateNode(node: Node) {
  const parentTag = node.parentElement?.tagName.toLowerCase();
  if (!parentTag) return false;
  if (["script", "style", "noscript", "code", "pre"].includes(parentTag)) return false;
  const host = node.parentElement;
  if (host?.closest("[data-translation-lock='true']")) return false;
  if (host?.closest("[data-user-identity='true']")) return false;
  if (host?.closest("[data-field-key='shoe_name']")) return false;
  if (host?.closest("[data-field-key='brand']")) return false;
  if (host?.closest("[data-brand-option='true']")) return false;
  return !isSkippableText(node.textContent ?? "");
}

function collectTextNodes(root: ParentNode) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (shouldTranslateNode(node)) nodes.push(node);
  }
  return nodes;
}

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label"] as const;
type TranslatableAttr = (typeof TRANSLATABLE_ATTRS)[number];

function collectAttributeCandidates(root: ParentNode) {
  const candidates: Array<{ element: HTMLElement; attr: TranslatableAttr }> = [];

  TRANSLATABLE_ATTRS.forEach((attr) => {
    root.querySelectorAll(`[${attr}]`).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.closest("[data-translation-lock='true']")) return;
      if (element.closest("[data-user-identity='true']")) return;
      if (element.closest("[data-field-key='shoe_name']")) return;
      if (element.closest("[data-field-key='brand']")) return;
      if (element.closest("[data-brand-option='true']")) return;
      const raw = element.getAttribute(attr) ?? "";
      if (isSkippableText(raw)) return;
      candidates.push({ element, attr });
    });
  });

  return candidates;
}

async function translateText(text: string, target = "zh-CN") {
  if (isSkippableText(text)) return { value: text, failed: false };

  const manual = getManualTranslation(text);
  if (manual) return { value: manual, failed: false };
  if (normalizeTranslationKey(text) === "snkrfeature") return { value: "snkrfeature", failed: false };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATION_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      console.error("[i18n] translation request failed", { status: response.status, text });
      return { value: text, failed: true };
    }

    const data = (await response.json()) as unknown;
    const rows = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];

    const value = rows
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
      .join("") || text;

    return { value, failed: false };
  } catch (error) {
    console.error("[i18n] translation request error", { text, error });
    return { value: text, failed: true };
  } finally {
    clearTimeout(timeout);
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [translationError, setTranslationError] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, string>>({});
  const isApplyingRef = useRef(false);
  const isTranslationRunningRef = useRef(false);
  const textSourceMapRef = useRef(new WeakMap<Text, string>());
  const attrSourceMapRef = useRef(new WeakMap<HTMLElement, Partial<Record<TranslatableAttr, string>>>());

  const applyTranslations = useCallback((cache: Record<string, string>) => {
    isApplyingRef.current = true;

    try {
      const textNodes = collectTextNodes(document.body);
      const attrCandidates = collectAttributeCandidates(document.body);

      textNodes.forEach((node) => {
        const source = textSourceMapRef.current.get(node) ?? (node.textContent ?? "").trim();
        if (!textSourceMapRef.current.get(node) && source) textSourceMapRef.current.set(node, source);
        const translated = resolveTranslation(source, cache);
        if (translated && node.textContent !== translated) node.textContent = translated;
      });

      attrCandidates.forEach(({ element, attr }) => {
        const sourceAttrs = attrSourceMapRef.current.get(element) ?? {};
        const source = sourceAttrs[attr] ?? (element.getAttribute(attr) ?? "").trim();
        if (!sourceAttrs[attr] && source) {
          attrSourceMapRef.current.set(element, { ...sourceAttrs, [attr]: source });
        }
        const translated = resolveTranslation(source, cache);
        if (translated && element.getAttribute(attr) !== translated) {
          element.setAttribute(attr, translated);
        }
      });
    } finally {
      isApplyingRef.current = false;
    }
  }, []);

  const restoreOriginalContent = useCallback(() => {
    collectTextNodes(document.body).forEach((node) => {
      const source = textSourceMapRef.current.get(node);
      if (source && node.textContent !== source) node.textContent = source;
    });

    collectAttributeCandidates(document.body).forEach(({ element, attr }) => {
      const source = attrSourceMapRef.current.get(element)?.[attr];
      if (source && element.getAttribute(attr) !== source) element.setAttribute(attr, source);
    });
  }, []);

  const runTranslation = useCallback(async () => {
    if (isTranslationRunningRef.current) return;
    isTranslationRunningRef.current = true;
    console.info("[i18n] runTranslation start");

    try {
      const textNodes = collectTextNodes(document.body);
      const attrCandidates = collectAttributeCandidates(document.body);
      const uniqueTexts = new Set<string>();

      textNodes.forEach((node) => {
        const source = textSourceMapRef.current.get(node) ?? (node.textContent ?? "").trim();
        if (!textSourceMapRef.current.get(node) && source) textSourceMapRef.current.set(node, source);
        if (!isSkippableText(source)) uniqueTexts.add(source);
      });

      attrCandidates.forEach(({ element, attr }) => {
        const sourceAttrs = attrSourceMapRef.current.get(element) ?? {};
        const source = sourceAttrs[attr] ?? (element.getAttribute(attr) ?? "").trim();
        if (!sourceAttrs[attr] && source) {
          attrSourceMapRef.current.set(element, { ...sourceAttrs, [attr]: source });
        }
        if (!isSkippableText(source)) uniqueTexts.add(source);
      });

      const pending = Array.from(uniqueTexts).filter((text) => !cacheRef.current[text] && !getManualTranslation(text) && normalizeTranslationKey(text) !== "snkrfeature");
      if (!pending.length) {
        applyTranslations(cacheRef.current);
        console.info("[i18n] runTranslation skipped (no pending)");
        return;
      }

      const updates: Record<string, string> = {};
      const batchSize = 20;
      let failedCount = 0;

      for (let i = 0; i < pending.length; i += batchSize) {
        const chunk = pending.slice(i, i + batchSize);
        const translatedChunk = await Promise.all(chunk.map((text) => translateText(text)));
        chunk.forEach((source, idx) => {
          const result = translatedChunk[idx];
          updates[source] = result?.value ?? source;
          if (result?.failed) failedCount += 1;
        });
      }

      setTranslationCache((prev) => {
        const merged = { ...prev, ...updates };
        cacheRef.current = merged;
        applyTranslations(merged);
        return merged;
      });

      if (failedCount > 0) {
        setTranslationError(`部分内容翻译失败（${failedCount}）`);
      } else {
        setTranslationError(null);
      }

      console.info("[i18n] runTranslation end", { pending: pending.length, failedCount });
    } finally {
      isTranslationRunningRef.current = false;
    }
  }, [applyTranslations]);

  useEffect(() => {
    cacheRef.current = translationCache;
  }, [translationCache]);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") setLocale(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);

    if (locale === "en") {
      setIsTranslating(false);
      restoreOriginalContent();
      return;
    }

    let active = true;
    setIsTranslating(true);

    const run = async () => {
      try {
        setTranslationError(null);
        await new Promise((resolve) => setTimeout(resolve, TRANSLATION_DELAY_MS));
        await Promise.race([
          runTranslation(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Translation run timeout")), TRANSLATION_RUN_TIMEOUT_MS)),
        ]);
      } catch (error) {
        console.error("[i18n] translation flow failed", error);
        setTranslationError("翻译失败，已回退原文");
      } finally {
        isTranslationRunningRef.current = false;
        if (active) setIsTranslating(false);
      }
    };

    void run();

    const observer = new MutationObserver(() => {
      if (!active || isApplyingRef.current) return;
      void runTranslation();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [locale, restoreOriginalContent, runTranslation]);

  useEffect(() => {
    if (locale !== "zh") return;
    applyTranslations(translationCache);
  }, [applyTranslations, locale, translationCache]);

  const requestLocaleChange = useCallback((next: Locale) => {
    if (next === locale) return;
    if (next === "zh") {
      setPendingLocale(next);
      setWarningOpen(true);
      return;
    }

    setPendingLocale(null);
    setWarningOpen(false);
    setLocale("en");
  }, [locale]);

  const confirmWarning = useCallback(() => {
    if (!pendingLocale) return;
    setWarningOpen(false);
    setLocale(pendingLocale);
    setPendingLocale(null);
  }, [pendingLocale]);

  const contextValue = useMemo<LocaleContextValue>(() => ({
    locale,
    requestLocaleChange,
    translate: (text: string) => (locale === "en" ? text : resolveTranslation(text, translationCache)),
    isTranslating,
  }), [isTranslating, locale, requestLocaleChange, translationCache]);

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
      <Modal open={warningOpen} onClose={() => undefined} title="" dismissible={false}>
        <div className="space-y-4">
          <p className="text-sm">机器翻译可能出现一些问题，敬请谅解。另外，加载可能会花一点时间。</p>
          <button
            type="button"
            onClick={confirmWarning}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[rgb(var(--accent)/0.55)] bg-[rgb(var(--accent)/0.12)] text-sm font-medium text-[rgb(var(--text))] transition hover:bg-[rgb(var(--accent)/0.18)]"
          >
            继续
          </button>
        </div>
      </Modal>
      {isTranslating && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgb(var(--bg)/0.78)] backdrop-blur-sm" aria-live="polite" aria-busy="true">
          <BrandLoader label="Translating..." />
        </div>
      )}
      {translationError ? (
        <div className="fixed bottom-4 left-1/2 z-[75] -translate-x-1/2 rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.7)] bg-[rgb(var(--bg-elev)/0.94)] px-3 py-2 text-xs text-[rgb(var(--text))] shadow-[0_8px_18px_rgb(var(--shadow)/0.25)]">
          {translationError}
        </div>
      ) : null}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export { MANUAL_TRANSLATIONS };
