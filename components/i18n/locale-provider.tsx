"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Modal } from "@/components/ui/modal";

export type Locale = "en" | "zh";

const LOCALE_STORAGE_KEY = "locale";
const SWITCH_OVERLAY_MS = 900;

const UI_TRANSLATIONS_ZH: Record<string, string> = {
  "continue": "继续",
  "translating...": "翻译中…",
  "machine translation may contain some inaccuracies. thank you for your understanding. loading may also take a little time.":
    "机器翻译可能出现一些问题，敬请谅解。另外，加载可能会花一点时间。",
  "integrated basketball sneaker feature platform": "综合篮球鞋性能平台",
  "compare, discuss, and choose your ideal basketball sneaker on snkrfeature": "在 SNKRFEATURE 比较、讨论并选择你理想的篮球鞋",
  "if you want to contribute to our community, please submit corrections, upload a new shoe, and discuss!":
    "如果你想为社区做贡献，欢迎提交更正、上传新鞋并参与讨论！",
  "submit new shoe info": "提交新鞋信息",
  "open compare": "打开对比",
  "submission review pipeline": "投稿审核流程",
  "all brands": "全部品牌",
  "search": "搜索",
  "clear search": "清空搜索",
  "name": "名称",
  "brand": "品牌",
  "release": "发售时间",
  "no sneakers match this search.": "没有符合当前搜索条件的球鞋。",
  "clear filters": "清除筛选",
  "shoes selected for compare": "双鞋已加入对比",
  "compare now": "立即对比",
  "advanced search": "高级搜索",
  "language": "语言",
  "toggle mobile menu": "切换移动端菜单",
  "close mobile navigation": "关闭移动端导航",
  "contact": "联系",
  "about": "关于",
  "email address copied to clipboard.": "邮箱地址已复制到剪贴板。",
  "unable to copy automatically. please try again.": "无法自动复制，请重试。",
  "information is collected from ai models such as chatgpt and from users, and is verified by humans.":
    "信息来自 ChatGPT 等 AI 模型与用户提交，并由人工审核。",
  "this website was created by zzz.": "本网站由 zzz 创建。",
  "close information modal": "关闭信息弹窗",
  "hi!": "你好！",
  "some words": "一些想说的话",
  "in the meantime, enjoy!": "在此期间，祝你浏览愉快！",
  "account": "账号",
  "log in": "登录",
  "sign up": "注册",
  "log out": "登出",
};

export const MANUAL_TRANSLATIONS: Record<string, string> = {
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
  "admin": "管理员",
};

type LocaleContextValue = {
  locale: Locale;
  requestLocaleChange: (locale: Locale) => void;
  translate: (text: string) => string;
  translateDynamic: (text: string) => Promise<string>;
  isTranslating: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function normalizeKey(text: string) {
  return text.trim().toLowerCase();
}

function shouldSkipDynamicTranslation(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (normalizeKey(trimmed) === "snkrfeature") return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  return false;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return saved === "zh" || saved === "en" ? saved : "en";
  });
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});

  const translate = useCallback(
    (text: string) => {
      if (locale === "en") return text;

      const normalized = normalizeKey(text);

      if (normalizeKey(text) === "snkrfeature") return "snkrfeature";

      if (MANUAL_TRANSLATIONS[normalized]) return MANUAL_TRANSLATIONS[normalized];

      if (UI_TRANSLATIONS_ZH[normalized]) return UI_TRANSLATIONS_ZH[normalized];

      if (translationCache[text]) return translationCache[text];

      return text;
    },
    [locale, translationCache]
  );

  const translateDynamic = useCallback(
    async (text: string) => {
      if (locale === "en" || shouldSkipDynamicTranslation(text)) return text;

      const normalized = normalizeKey(text);

      if (MANUAL_TRANSLATIONS[normalized]) return MANUAL_TRANSLATIONS[normalized];
      if (translationCache[text]) return translationCache[text];

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target: "zh" })
        });

        if (!response.ok) return text;

        const payload = (await response.json()) as { translatedText?: string };
        const value = payload.translatedText?.trim() || text;

        setTranslationCache((prev) => ({ ...prev, [text]: value }));
        return value;
      } catch (error) {
        console.error("[i18n] translateDynamic failed", { text, error });
        return text;
      }
    },
    [locale, translationCache]
  );

  const requestLocaleChange = useCallback(
    (next: Locale) => {
      if (next === locale) return;

      if (next === "zh") {
        setPendingLocale(next);
        setWarningOpen(true);
        return;
      }

      setWarningOpen(false);
      setPendingLocale(null);
      setIsTranslating(false);
      setLocale("en");
      window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    },
    [locale]
  );

  const confirmWarning = useCallback(() => {
    if (!pendingLocale) return;

    setWarningOpen(false);
    setPendingLocale(null);
    setIsTranslating(true);

    setLocale(pendingLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, pendingLocale);

    window.setTimeout(() => {
      setIsTranslating(false);
    }, SWITCH_OVERLAY_MS);
  }, [pendingLocale]);

  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      requestLocaleChange,
      translate,
      translateDynamic,
      isTranslating
    }),
    [isTranslating, locale, requestLocaleChange, translate, translateDynamic]
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}

      <Modal open={warningOpen} onClose={() => undefined} title="" dismissible={false}>
        <div className="space-y-4">
          <p className="text-sm">
            {translate("Machine translation may contain some inaccuracies. Thank you for your understanding. Loading may also take a little time.")}
          </p>
          <button
            type="button"
            onClick={confirmWarning}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[rgb(var(--accent)/0.55)] bg-[rgb(var(--accent)/0.12)] text-sm font-medium text-[rgb(var(--text))] transition hover:bg-[rgb(var(--accent)/0.18)]"
          >
            {translate("Continue")}
          </button>
        </div>
      </Modal>
      {isTranslating ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgb(var(--bg)/0.78)] backdrop-blur-sm" aria-live="polite" aria-busy="true">
          <BrandLoader label={translate("Translating...")} />
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
