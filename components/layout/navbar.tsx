"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Menu, Search, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AccountMenu } from "@/components/layout/account-menu";
import { useLocale } from "@/components/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";

type NavHref = "/" | "/compare" | "/submit" | "/dashboard" | "/admin" | "/search/advanced";

export function Navbar() {
  const pathname = usePathname();
  const { locale, requestLocaleChange, translate } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const sb = supabase;

    async function syncRole(session: Session | null, source: "initial" | "auth_change") {
      if (process.env.NODE_ENV !== "production") console.info("[navbar] role sync start", { source, userId: session?.user?.id ?? null });
      const userId = session?.user?.id;
      if (!userId) {
        setIsAdmin(false);
        if (process.env.NODE_ENV !== "production") console.info("[navbar] role sync end", { source, isAdmin: false });
        return;
      }

      if (process.env.NODE_ENV !== "production") console.info("[navbar] profile fetch start", { source, userId });
      const { data: profile } = await sb.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (process.env.NODE_ENV !== "production") console.info("[navbar] profile fetch end", { source, profile });
      setIsAdmin(profile?.role === "admin");
      if (process.env.NODE_ENV !== "production") console.info("[navbar] role sync end", { source, isAdmin: profile?.role === "admin" });
    }

    void sb.auth.getSession().then(({ data }) => {
      void syncRole(data.session, "initial");
    });

    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV !== "production") console.info("[navbar] auth state changed", { event, userId: session?.user?.id ?? null });
      void syncRole(session, "auth_change");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const onClick = () => setLangOpen(false);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [langOpen]);

  const navItems = useMemo(() => {
    const base: Array<{ href: NavHref; label: string }> = [
      { href: "/", label: "Home" },
      { href: "/compare", label: "Compare" },
      { href: "/submit", label: "Submit" },
      { href: "/dashboard", label: "Dashboard" }
    ];

    if (isAdmin) base.push({ href: "/admin", label: "Admin" });
    return base;
  }, [isAdmin]);

  const navHeight = scrolled ? "h-[54px]" : "h-16";

  return (
    <header className="sticky top-3 z-40 px-2 md:px-4" data-no-translate="true">
      <div
        className={`container-shell relative flex ${navHeight} items-center gap-2 rounded-2xl border border-[rgb(var(--glass-stroke-soft)/0.6)] bg-[rgb(var(--bg-elev)/0.88)] text-[rgb(var(--text))] shadow-[0_16px_40px_rgb(var(--shadow)/0.16)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-[height,box-shadow] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:gap-3`}
        style={scrolled ? { boxShadow: "0 8px 28px rgb(var(--shadow)/0.22)" } : undefined}
      >
        <Link
          href="/"
          className="max-w-[7.6rem] truncate text-[0.9rem] font-bold tracking-[-0.02em] sm:max-w-[9.5rem] md:max-w-none"
        >
          snkrfeature
        </Link>

        <nav className="ml-1 hidden items-center gap-[2px] rounded-[10px] border border-[rgb(var(--glass-stroke-soft)/0.32)] bg-[rgb(var(--surface)/0.55)] p-1 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center rounded-lg px-3 py-[5px] text-[0.825rem] font-medium transition-colors duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--text)/0.25)] ${
                  active
                    ? "bg-[rgb(var(--text)/0.09)] text-[rgb(var(--text))]"
                    : "text-[rgb(var(--subtext))] hover:text-[rgb(var(--text))]"
                }`}
              >
                {translate(item.label)}
                <span
                  aria-hidden
                  className="absolute bottom-[2px] left-1/2 h-[2px] -translate-x-1/2 rounded-sm bg-[rgb(var(--text))] transition-[width,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: active ? 14 : 0, opacity: active ? 1 : 0 }}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            href="/search/advanced"
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--surface)/0.6)] px-3 text-[0.75rem] font-medium tracking-[-0.01em] text-[rgb(var(--subtext))] transition-[border-color,color,background-color,box-shadow] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[rgb(var(--text)/0.4)] hover:bg-[rgb(var(--surface)/0.85)] hover:text-[rgb(var(--text))]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{translate("Advanced Search")}</span>
          </Link>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--surface)/0.6)] px-2.5 text-[0.75rem] font-medium text-[rgb(var(--subtext))] transition hover:border-[rgb(var(--text)/0.4)] hover:text-[rgb(var(--text))]"
              aria-haspopup="menu"
              aria-expanded={langOpen}
              aria-label={translate("Language")}
              data-translation-lock="true"
            >
              <span data-translation-lock="true">{locale === "en" ? "Eng" : "简"}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {langOpen && (
              <div className="nav-dropdown-panel absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[9rem] rounded-xl p-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[rgb(var(--text)/0.06)]"
                  onClick={() => {
                    requestLocaleChange("en");
                    setLangOpen(false);
                  }}
                >
                  English
                  {locale === "en" ? <Check className="h-4 w-4" /> : null}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[rgb(var(--text)/0.06)]"
                  onClick={() => {
                    requestLocaleChange("zh");
                    setLangOpen(false);
                  }}
                >
                  中文
                  {locale === "zh" ? <Check className="h-4 w-4" /> : null}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:ml-0">
          <ThemeToggle />
          <AccountMenu className="w-[8.25rem] px-2.5 text-xs sm:w-[9.5rem] sm:px-3 sm:text-sm md:w-[11rem]" />
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.55)] bg-[rgb(var(--surface)/0.6)] text-[rgb(var(--text))] transition hover:border-[rgb(var(--text)/0.45)] md:hidden"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={translate("Toggle mobile menu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <button aria-label={translate("Close mobile navigation")} className="fixed inset-0 z-30 bg-black/55 md:hidden" onClick={() => setMobileOpen(false)} />}

      <div
        className={`fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-[min(84vw,340px)] border-l border-[rgb(var(--glass-stroke-soft)/0.65)] bg-[rgb(var(--bg-elev)/0.96)] p-4 text-[rgb(var(--text))] shadow-[0_24px_60px_rgb(var(--shadow)/0.3)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="grid gap-2 text-sm">
          {navItems.map((item) => (
            <div key={item.href} className="grid gap-2">
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.55)] bg-[rgb(var(--surface)/0.55)] px-3 py-2 transition hover:border-[rgb(var(--text)/0.4)] hover:bg-[rgb(var(--text)/0.05)]"
              >
                {translate(item.label)}
              </Link>
              {item.href === "/dashboard" ? (
                <div className="rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.55)] p-2" data-translation-lock="true">
                  <p className="px-1 pb-1 text-xs soft-text">{translate("Language")}</p>
                  <div className="grid gap-1">
                    <button
                      type="button"
                      onClick={() => requestLocaleChange("en")}
                      className={`rounded-md px-2.5 py-2 text-left transition ${locale === "en" ? "bg-[rgb(var(--text)/0.09)] text-[rgb(var(--text))]" : "hover:bg-[rgb(var(--text)/0.05)]"}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => requestLocaleChange("zh")}
                      className={`rounded-md px-2.5 py-2 text-left transition ${locale === "zh" ? "bg-[rgb(var(--text)/0.09)] text-[rgb(var(--text))]" : "hover:bg-[rgb(var(--text)/0.05)]"}`}
                    >
                      中文
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <Link
            href="/search/advanced"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.55)] bg-[rgb(var(--surface)/0.55)] px-3 py-2 transition hover:border-[rgb(var(--text)/0.4)] hover:bg-[rgb(var(--text)/0.05)]"
          >
            <Search className="h-4 w-4" /> {translate("Advanced Search")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
