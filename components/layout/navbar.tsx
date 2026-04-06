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
      <div className="container-shell relative flex h-16 items-center gap-2 rounded-2xl border border-white/15 bg-[rgba(20,20,23,0.82)] text-[rgb(245,245,247)] shadow-[0_16px_32px_rgba(0,0,0,0.28)] backdrop-blur-[20px] backdrop-saturate-[180%] md:gap-4">
        <Link href="/" className="max-w-[7.6rem] truncate text-base font-semibold tracking-[0.02em] sm:max-w-[9.5rem] md:max-w-none md:text-lg">snkrfeature</Link>
        <nav className="ml-1 hidden items-center gap-1 rounded-xl border border-white/10 bg-black/25 p-1 text-sm md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`liquid-interactive inline-flex h-10 items-center rounded-xl px-3.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)] ${
                pathname === item.href
                  ? "border border-[rgb(var(--accent)/0.32)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))] shadow-[inset_0_-1px_0_rgb(var(--accent)/0.45)]"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center md:flex">
          <Link href="/search/advanced">
            <Button variant="secondary" className="inline-flex h-10 items-center gap-1.5 rounded-full border-white/20 bg-white/10 px-3.5 text-white hover:bg-white/15">
              <Search className="h-4 w-4" /> Advanced Search
            </Button>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:ml-0">
          <ThemeToggle />
          <AccountMenu className="w-[8.25rem] px-2.5 text-xs sm:w-[9.5rem] sm:px-3 sm:text-sm md:w-[11rem]" />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:border-white/35 md:hidden"
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && <button aria-label="Close mobile navigation" className="fixed inset-0 z-30 bg-black/45 md:hidden" onClick={() => setMobileOpen(false)} />}

      <div className={`fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-[min(84vw,340px)] border-l border-white/15 bg-[rgba(20,20,23,0.96)] p-4 text-[rgb(245,245,247)] shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-[20px] backdrop-saturate-[180%] transition-transform duration-200 md:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
        <nav className="grid gap-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-white/15 px-3 py-2 transition hover:border-[rgb(var(--accent)/0.72)] hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/search/advanced"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 transition hover:border-[rgb(var(--accent)/0.72)] hover:bg-white/10"
          >
            <Search className="h-4 w-4" /> Advanced Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
