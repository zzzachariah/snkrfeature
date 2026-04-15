"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Modal } from "@/components/ui/modal";

export type Locale = "en" | "zh";

const NON_TRANSLATABLE_FIELDS = [
  "shoe_name",
  "forefoot_midsole_tech",
  "heel_midsole_tech",
  "outsole_tech",
  "brand",
  "model_line",
  "version_name"
] as const;

const NON_TRANSLATABLE_FIELD_SET = new Set<string>(NON_TRANSLATABLE_FIELDS);
const LOCALE_STORAGE_KEY = "locale";
const translationCache: Record<string, string> = {};

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

function hasExcludedContext(node: Node) {
  if (!(node.parentElement instanceof HTMLElement)) return false;
  const el = node.parentElement;
  if (el.closest("[data-no-translate='true']")) return true;

  const fieldHost = el.closest<HTMLElement>("[data-field-key]");
  if (!fieldHost) return false;

  const key = fieldHost.dataset.fieldKey?.trim().toLowerCase();
  return Boolean(key && NON_TRANSLATABLE_FIELD_SET.has(key));
}

function shouldTranslateNode(node: Node) {
  const parentTag = node.parentElement?.tagName.toLowerCase();
  if (!parentTag) return false;
  if (["script", "style", "noscript", "code", "pre"].includes(parentTag)) return false;
  if (hasExcludedContext(node)) return false;
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
      if (element.closest("[data-no-translate='true']")) return;
      const raw = element.getAttribute(attr) ?? "";
      if (isSkippableText(raw)) return;
      candidates.push({ element, attr });
    });
  });

  return candidates;
}

async function translateBatch(texts: string[], target = "zh-CN") {
  if (!texts.length) return [] as string[];

  const params = new URLSearchParams({ client: "gtx", sl: "auto", tl: target, dt: "t" });
  texts.forEach((value) => params.append("q", value));

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  const data = (await response.json()) as unknown;
  const translatedRows = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];

  return translatedRows.map((row, index: number) => {
    if (!Array.isArray(row)) return texts[index] ?? "";
    return row
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
      .join("") || texts[index] || "";
  });
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const textSourceMapRef = useRef(new WeakMap<Text, string>());
  const attrSourceMapRef = useRef(new WeakMap<HTMLElement, Partial<Record<TranslatableAttr, string>>>());

  const restoreOriginalContent = useCallback(() => {
    collectTextNodes(document.body).forEach((node) => {
      const original = textSourceMapRef.current.get(node);
      if (original && node.textContent !== original) node.textContent = original;
    });

    collectAttributeCandidates(document.body).forEach(({ element, attr }) => {
      const sourceAttrs = attrSourceMapRef.current.get(element);
      const original = sourceAttrs?.[attr];
      if (original) element.setAttribute(attr, original);
    });
  }, []);

  const applyTranslations = useCallback(async () => {
    const textNodes = collectTextNodes(document.body);
    const attrCandidates = collectAttributeCandidates(document.body);

    const uniques = new Set<string>();

    textNodes.forEach((node) => {
      const existing = textSourceMapRef.current.get(node);
      const source = existing ?? (node.textContent ?? "").trim();
      if (!existing && source) textSourceMapRef.current.set(node, source);
      if (!isSkippableText(source)) uniques.add(source);
    });

    attrCandidates.forEach(({ element, attr }) => {
      const existingMap = attrSourceMapRef.current.get(element) ?? {};
      const existing = existingMap[attr];
      const source = existing ?? (element.getAttribute(attr) ?? "").trim();
      if (!existing && source) {
        attrSourceMapRef.current.set(element, { ...existingMap, [attr]: source });
      }
      if (!isSkippableText(source)) uniques.add(source);
    });

    const missing = Array.from(uniques).filter((text) => !translationCache[text]);
    const batchSize = 24;

    for (let i = 0; i < missing.length; i += batchSize) {
      const chunk = missing.slice(i, i + batchSize);
      const translated = await translateBatch(chunk);
      chunk.forEach((source, idx) => {
        translationCache[source] = translated[idx] ?? source;
      });
    }

    textNodes.forEach((node) => {
      const source = textSourceMapRef.current.get(node) ?? (node.textContent ?? "").trim();
      const translated = translationCache[source] ?? source;
      if (translated && node.textContent !== translated) node.textContent = translated;
    });

    attrCandidates.forEach(({ element, attr }) => {
      const source = attrSourceMapRef.current.get(element)?.[attr] ?? element.getAttribute(attr) ?? "";
      const translated = translationCache[source] ?? source;
      if (translated && element.getAttribute(attr) !== translated) {
        element.setAttribute(attr, translated);
      }
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "zh" || stored === "en") setLocale(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);

    if (locale !== "zh") {
      restoreOriginalContent();
      setIsTranslating(false);
      return;
    }

    let active = true;
    setIsTranslating(true);

    const run = async () => {
      try {
        await applyTranslations();
      } finally {
        if (active) setIsTranslating(false);
      }
    };

    void run();

    const observer = new MutationObserver(() => {
      if (!active) return;
      void applyTranslations();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [applyTranslations, locale, restoreOriginalContent]);

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
    translate: (text: string) => (locale === "en" ? text : translationCache[text] ?? text),
    isTranslating,
  }), [isTranslating, locale, requestLocaleChange]);

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
      <Modal open={warningOpen} onClose={() => undefined} title="" dismissible={false}>
        <div className="space-y-4">
          <p className="text-sm">机器翻译有问题敬请谅解</p>
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

export { NON_TRANSLATABLE_FIELDS };
