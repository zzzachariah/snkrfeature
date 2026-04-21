"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SneakerLoader } from "@/components/ui/sneaker-loader";
import { Modal } from "@/components/ui/modal";

export type Locale = "en" | "zh";

const LOCALE_STORAGE_KEY = "locale";
const SWITCH_OVERLAY_MS = 900;
const isI18nDebugEnabled = process.env.NEXT_PUBLIC_I18N_DEBUG === "1";

const UI_TRANSLATIONS_ZH: Record<string, string> = {
  "continue": "继续",
  "translating...": "翻译中…",
  "machine translation may contain some inaccuracies. thank you for your understanding. loading may also take a little time.":
    "机器翻译可能出现一些问题，敬请谅解。另外，加载可能会花一点时间。",
  "integrated basketball sneaker feature platform": "综合篮球鞋性能平台",
  "a living index": "实时更新的",
  "of every pair": "球鞋信息",
  "worth playing in.": "数据库",
  "every basketball sneaker worth playing in — reviewed, compared, and indexed by the community.": "查看、对比、上传球鞋",
  "compare, discuss, and choose your ideal basketball sneaker on snkrfeature": "在 SNKRFEATURE 比较、讨论并选择你理想的篮球鞋",
  "if you want to contribute to our community, please submit corrections, upload a new shoe, and discuss!":
    "如果你想为社区做贡献，欢迎提交更正、上传新鞋并参与讨论！",
  "submit new shoe info": "提交新鞋信息",
  "open compare": "打开对比",
  "submission review pipeline": "投稿审核流程",
  "all brands": "全部品牌",
  "image": "图片",
  "no image": "暂无图片",
  "find image": "查找图片",
  "search image": "搜索图片",
  "search again": "重新搜索",
  "approve image": "通过图片",
  "reject image": "拒绝图片",
  "image pending review": "图片待审核",
  "image approved": "图片已通过审核",
  "image rejected": "图片已拒绝",
  "searching images...": "正在搜索图片…",
  "image import failed": "图片导入失败",
  "no suitable image found": "未找到合适图片",
  "selected image could not be downloaded": "所选图片无法下载",
  "image imported for review": "图片已导入，等待审核",
  "find images for all missing shoes": "为所有缺失图片的球鞋查找图片",
  "auto-fill missing images": "自动补全缺失图片",
  "bulk image import started": "批量图片导入已开始",
  "bulk image import completed": "批量图片导入已完成",
  "imported and approved": "已导入并通过",
  "skipped": "已跳过",
  "failed": "失败",
  "no missing shoes found": "未找到缺失图片的球鞋",
  "approved": "已通过",
  "pending": "待审核",
  "total checked": "总检查数",
  "missing approved images": "缺失已通过图片",
  "total shoes": "球鞋总数",
  "progress": "进度",
  "running": "运行中",
  "completed": "已完成",
  "no active bulk job": "当前没有批量任务",
  "bulk job in progress": "批量任务进行中",
  "current shoe": "当前球鞋",
  "abort": "中止",
  "stopping...": "正在停止...",
  "cancelled": "已取消",
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
  "compare": "对比",
  "submit": "提交",
  "loading comparison matrix": "正在加载对比矩阵",
  "loading dashboard": "正在加载仪表盘",
  "loading dashboard data": "正在加载仪表盘数据",
  "loading advanced search": "正在加载高级搜索",
  "loading shoe detail": "正在加载球鞋详情",
  "authenticating": "认证中",
  "register": "注册",
  "login": "登录",
  "sign in": "登录",
  "signing in...": "登录中…",
  "create account": "创建账号",
  "creating account...": "正在创建账号…",
  "creating your account": "正在创建你的账号",
  "setting up your profile": "正在设置你的资料",
  "username": "用户名",
  "email": "邮箱",
  "password": "密码",
  "need an account?": "还没有账号？",
  "already have an account?": "已有账号？",
  "email or username": "邮箱或用户名",
  "sign in with email or username.": "使用邮箱或用户名登录。",
  "log in or sign up for the full snkr feature experience.": "登录或注册以获得完整的 SNKR Feature 体验。",
  "view shoe": "查看球鞋",
  "overview": "概览",
  "loading account...": "正在加载账号…",
  "welcome back": "欢迎回来",
  "user": "用户",
  "admin account": "管理员账号",
  "my comments": "我的评论",
  "liked comments": "点赞评论",
  "disliked comments": "点踩评论",
  "comments you liked": "你点赞过的评论",
  "comments you disliked": "你点踩过的评论",
  "no comments yet.": "还没有评论。",
  "you have not liked any comments yet.": "你还没有点赞任何评论。",
  "you have not disliked any comments yet.": "你还没有点踩任何评论。",
  "submissions": "投稿",
  "no submissions yet.": "还没有投稿。",
  "status": "状态",
  "saved compares": "已保存对比",
  "no saved comparisons yet.": "还没有保存的对比。",
  "settings": "设置",
  "email (read-only)": "邮箱（只读）",
  "current password": "当前密码",
  "enter current password": "输入当前密码",
  "change password": "修改密码",
  "save profile": "保存资料",
  "new password": "新密码",
  "at least 8 characters": "至少 8 个字符",
  "confirm new password": "确认新密码",
  "re-enter new password": "再次输入新密码",
  "cancel": "取消",
  "update password": "更新密码",
  "user center": "用户中心",
  "please sign in to view your user center.": "请先登录以查看用户中心。",
  "complete turnstile verification first.": "请先完成 Turnstile 验证。",
  "submit correction": "提交更正",
  "submit sneaker information": "提交球鞋信息",
  "you're submitting a correction for": "你正在提交更正，目标为",
  "an existing published shoe": "一双已发布球鞋",
  "this goes to the same review queue and approval will update the existing record.": "该请求会进入同一审核队列，审核通过后将更新现有记录。",
  "submissions are stored as raw payload, normalized server-side, and routed to admin review before publication.": "投稿会先以原始数据保存，在服务端标准化后提交管理员审核，再发布。",
  "story title": "故事标题",
  "short headline for the story.": "故事的简短标题。",
  "story / background notes": "背景故事/补充说明",
  "release context, design intent, notable versions, community notes.": "发售背景、设计意图、重要版本、社区补充说明。",
  "raw notes (required)": "原始备注（必填）",
  "paste your full performance observations and source snippets...": "粘贴完整实战观察和来源片段……",
  "submit for review": "提交审核",
  "submission received": "已收到投稿",
  "back to submit": "返回提交页",
  "write a comment": "写评论",
  "join the discussion with traction notes, fit tips, and durability observations.": "欢迎分享抓地、包裹和耐久方面的实战体验。",
  "you need to be logged in to post a comment.": "你需要登录后才能发表评论。",
  "write your performance feedback...": "写下你的实战反馈……",
  "log in to start writing...": "登录后开始撰写……",
  "posting...": "发布中…",
  "post comment": "发布评论",
  "keep it constructive and specific to on-court experience.": "请保持建设性，并聚焦实战体验。",
  "view discussion": "查看讨论",
  "comment": "评论",
  "comments": "评论",
  "no discussion yet": "还没有讨论",
  "be the first to share how this shoe performs on court.": "来当第一个分享这双鞋实战表现的人吧。",
  "delete my comment": "删除我的评论",
  "delete": "删除",
  "highlight differences": "高亮差异",
  "field": "字段",
  "release year": "发售年份",
  "category": "类别",
  "forefoot midsole": "前掌中底",
  "heel midsole": "后掌中底",
  "outsole": "外底",
  "not yet added": "尚未添加",
  "no shoes selected. add ids via the url query string.": "未选择球鞋。请通过 URL 查询参数添加 ID。",
  "welcome!": "欢迎！",
  "story behind snkrfeature": "snkrfeature 背后的故事",
  "completed reading": "我已阅读完毕",
  "continue to sign up": "继续注册",
  "turnstile is not configured. demo verification mode is active.": "Turnstile 未配置，当前为演示验证模式。",
  "use demo token": "使用演示令牌",
  "theme": "主题",
  "click to cycle theme.": "点击切换主题。",
  "system": "系统",
  "light": "浅色",
  "dark": "深色",
  "compare sneakers": "对比球鞋",
  "share this comparison via url query params:": "通过 URL 查询参数分享此对比：",
  "search to add": "搜索并添加",
  "find more shoes by keyword and filters, then add them directly to this comparison.": "通过关键词和筛选查找更多球鞋，并直接添加到本次对比。",
  "hide search": "隐藏搜索",
  "open search": "打开搜索",
  "keywords": "关键词",
  "name, tags, tech, notes...": "名称、标签、科技、备注……",
  "all categories": "全部类别",
  "tech": "科技",
  "e.g. lebron": "例如：LeBron",
  "e.g. zoom, plate": "例如：Zoom、支撑板",
  "reset": "重置",
  "no player tag": "暂无球员标签",
  "add to compare": "加入对比",
  "clear all shoes": "清空全部球鞋",
  "show tech details": "显示科技详情",
  "hide tech details": "隐藏科技详情",
  "remove shoe from compare": "从对比中移除球鞋",
  "no shoes in compare yet.": "当前还没有加入对比的球鞋。",
  "use search and add controls to start building your comparison.": "使用上方搜索和添加功能开始建立对比。",
  "no shoes found": "未找到球鞋",
  "try broader keywords or remove one filter.": "请尝试更宽泛的关键词，或移除一个筛选条件。",
  "no playstyle summary available yet.": "暂无打法总结。",
  "performance profile": "性能画像",
  "story & provenance": "故事与来源",
  "no editorial story content yet.": "暂无编辑故事内容。",
  "no editorial story yet.": "暂无编辑故事。",
  "source/evidence: seed dataset + community validation pipeline. admin review required before promotion to official records.":
    "来源/证据：种子数据集 + 社区验证流程。成为官方记录前需管理员审核。",
  "related shoes": "相关球鞋",
  "back to database": "返回数据库",
  "shoe name": "鞋名",
  "model / version": "型号 / 版本",
  "forefoot midsole tech": "前掌中底科技",
  "heel midsole tech": "后掌中底科技",
  "forefoot tech": "前掌中底科技",
  "heel tech": "后掌中底科技",
  "outsole tech": "外底科技",
  "cushioning feel": "缓震脚感",
  "court feel": "场地感",
  "fit / containment": "包裹 / 锁定",
  "tags (comma separated)": "标签（逗号分隔）",
  "source links (comma separated)": "来源链接（逗号分隔）",
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
  "curry": "库里",
};

type LocaleContextValue = {
  locale: Locale;
  requestLocaleChange: (locale: Locale) => void;
  translate: (text: string) => string;
  translateDynamic: (text: string) => Promise<string>;
  getRankLabel: (rank: number) => string;
  isTranslating: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function normalizeKey(text: string) {
  return text.trim().toLowerCase();
}

const PROTECTED_NO_TRANSLATE_KEYS = new Set([
  "forefoot midsole tech",
  "heel midsole tech",
  "forefoot midsole",
  "heel midsole",
  "forefoot tech",
  "heel tech"
]);

function shouldSkipDynamicTranslation(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (normalizeKey(trimmed) === "snkrfeature") return true;
  if (PROTECTED_NO_TRANSLATE_KEYS.has(normalizeKey(trimmed))) return true;
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
      if (PROTECTED_NO_TRANSLATE_KEYS.has(normalized)) return text;

      if (MANUAL_TRANSLATIONS[normalized]) return MANUAL_TRANSLATIONS[normalized];

      if (UI_TRANSLATIONS_ZH[normalized]) return UI_TRANSLATIONS_ZH[normalized];

      if (translationCache[text]) return translationCache[text];

      return text;
    },
    [locale, translationCache]
  );

  const translateDynamic = useCallback(
    async (text: string) => {
      if (locale === "en" || shouldSkipDynamicTranslation(text)) {
        if (isI18nDebugEnabled) {
          console.debug("[i18n/locale-provider] translateDynamic skipped", {
            text,
            locale,
            reason: locale === "en" ? "locale_en" : "protected_or_invalid"
          });
        }
        return text;
      }

      const normalized = normalizeKey(text);

      if (MANUAL_TRANSLATIONS[normalized]) return MANUAL_TRANSLATIONS[normalized];
      if (translationCache[text]) {
        if (isI18nDebugEnabled) {
          console.debug("[i18n/locale-provider] translateDynamic cache hit", { text, value: translationCache[text] });
        }
        return translationCache[text];
      }

      try {
        if (isI18nDebugEnabled) {
          console.debug("[i18n/locale-provider] translateDynamic request", { text, target: "zh" });
        }
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target: "zh" })
        });

        if (!response.ok) return text;

        const payload = (await response.json()) as { translatedText?: string };
        const value = payload.translatedText?.trim() || text;

        if (isI18nDebugEnabled) {
          console.debug("[i18n/locale-provider] translateDynamic response", { text, value });
        }

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

  const getRankLabel = useCallback(
    (rank: number) => {
      const safeRank = Number.isFinite(rank) && rank > 0 ? Math.floor(rank) : 1;
      if (locale === "zh") return `第${safeRank}名`;
      return `No.${safeRank}`;
    },
    [locale]
  );

  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      requestLocaleChange,
      translate,
      translateDynamic,
      getRankLabel,
      isTranslating
    }),
    [getRankLabel, isTranslating, locale, requestLocaleChange, translate, translateDynamic]
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
          <SneakerLoader label={translate("Translating...")} />
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
