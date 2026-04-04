/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminPageContext } from "@/lib/admin/auth";
import { Card } from "@/components/ui/card";

export default async function AdminPage() {
  await requireAdminPageContext();
  const supabase = await createClient();
  if (!supabase) {
    return <Card className="p-5">Supabase is not configured.</Card>;
  }

  const [pending, recentSubmissions, recentPublished] = await Promise.all([
    supabase.from("user_submissions").select("id", { count: "exact", head: true }).in("status", ["pending", "normalized", "draft"]),
    supabase
      .from("user_submissions")
      .select("id, status, created_at, raw_payload, profiles!user_submissions_user_id_fkey(username)")
      .in("status", ["pending", "normalized", "draft"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("shoes").select("id, slug, shoe_name, brand, updated_at, is_published").order("updated_at", { ascending: false }).limit(8)
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-3">
        <Card className="p-4">
          <p className="text-xs soft-text">Pending queue</p>
          <p className="mt-1 text-2xl font-semibold">{pending.count ?? 0}</p>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/review" className="surface-card premium-border rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent)/0.4)]">
          <p className="text-xs uppercase tracking-[0.12em] soft-text">Primary workflow</p>
          <h2 className="mt-1 text-lg font-semibold">Review queue</h2>
          <p className="mt-1 text-sm soft-text">Open pending submissions, compare original vs normalized data, and publish corrected records.</p>
          <span className="mt-3 inline-flex rounded-lg bg-[rgb(var(--accent)/0.16)] px-3 py-1.5 text-sm text-[rgb(var(--text))]">Open review queue</span>
        </Link>
        <Link href="/admin/published" className="surface-card premium-border rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent)/0.4)]">
          <p className="text-xs uppercase tracking-[0.12em] soft-text">Live records</p>
          <h2 className="mt-1 text-lg font-semibold">Published record editor</h2>
          <p className="mt-1 text-sm soft-text">Edit or unpublish production sneaker records with audit logging.</p>
          <span className="mt-3 inline-flex rounded-lg bg-[rgb(var(--accent)/0.16)] px-3 py-1.5 text-sm text-[rgb(var(--text))]">Manage published records</span>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent submissions</h2>
            <Link href="/admin/review" className="text-xs text-[rgb(var(--accent))]">Open queue</Link>
          </div>
          <div className="space-y-2">
            {(recentSubmissions.data ?? []).map((row: any) => (
              <Link key={row.id} href={`/admin/review/${row.id}`} className="block rounded-lg border border-[rgb(var(--muted)/0.45)] px-3 py-2 hover:bg-[rgb(var(--muted)/0.22)]">
                <p className="text-sm font-medium">{row.raw_payload?.shoe_name ?? "Untitled submission"}</p>
                <p className="text-xs soft-text">by {Array.isArray(row.profiles) ? row.profiles[0]?.username : row.profiles?.username ?? "unknown"} • {row.status}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent published records</h2>
            <Link href="/admin/published" className="text-xs text-[rgb(var(--accent))]">Manage all</Link>
          </div>
          <div className="space-y-2">
            {(recentPublished.data ?? []).map((shoe: any) => (
              <Link key={shoe.id} href={`/admin/published/${shoe.id}`} className="block rounded-lg border border-[rgb(var(--muted)/0.45)] px-3 py-2 hover:bg-[rgb(var(--muted)/0.22)]">
                <p className="text-sm font-medium">{shoe.shoe_name}</p>
                <p className="text-xs soft-text">{shoe.brand} • {shoe.is_published ? "Published" : "Unpublished"}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
