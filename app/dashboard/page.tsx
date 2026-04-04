"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { BrandLoader } from "@/components/ui/brand-loader";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { createClient } from "@/lib/supabase/client";

type TabKey = "Overview" | "Comments" | "Liked comments" | "Disliked comments" | "Submissions" | "Saved compares" | "Settings";
const tabs: TabKey[] = ["Overview", "Comments", "Liked comments", "Disliked comments", "Submissions", "Saved compares", "Settings"];

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

export default function DashboardPage() {
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
  const [savedCompares, setSavedCompares] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
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
          sb.from("saved_comparisons").select("id, title, created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
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
        setSavedCompares((compareRes.data ?? []) as Array<{ id: string; title: string; created_at: string }>);
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
      <div key={item.id} className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.5)] p-3 text-sm">
        <p>{item.content}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs soft-text">
          <span>{new Date(item.created_at).toLocaleString()}</span>
          <span>•</span>
          <span>{item.shoe_name}</span>
          {item.shoe_slug && (
            <>
              <span>•</span>
              <Link className="underline" href={`/shoes/${item.shoe_slug}`}>View shoe</Link>
            </>
          )}
          <span>• 👍 {item.likes}</span>
          <span>👎 {item.dislikes}</span>
        </div>
      </div>
    );
  }

  function renderTabContent() {
    if (!signedIn && !loading) {
      return <Card className="p-5"><p className="text-sm soft-text">Please sign in to view your User Center.</p></Card>;
    }

    switch (activeTab) {
      case "Overview":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="mt-2 soft-text">{loading ? "Loading account..." : `Welcome back, ${username || "user"} (${email})`}</p>
            {!loading && role === "admin" && <p className="mt-1 text-xs font-medium text-emerald-400">Admin account</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3"><p className="text-xs soft-text">My comments</p><p className="mt-1 text-xl font-semibold">{summary.comments}</p></div>
              <div className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3"><p className="text-xs soft-text">Liked comments</p><p className="mt-1 text-xl font-semibold">{summary.likedComments}</p></div>
              <div className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.55)] p-3"><p className="text-xs soft-text">Disliked comments</p><p className="mt-1 text-xl font-semibold">{summary.dislikedComments}</p></div>
            </div>
          </Card>
        );
      case "Comments":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">My comments</h2>
            <div className="mt-3 space-y-2">
              {comments.length === 0 && <p className="text-sm soft-text">No comments yet.</p>}
              {comments.map(renderCommentCard)}
            </div>
          </Card>
        );
      case "Liked comments":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Comments you liked</h2>
            <div className="mt-3 space-y-2">
              {likedComments.length === 0 && <p className="text-sm soft-text">You have not liked any comments yet.</p>}
              {likedComments.map(renderCommentCard)}
            </div>
          </Card>
        );
      case "Disliked comments":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Comments you disliked</h2>
            <div className="mt-3 space-y-2">
              {dislikedComments.length === 0 && <p className="text-sm soft-text">You have not disliked any comments yet.</p>}
              {dislikedComments.map(renderCommentCard)}
            </div>
          </Card>
        );
      case "Submissions":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Submissions</h2>
            <div className="mt-3 space-y-2">
              {submissions.length === 0 && <p className="text-sm soft-text">No submissions yet.</p>}
              {submissions.map((item) => <div key={item.id} className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.5)] p-3 text-sm"><p>Status: {item.status}</p><p className="mt-1 text-xs soft-text">{new Date(item.created_at).toLocaleString()}</p></div>)}
            </div>
          </Card>
        );
      case "Saved compares":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Saved compares</h2>
            <div className="mt-3 space-y-2">
              {savedCompares.length === 0 && <p className="text-sm soft-text">No saved comparisons yet.</p>}
              {savedCompares.map((item) => <div key={item.id} className="rounded-xl border border-[rgb(var(--muted)/0.45)] bg-[rgb(var(--bg-elev)/0.5)] p-3 text-sm"><p>{item.title}</p><p className="mt-1 text-xs soft-text">{new Date(item.created_at).toLocaleString()}</p></div>)}
            </div>
          </Card>
        );
      case "Settings":
        return (
          <Card className="p-5">
            <h2 className="text-xl font-semibold">Settings</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs soft-text">Username</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">Email (read-only)</label>
                <Input value={email} disabled />
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">Current password</label>
                <div className="flex items-center gap-2">
                  <Input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type={showCurrentPassword ? "text" : "password"} placeholder="Enter current password" />
                  <Button type="button" variant="secondary" onClick={() => setShowCurrentPassword((v) => !v)}>{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                </div>
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={() => setChangePasswordOpen(true)}>Change password</Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button type="button" onClick={saveSettings}>Save profile</Button>
              {settingsMessage && <FeedbackMessage message={settingsMessage} isError={settingsError} />}
            </div>

            <Modal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Change password">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs soft-text">New password</label>
                  <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="At least 8 characters" />
                </div>
                <div>
                  <label className="mb-1 block text-xs soft-text">Confirm new password</label>
                  <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Re-enter new password" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
                  <Button type="button" onClick={changePassword}>Update password</Button>
                </div>
              </div>
            </Modal>
          </Card>
        );
    }
  }

  return (
    <main className="container-shell py-8">
      <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
        <aside className="surface-card premium-border rounded-3xl p-4">
          <h2 className="font-semibold tracking-[0.01em]">User center</h2>
          {role === "admin" && <p className="mt-1 text-xs font-medium text-emerald-400">Admin</p>}
          <ul className="mt-3 space-y-2 text-sm">
            {tabs.map((tab) => (
              <li key={tab}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`w-full rounded-lg border px-2 py-1.5 text-left transition ${activeTab === tab ? "border-[rgb(var(--accent)/0.55)] bg-[rgb(var(--accent)/0.15)] text-[rgb(var(--text))]" : "border-transparent soft-text hover:border-[rgb(var(--muted)/0.5)] hover:bg-[rgb(var(--bg-elev)/0.6)]"}`}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-4">{loading ? <Card className="p-10"><BrandLoader label="Loading dashboard data" /></Card> : renderTabContent()}</section>
      </div>
    </main>
  );
}
