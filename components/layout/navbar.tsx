"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/layout/account-menu";
import { createClient } from "@/lib/supabase/client";

type NavHref = "/" | "/compare" | "/submit" | "/dashboard" | "/admin" | "/search/advanced";

export function Navbar() {
  const pathname = usePathname();
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
    <header className="sticky top-3 z-40 px-2 md:px-4">
      <div className="container-shell relative flex h-16 items-center gap-2 rounded-2xl border border-[rgb(var(--glass-stroke-soft)/0.65)] bg-[rgb(var(--glass-bg)/0.96)] shadow-[0_14px_34px_rgb(var(--glass-shadow)/0.16)] md:gap-4">
        <Link href="/" className="text-lg font-semibold tracking-[0.08em]">snkrfeature</Link>
        <nav className="ml-1 hidden items-center gap-1 rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--bg-elev)/0.92)] p-1 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`liquid-interactive inline-flex h-10 items-center rounded-xl px-3.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)] ${
                pathname === item.href
                  ? "border border-[rgb(var(--accent)/0.32)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] shadow-[inset_0_-1px_0_rgb(var(--accent)/0.45)]"
                  : "soft-text hover:bg-[rgb(var(--glass-bg-strong)/0.62)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center md:flex">
          <Link href="/search/advanced">
            <Button variant="secondary" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5">
              <Search className="h-4 w-4" /> Advanced Search
            </Button>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <AccountMenu />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.56)] bg-[rgb(var(--bg-elev)/0.94)] soft-text transition hover:border-[rgb(var(--accent)/0.45)] md:hidden"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <button aria-label="Close mobile navigation" className="fixed inset-0 z-30 bg-[rgb(var(--glass-overlay)/0.28)] md:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={`fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-[min(84vw,340px)] border-l border-[rgb(var(--glass-stroke-soft)/0.62)] bg-[rgb(var(--glass-bg-strong)/0.96)] p-4 shadow-[0_24px_60px_rgb(var(--glass-shadow)/0.32)] transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
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
