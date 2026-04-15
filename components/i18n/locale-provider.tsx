"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Modal } from "@/components/ui/modal";

export type Locale = "en" | "zh";

const MANUAL_TRANSLATIONS: Record<string, string> = {
  "shoe indexed": "双鞋子",
  "shoes indexed": "双鞋子",
  "brand represented": "品牌",
  "brands represented": "品牌",
  "live": "实时",
  "loading": "加载中…",
  "loading...": "加载中…",
  "preparing your feed": "加载中…",
  "forefoot_midsole_tech": "前掌中底科技",
  "heel_midsole_tech": "后掌中底科技",
  "upper_tech": "鞋面科技",
  "forefoot tech": "前掌中底科技",
  "heel tech": "后掌中底科技",
  "upper tech": "鞋面科技"
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
  if (host?.closest("[data-field-key='shoe_name']")) return false;
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
      if (element.closest("[data-field-key='shoe_name']")) return;
      const raw = element.getAttribute(attr) ?? "";
      if (isSkippableText(raw)) return;
      candidates.push({ element, attr });
    });
  });

  return candidates;
}

async function translateText(text: string, target = "zh-CN") {
  if (isSkippableText(text)) return text;

  const manual = getManualTranslation(text);
  if (manual) return manual;
  if (normalizeTranslationKey(text) === "snkrfeature") return "snkrfeature";

  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
  );
  const data = (await response.json()) as unknown;
  const rows = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];

  return rows
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
    .join("") || text;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const cacheRef = useRef<Record<string, string>>({});
  const isApplyingRef = useRef(false);
  const textSourceMapRef = useRef(new WeakMap<Text, string>());
  const attrSourceMapRef = useRef(new WeakMap<HTMLElement, Partial<Record<TranslatableAttr, string>>>());

  const applyTranslations = useCallback((cache: Record<string, string>) => {
    isApplyingRef.current = true;
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
    isApplyingRef.current = false;
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
      return;
    }

    const updates: Record<string, string> = {};
    const batchSize = 20;

    for (let i = 0; i < pending.length; i += batchSize) {
      const chunk = pending.slice(i, i + batchSize);
      const translatedChunk = await Promise.all(chunk.map((text) => translateText(text)));
      chunk.forEach((source, idx) => {
        updates[source] = translatedChunk[idx] ?? source;
      });
    }

    setTranslationCache((prev) => {
      const merged = { ...prev, ...updates };
      cacheRef.current = merged;
      applyTranslations(merged);
      return merged;
    });
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
        await new Promise((resolve) => setTimeout(resolve, TRANSLATION_DELAY_MS));
        await runTranslation();
      } finally {
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
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}

export { MANUAL_TRANSLATIONS };
