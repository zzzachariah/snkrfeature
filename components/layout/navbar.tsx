"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/layout/account-menu";
import { createClient } from "@/lib/supabase/client";

type NavHref = "/" | "/compare" | "/submit" | "/dashboard" | "/admin" | "/search/advanced";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
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
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--glass-bg)/0.52)] shadow-[0_8px_24px_rgb(var(--glass-shadow)/0.12)] backdrop-blur-[var(--glass-blur)]">
      <div className="container-shell flex h-16 items-center gap-2 md:gap-4">
        <Link href="/" className="text-lg font-semibold tracking-[0.08em]">snkrfeature</Link>
        <nav className="hidden items-center gap-2 text-sm md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-2.5 py-1.5 soft-text transition hover:bg-[rgb(var(--glass-bg-strong)/0.45)] hover:text-[rgb(var(--text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)]">{item.label}</Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center md:flex">
          <Link href="/search/advanced">
            <Button variant="secondary" className="inline-flex items-center gap-1.5">
              <Search className="h-4 w-4" /> Advanced Search
            </Button>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <AccountMenu />
          <button
            className="inline-flex rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--glass-bg)/0.58)] p-2 soft-text transition hover:border-[rgb(var(--glass-stroke)/0.54)] hover:text-[rgb(var(--text))] md:hidden"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <button aria-label="Close mobile navigation" className="fixed inset-0 z-30 bg-[rgb(var(--glass-overlay)/0.28)] backdrop-blur-[2px] md:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={`fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-[min(84vw,340px)] border-l border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--glass-bg-strong)/0.74)] p-4 shadow-[0_24px_60px_rgb(var(--glass-shadow)/0.32)] backdrop-blur-[var(--glass-blur-strong)] transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
        <nav className="grid gap-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.46)] px-3 py-2 transition hover:border-[rgb(var(--ring)/0.45)] hover:bg-[rgb(var(--glass-bg)/0.4)]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/search/advanced"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.46)] px-3 py-2 transition hover:border-[rgb(var(--ring)/0.45)] hover:bg-[rgb(var(--glass-bg)/0.4)]"
          >
            <Search className="h-4 w-4" /> Advanced Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
