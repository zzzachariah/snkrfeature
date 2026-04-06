"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, LayoutDashboard, LogIn, Shield, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AccountMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [label, setLabel] = useState("Account");
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right)
    });
  }

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
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    function onViewportChange() {
      updateMenuPosition();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  async function logout() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setSignedIn(false);
    setIsAdmin(false);
    setLabel("Account");
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-10 max-w-[190px] items-center gap-2 truncate rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.5)] bg-[rgb(var(--glass-bg)/0.62)] px-3 text-sm text-[rgb(var(--text))] shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.28)] transition hover:border-[rgb(var(--ring)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.45)]",
          className
        )}
      >
        <span className="truncate">{label}</span> <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      <AnimatePresence>
        {open && typeof document !== "undefined" && createPortal(
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="surface-card premium-border fixed z-[70] w-56 origin-top-right overflow-hidden rounded-2xl p-1.5 shadow-2xl"
            role="menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
          {!signedIn ? (
            <>
              <Link href="/login" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--glass-bg-strong)/0.5)]"><LogIn className="h-4 w-4" /> Log in</Link>
              <Link href="/signup" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--glass-bg-strong)/0.5)]"><UserPlus className="h-4 w-4" /> Sign up</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--glass-bg-strong)/0.5)]"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
              {isAdmin && (
                <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--glass-bg-strong)/0.5)]"><Shield className="h-4 w-4" /> Admin</Link>
              )}
              <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--glass-bg-strong)/0.5)]"><LogOut className="h-4 w-4" /> Log out</button>
            </>
          )}
          </motion.div>
        , document.body)}
      </AnimatePresence>
    </div>
  );
}
