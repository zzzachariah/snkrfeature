"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Menu, Search, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/layout/account-menu";
import { useLocale } from "@/components/i18n/locale-provider";
import { createClient } from "@/lib/supabase/client";

type NavHref = "/" | "/compare" | "/submit" | "/dashboard" | "/admin" | "/search/advanced";

export function Navbar() {
  const pathname = usePathname();
  const { locale, requestLocaleChange } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  return (
    <header className="sticky top-3 z-40 px-2 md:px-4" data-no-translate="true">
      <div className="container-shell relative flex h-16 items-center gap-2 rounded-2xl border border-[rgb(var(--glass-stroke-soft)/0.68)] bg-[rgb(var(--bg-elev)/0.82)] text-[rgb(var(--text))] shadow-[0_16px_32px_rgb(var(--shadow)/0.16)] backdrop-blur-[20px] backdrop-saturate-[180%] md:gap-4">
        <Link href="/" className="max-w-[7.6rem] truncate text-base font-semibold tracking-[0.02em] sm:max-w-[9.5rem] md:max-w-none md:text-lg">snkrfeature</Link>
        <nav className="ml-1 hidden items-center gap-1 rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.48)] bg-[rgb(var(--surface)/0.72)] p-1 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`liquid-interactive inline-flex h-10 items-center rounded-xl px-3.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)] ${
                pathname === item.href
                  ? "border border-[rgb(var(--accent)/0.32)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] shadow-[inset_0_-1px_0_rgb(var(--accent)/0.45)]"
                  : "soft-text hover:bg-[rgb(var(--accent)/0.1)] hover:text-[rgb(var(--text))]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLangOpen((prev) => !prev)}
              className="inline-flex h-10 w-[5.25rem] items-center justify-between rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.62)] bg-[rgb(var(--surface)/0.78)] px-2.5 text-sm font-medium text-[rgb(var(--text))] transition hover:border-[rgb(var(--accent)/0.62)]"
              aria-haspopup="menu"
              aria-expanded={langOpen}
              aria-label="Language switcher" data-translation-lock="true"
            >
              <span data-translation-lock="true">{locale === "en" ? "Eng" : "简"}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-[calc(100%+0.45rem)] z-50 w-[9rem] rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.62)] bg-[rgb(var(--surface)/0.98)] p-1 shadow-[0_12px_28px_rgb(var(--glass-shadow)/0.2)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[rgb(var(--accent)/0.08)]"
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
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[rgb(var(--accent)/0.08)]"
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

          <Link href="/search/advanced">
            <Button variant="secondary" className="inline-flex h-10 items-center gap-1.5 px-3.5">
              <Search className="h-4 w-4" /> Advanced Search
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:ml-0">
          <ThemeToggle />
          <AccountMenu className="w-[8.25rem] px-2.5 text-xs sm:w-[9.5rem] sm:px-3 sm:text-sm md:w-[11rem]" />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.62)] bg-[rgb(var(--surface)/0.78)] text-[rgb(var(--text))] transition hover:border-[rgb(var(--accent)/0.62)] md:hidden"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <button aria-label="Close mobile navigation" className="fixed inset-0 z-30 bg-black/45 md:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={`fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-[min(84vw,340px)] border-l border-[rgb(var(--glass-stroke-soft)/0.72)] bg-[rgb(var(--bg-elev)/0.96)] p-4 text-[rgb(var(--text))] shadow-[0_24px_60px_rgb(var(--shadow)/0.3)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
        <nav className="grid gap-2 text-sm">
          {navItems.map((item) => (
            <div key={item.href} className="grid gap-2">
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.6)] px-3 py-2 transition hover:border-[rgb(var(--accent)/0.72)] hover:bg-[rgb(var(--accent)/0.08)]"
              >
                {item.label}
              </Link>
              {item.href === "/dashboard" ? (
                <div className="rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.6)] p-2" data-translation-lock="true">
                  <p className="px-1 pb-1 text-xs soft-text">Language</p>
                  <div className="grid gap-1">
                    <button
                      type="button"
                      onClick={() => requestLocaleChange("en")}
                      className={`rounded-md px-2.5 py-2 text-left transition ${locale === "en" ? "bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--text))]" : "hover:bg-[rgb(var(--accent)/0.08)]"}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => requestLocaleChange("zh")}
                      className={`rounded-md px-2.5 py-2 text-left transition ${locale === "zh" ? "bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--text))]" : "hover:bg-[rgb(var(--accent)/0.08)]"}`}
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
            className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.6)] px-3 py-2 transition hover:border-[rgb(var(--accent)/0.72)] hover:bg-[rgb(var(--accent)/0.08)]"
          >
            <Search className="h-4 w-4" /> Advanced Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
