"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, LayoutDashboard, LogIn, Shield, UserPlus } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [label, setLabel] = useState("Account");
  const wrapperRef = useRef<HTMLDivElement>(null);

  async function refreshAuthStateFromSession(session: Session | null, source: "initial" | "auth_change") {
    if (process.env.NODE_ENV !== "production") console.info("[account-menu] auth refresh start", { source, userId: session?.user?.id ?? null });
    const authenticated = Boolean(session);
    setSignedIn(authenticated);

    if (!authenticated || !session?.user?.id) {
      setIsAdmin(false);
      setLabel("Account");
      if (process.env.NODE_ENV !== "production") console.info("[account-menu] auth refresh end", { source, authenticated: false });
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    if (process.env.NODE_ENV !== "production") console.info("[account-menu] profile fetch start", { userId: session.user.id, source });
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (process.env.NODE_ENV !== "production") console.info("[account-menu] profile fetch end", { source, profile });
    setIsAdmin(profile?.role === "admin");
    setLabel(profile?.username ?? session.user.email?.split("@")[0] ?? "Account");
    if (process.env.NODE_ENV !== "production") console.info("[account-menu] auth refresh end", { source, authenticated: true });
  }

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      void refreshAuthStateFromSession(data.session, "initial");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV !== "production") console.info("[account-menu] auth state changed", { event, userId: session?.user?.id ?? null });
      void refreshAuthStateFromSession(session, "auth_change");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function logout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setSignedIn(false);
    setIsAdmin(false);
    setLabel("Account");
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex max-w-[170px] items-center gap-1 truncate rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.48)] bg-[rgb(var(--glass-bg)/0.58)] px-2.5 py-1.5 text-sm soft-text shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.26)] transition hover:border-[rgb(var(--glass-stroke)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)]">
        <span className="truncate">{label}</span> <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="surface-card premium-border absolute right-0 z-50 mt-2 w-52 rounded-2xl p-1.5 shadow-2xl">
          {!signedIn ? (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-[rgb(var(--glass-bg-strong)/0.46)]"><LogIn className="h-4 w-4" /> Log in</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-[rgb(var(--glass-bg-strong)/0.46)]"><UserPlus className="h-4 w-4" /> Sign up</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-[rgb(var(--glass-bg-strong)/0.46)]"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-[rgb(var(--glass-bg-strong)/0.46)]"><Shield className="h-4 w-4" /> Admin</Link>
              )}
              <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[rgb(var(--glass-bg-strong)/0.46)]"><LogOut className="h-4 w-4" /> Log out</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
