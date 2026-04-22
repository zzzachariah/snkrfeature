"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, MessageCircle, ThumbsUp, ThumbsDown, Upload, GitCompare, Settings as SettingsIcon, LayoutGrid, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SneakerLoader } from "@/components/ui/sneaker-loader";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/locale-provider";

type TabKey = "Overview" | "Comments" | "Liked comments" | "Disliked comments" | "Submissions" | "Saved compares" | "Settings";
const tabs: TabKey[] = ["Overview", "Comments", "Liked comments", "Disliked comments", "Submissions", "Saved compares", "Settings"];

const tabIcons: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  "Overview": LayoutGrid,
  "Comments": MessageCircle,
  "Liked comments": ThumbsUp,
  "Disliked comments": ThumbsDown,
  "Submissions": Upload,
  "Saved compares": GitCompare,
  "Settings": SettingsIcon
};

type DashboardComment = {
  id: string;
  content: string;
  created_at: string;
  shoe_id: string;
  shoe_slug: string;
  shoe_name: string;
  likes: number;
  dislikes: number;
};

type CommentWithShoeRow = {
  id: string;
  content: string;
  created_at: string;
  shoe_id: string;
  shoes: { slug: string; shoe_name: string } | { slug: string; shoe_name: string }[] | null;
};

type VoteRow = {
  comment_id: string;
  vote_type: "like" | "dislike";
};

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const listContainer = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } }
};
const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease } }
};

export default function DashboardPage() {
  const { translate } = useLocale();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("Overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [comments, setComments] = useState<DashboardComment[]>([]);
  const [likedComments, setLikedComments] = useState<DashboardComment[]>([]);
  const [dislikedComments, setDislikedComments] = useState<DashboardComment[]>([]);
  const [submissions, setSubmissions] = useState<Array<{ id: string; status: string; created_at: string }>>([]);
  const [savedCompares, setSavedCompares] = useState<Array<{ id: string; title: string; shoe_ids: string[]; created_at: string }>>([]);
  const [deletingCompareId, setDeletingCompareId] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const sb = supabase;

    async function load() {
      if (process.env.NODE_ENV !== "production") console.info("[dashboard] user load start");
      try {
        const { data } = await sb.auth.getSession();
        if (process.env.NODE_ENV !== "production") console.info("[dashboard] session", data.session?.user?.id ?? null);
        const session = data.session;
        if (!session?.user?.id) {
          setLoading(false);
          if (process.env.NODE_ENV !== "production") console.info("[dashboard] user load end", { authenticated: false });
          return;
        }

        setSignedIn(true);
        setUserId(session.user.id);
        setEmail(session.user.email ?? "");

        if (process.env.NODE_ENV !== "production") console.info("[dashboard] profile fetch start", { userId: session.user.id });
        const [profileRes, commentsRes, submissionsRes, compareRes, votesRes] = await Promise.all([
          sb.from("profiles").select("username, role").eq("id", session.user.id).maybeSingle(),
          sb.from("comments").select("id, content, created_at, shoe_id, shoes(slug, shoe_name)").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50),
          sb.from("user_submissions").select("id, status, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
          sb.from("saved_comparisons").select("id, title, shoe_ids, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
          sb.from("comment_votes").select("comment_id, vote_type").eq("user_id", session.user.id)
        ]);
        if (process.env.NODE_ENV !== "production") console.info("[dashboard] profile fetch end", { profile: profileRes.data, error: profileRes.error });

        if (process.env.NODE_ENV !== "production") {
          console.info("[dashboard] comments", commentsRes.data?.length ?? 0, commentsRes.error);
        }
        setUsername(profileRes.data?.username ?? "");
        setRole(profileRes.data?.role === "admin" ? "admin" : "user");

        const myComments = (commentsRes.data ?? []) as CommentWithShoeRow[];
        const myCommentIds = myComments.map((c) => c.id);

        const voteCounts = new Map<string, { likes: number; dislikes: number }>();
        if (myCommentIds.length > 0) {
          const { data: voteRows } = await sb.from("comment_votes").select("comment_id, vote_type").in("comment_id", myCommentIds);
          for (const vote of voteRows ?? []) {
            const current = voteCounts.get(vote.comment_id) ?? { likes: 0, dislikes: 0 };
            if (vote.vote_type === "like") current.likes += 1;
            if (vote.vote_type === "dislike") current.dislikes += 1;
            voteCounts.set(vote.comment_id, current);
          }
        }

        const normalizedMyComments: DashboardComment[] = myComments.map((comment) => {
          const totals = voteCounts.get(comment.id) ?? { likes: 0, dislikes: 0 };
          const shoe = Array.isArray(comment.shoes) ? comment.shoes[0] : comment.shoes;
          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            shoe_id: comment.shoe_id,
            shoe_slug: shoe?.slug ?? "",
            shoe_name: shoe?.shoe_name ?? "Unknown shoe",
            likes: totals.likes,
            dislikes: totals.dislikes
          };
        });

        const userVotes = (votesRes.data ?? []) as VoteRow[];
        const likedIds = userVotes.filter((v) => v.vote_type === "like").map((v) => v.comment_id);
        const dislikedIds = userVotes.filter((v) => v.vote_type === "dislike").map((v) => v.comment_id);

        async function fetchVotedComments(commentIds: string[]) {
          if (commentIds.length === 0) return [] as DashboardComment[];

          const { data: rows } = await sb
            .from("comments")
            .select("id, content, created_at, shoe_id, shoes(slug, shoe_name)")
            .in("id", commentIds)
            .order("created_at", { ascending: false });

          const ids = (rows ?? []).map((row) => row.id);
          const counterMap = new Map<string, { likes: number; dislikes: number }>();
          if (ids.length > 0) {
            const { data: counters } = await sb.from("comment_votes").select("comment_id, vote_type").in("comment_id", ids);
            for (const vote of counters ?? []) {
              const current = counterMap.get(vote.comment_id) ?? { likes: 0, dislikes: 0 };
              if (vote.vote_type === "like") current.likes += 1;
              if (vote.vote_type === "dislike") current.dislikes += 1;
              counterMap.set(vote.comment_id, current);
            }
          }

          return ((rows ?? []) as CommentWithShoeRow[]).map((row) => {
            const totals = counterMap.get(row.id) ?? { likes: 0, dislikes: 0 };
            const shoe = Array.isArray(row.shoes) ? row.shoes[0] : row.shoes;
            return {
              id: row.id,
              content: row.content,
              created_at: row.created_at,
              shoe_id: row.shoe_id,
              shoe_slug: shoe?.slug ?? "",
              shoe_name: shoe?.shoe_name ?? "Unknown shoe",
              likes: totals.likes,
              dislikes: totals.dislikes
            };
          });
        }

        setComments(normalizedMyComments);
        setLikedComments(await fetchVotedComments(likedIds));
        setDislikedComments(await fetchVotedComments(dislikedIds));
        setSubmissions((submissionsRes.data ?? []) as Array<{ id: string; status: string; created_at: string }>);
        const rawCompares = (compareRes.data ?? []) as Array<{ id: string; title: string; shoe_ids: unknown; created_at: string }>;
        setSavedCompares(
          rawCompares.map((row) => ({
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            shoe_ids: Array.isArray(row.shoe_ids) ? (row.shoe_ids as unknown[]).filter((v): v is string => typeof v === "string") : []
          }))
        );
        setLoading(false);
        if (process.env.NODE_ENV !== "production") console.info("[dashboard] user load end", { authenticated: true, userId: session.user.id });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") console.info("[dashboard] user load failed", error);
        setLoading(false);
      }
    }

    load();
  }, []);

  async function saveSettings() {
    const supabase = createClient();
    if (!supabase || !userId) return;

    setSettingsError(false);
    setSettingsMessage("");

    if (!username.trim()) {
      setSettingsError(true);
      return setSettingsMessage("Username cannot be empty.");
    }

    const { error: usernameError } = await supabase.from("profiles").update({ username: username.trim() }).eq("id", userId);
    if (usernameError) {
      setSettingsError(true);
      return setSettingsMessage(`Failed to update username: ${usernameError.message}`);
    }

    setSettingsMessage("Profile settings saved successfully.");
  }

  async function deleteSavedCompare(id: string) {
    if (deletingCompareId) return;
    setDeletingCompareId(id);
    try {
      const response = await fetch("/api/comparisons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json().catch(() => ({ ok: false }));
      if (response.ok && data.ok) {
        setSavedCompares((prev) => prev.filter((row) => row.id !== id));
      }
    } finally {
      setDeletingCompareId(null);
    }
  }

  async function changePassword() {
    setSettingsError(false);
    setSettingsMessage("");

    if (newPassword.length < 8) {
      setSettingsError(true);
      return setSettingsMessage("New password must be at least 8 characters.");
    }

    if (newPassword !== confirmPassword) {
      setSettingsError(true);
      return setSettingsMessage("The two password entries do not match.");
    }

    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });

    const data = await response.json();
    setSettingsError(!data.ok);
    setSettingsMessage(data.message ?? (data.ok ? "Password updated." : "Failed to update password."));

    if (data.ok) {
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
    }
  }

  const summary = useMemo(() => ({
    comments: comments.length,
    likedComments: likedComments.length,
    dislikedComments: dislikedComments.length,
    submissions: submissions.length,
    compares: savedCompares.length
  }), [comments.length, dislikedComments.length, likedComments.length, savedCompares.length, submissions.length]);

  function renderCommentCard(item: DashboardComment) {
    return (
      <motion.div
        key={item.id}
        variants={listItem}
        className="premium-hover-lift rounded-2xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.6)] p-4 text-sm backdrop-blur-md"
      >
        <p className="leading-relaxed">{item.content}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs soft-text">
          <span>{new Date(item.created_at).toLocaleString()}</span>
          <span aria-hidden>·</span>
          <span className="font-medium text-[rgb(var(--text)/0.85)]">{item.shoe_name}</span>
          {item.shoe_slug && (
            <>
              <span aria-hidden>·</span>
              <Link className="underline underline-offset-4 hover:text-[rgb(var(--text))]" href={`/shoes/${item.shoe_slug}`}>
                {translate("View shoe")}
              </Link>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {item.likes}</span>
          <span className="inline-flex items-center gap-1"><ThumbsDown className="h-3 w-3" /> {item.dislikes}</span>
        </div>
      </motion.div>
    );
  }

  function StatTile({ label, value }: { label: string; value: number }) {
    return (
      <motion.div
        variants={listItem}
        className="premium-hover-lift group relative overflow-hidden rounded-2xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.65)] p-5 backdrop-blur-md"
      >
        <div className="relative z-10">
          <p className="auth-eyebrow">{translate(label)}</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[rgb(var(--text))]">
            <AnimatedCounter value={value} />
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-5 bottom-4 z-10 h-px bg-gradient-to-r from-transparent via-[rgb(var(--text)/0.18)] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </motion.div>
    );
  }

  function renderTabContent() {
    if (!signedIn && !loading) {
      return (
        <Card className="p-6">
          <p className="text-sm soft-text">{translate("Please sign in to view your User Center.")}</p>
        </Card>
      );
    }

    switch (activeTab) {
      case "Overview":
        return (
          <motion.div
            initial="initial"
            animate="animate"
            variants={listContainer}
            className="space-y-5"
          >
            <motion.div variants={listItem} className="glass-card relative overflow-hidden p-6 md:p-7">
              <div aria-hidden className="mesh-bg opacity-70" />
              <div className="relative z-10">
                <p className="auth-eyebrow">{translate("overview")}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
                  {loading
                    ? translate("Loading account...")
                    : `${translate("Welcome back")}, `}
                  {!loading && (
                    <span className="brand-shimmer">{username || translate("user")}</span>
                  )}
                </h2>
                <p className="mt-1 text-sm soft-text">{email}</p>
                {!loading && role === "admin" && (
                  <p className="mt-2 inline-flex items-center rounded-full border border-[rgb(var(--muted)/0.6)] bg-[rgb(var(--bg-elev)/0.7)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[rgb(var(--text))]">
                    {translate("Admin account")}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div variants={listContainer} className="grid gap-4 md:grid-cols-3">
              <StatTile label="My comments" value={summary.comments} />
              <StatTile label="Liked comments" value={summary.likedComments} />
              <StatTile label="Disliked comments" value={summary.dislikedComments} />
            </motion.div>
          </motion.div>
        );
      case "Comments":
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{translate("My comments")}</h2>
            <motion.div initial="initial" animate="animate" variants={listContainer} className="mt-4 space-y-3">
              {comments.length === 0 && <p className="text-sm soft-text">{translate("No comments yet.")}</p>}
              {comments.map(renderCommentCard)}
            </motion.div>
          </Card>
        );
      case "Liked comments":
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{translate("Comments you liked")}</h2>
            <motion.div initial="initial" animate="animate" variants={listContainer} className="mt-4 space-y-3">
              {likedComments.length === 0 && <p className="text-sm soft-text">{translate("You have not liked any comments yet.")}</p>}
              {likedComments.map(renderCommentCard)}
            </motion.div>
          </Card>
        );
      case "Disliked comments":
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{translate("Comments you disliked")}</h2>
            <motion.div initial="initial" animate="animate" variants={listContainer} className="mt-4 space-y-3">
              {dislikedComments.length === 0 && <p className="text-sm soft-text">{translate("You have not disliked any comments yet.")}</p>}
              {dislikedComments.map(renderCommentCard)}
            </motion.div>
          </Card>
        );
      case "Submissions":
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{translate("Submissions")}</h2>
            <motion.div initial="initial" animate="animate" variants={listContainer} className="mt-4 space-y-3">
              {submissions.length === 0 && <p className="text-sm soft-text">{translate("No submissions yet.")}</p>}
              {submissions.map((item) => (
                <motion.div
                  key={item.id}
                  variants={listItem}
                  className="premium-hover-lift rounded-2xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.6)] p-4 text-sm backdrop-blur-md"
                >
                  <p className="font-medium">
                    {translate("Status")}: <span className="text-[rgb(var(--text)/0.8)]">{translate(item.status)}</span>
                  </p>
                  <p className="mt-1 text-xs soft-text">{new Date(item.created_at).toLocaleString()}</p>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        );
      case "Saved compares":
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{translate("Saved compares")}</h2>
            <motion.div initial="initial" animate="animate" variants={listContainer} className="mt-4 space-y-3">
              {savedCompares.length === 0 && <p className="text-sm soft-text">{translate("No saved comparisons yet.")}</p>}
              {savedCompares.map((item) => {
                const openHref = (item.shoe_ids.length ? `/compare?ids=${item.shoe_ids.join(",")}` : "/compare") as Route;
                const deleting = deletingCompareId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    variants={listItem}
                    className="premium-hover-lift rounded-2xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.6)] p-4 text-sm backdrop-blur-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs soft-text">
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                          <span aria-hidden>·</span>
                          <span>{item.shoe_ids.length} {item.shoe_ids.length === 1 ? translate("shoe") : translate("shoes")}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={openHref}
                          className="rounded-lg border border-[rgb(var(--muted)/0.5)] px-3 py-1.5 text-xs font-medium soft-text transition hover:border-[rgb(var(--text)/0.45)] hover:text-[rgb(var(--text))]"
                        >
                          {translate("Open")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteSavedCompare(item.id)}
                          disabled={deleting}
                          aria-label={translate("Delete")}
                          className="rounded-lg border border-[rgb(var(--muted)/0.5)] p-2 soft-text transition hover:border-[rgb(var(--text)/0.45)] hover:text-[rgb(var(--text))] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </Card>
        );
      case "Settings":
        return (
          <Card className="p-6">
            <h2 className="text-xl font-semibold tracking-[-0.015em]">{translate("Settings")}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] soft-text">{translate("Username")}</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] soft-text">{translate("Email (read-only)")}</label>
                <Input value={email} disabled />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] soft-text">{translate("Current password")}</label>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type={showCurrentPassword ? "text" : "password"} placeholder={translate("Enter current password")} />
                  <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setShowCurrentPassword((v) => !v)}>
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={() => setChangePasswordOpen(true)}>{translate("Change password")}</Button>
              </div>
            </div>
            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.18, ease }}>
                <Button type="button" className="w-full sm:w-auto" onClick={saveSettings}>{translate("Save profile")}</Button>
              </motion.div>
              <AnimatePresence mode="wait">
                {settingsMessage && (
                  <motion.div
                    key={`${settingsError ? "err" : "ok"}-${settingsMessage}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.24, ease }}
                  >
                    <FeedbackMessage message={settingsMessage} isError={settingsError} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Modal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Change password">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs soft-text">{translate("New password")}</label>
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder={translate("At least 8 characters")} />
                </div>
                <div>
                  <label className="mb-1 block text-xs soft-text">{translate("Confirm new password")}</label>
                  <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder={translate("Re-enter new password")} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setChangePasswordOpen(false)}>{translate("Cancel")}</Button>
                  <Button type="button" onClick={changePassword}>{translate("Update password")}</Button>
                </div>
              </div>
            </Modal>
          </Card>
        );
    }
  }

  return (
    <main className="container-shell relative py-10 md:py-12">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex flex-col gap-2"
      >
        <p className="auth-eyebrow">{translate("user center")}</p>
        <h1 className="t-display-sm">
          {translate("Welcome back")}
          {!loading && username ? (
            <>
              , <span className="brand-shimmer">{username}</span>
            </>
          ) : null}
          .
        </h1>
        <p className="max-w-xl text-sm soft-text">
          {translate("A living index of every pair worth playing in.")}
        </p>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease }}
          className="glass-card h-max p-3 lg:sticky lg:top-24 lg:p-4"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold tracking-[0.01em]">{translate("User center")}</h2>
            {role === "admin" && (
              <span className="rounded-full border border-[rgb(var(--muted)/0.6)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.22em]">
                {translate("Admin")}
              </span>
            )}
          </div>
          <ul className="chip-scroll flex snap-x gap-2 overflow-x-auto pb-1 pr-1 text-sm lg:grid lg:grid-cols-1 lg:gap-1.5 lg:overflow-x-visible lg:pb-0 lg:pr-0">
            {tabs.map((tab) => {
              const Icon = tabIcons[tab];
              const active = activeTab === tab;
              return (
                <li key={tab} className="relative shrink-0 snap-start lg:shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative z-10 flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left transition-colors duration-200 lg:whitespace-normal ${
                      active ? "text-[rgb(var(--text))]" : "soft-text hover:text-[rgb(var(--text))]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="dashboard-tab-pill"
                        transition={{ type: "spring", stiffness: 520, damping: 36 }}
                        className="absolute inset-0 -z-10 rounded-xl border border-[rgb(var(--text)/0.22)] bg-[rgb(var(--text)/0.06)] shadow-[inset_0_1px_0_rgb(var(--glass-highlight)/0.35)]"
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="lg:truncate">{translate(tab)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.aside>

        <section className="space-y-4">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease }}
            >
              <Card className="flex min-h-[320px] items-center justify-center p-10">
                <SneakerLoader label="Loading dashboard data" />
              </Card>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </div>
    </main>
  );
}
