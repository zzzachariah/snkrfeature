import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/route-auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase } = auth;
  const { id } = await params;

  const submissionRes = await supabase
    .from("user_submissions")
    .select("*, profiles!user_submissions_user_id_fkey(username,email)")
    .eq("id", id)
    .maybeSingle();

  if (submissionRes.error) return NextResponse.json({ ok: false, message: submissionRes.error.message }, { status: 400 });
  if (!submissionRes.data) return NextResponse.json({ ok: false, message: "Submission not found." }, { status: 404 });

  const submission = submissionRes.data;

  const [normalizedRes, draftRes, historyRes, publishedShoeRes] = await Promise.all([
    supabase.from("normalized_submission_results").select("*").eq("submission_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("submission_admin_versions").select("*").eq("submission_id", id).maybeSingle(),
    supabase
      .from("admin_audit_logs")
      .select("id, action, note, created_at, actor_admin_id, profiles!admin_audit_logs_actor_admin_id_fkey(username)")
      .eq("target_submission_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    submission.published_shoe_id
      ? supabase.from("shoes").select("id,slug,shoe_name,brand,is_published").eq("id", submission.published_shoe_id).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  return NextResponse.json({
    ok: true,
    submission: {
      ...submission,
      shoes: publishedShoeRes.error ? null : publishedShoeRes.data
    },
    normalized: normalizedRes.error ? null : normalizedRes.data,
    draft: draftRes.error ? null : draftRes.data,
    history: historyRes.error ? [] : historyRes.data ?? []
  });
}
