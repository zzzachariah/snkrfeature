import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/route-auth";

const finalSchema = z.object({
  shoe_name: z.string().min(1),
  brand: z.string().min(1),
  model_line: z.string().optional(),
  version_name: z.string().optional(),
  release_year: z.coerce.number().optional(),
  category: z.string().optional(),
  player: z.string().optional(),
  forefoot_midsole_tech: z.string().optional(),
  heel_midsole_tech: z.string().optional(),
  outsole_tech: z.string().optional(),
  upper_tech: z.string().optional(),
  cushioning_feel: z.string().optional(),
  court_feel: z.string().optional(),
  bounce: z.string().optional(),
  stability: z.string().optional(),
  traction: z.string().optional(),
  fit: z.string().optional(),
  playstyle_summary: z.string().optional(),
  story_summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source_links: z.array(z.string()).optional(),
  raw_text: z.string().optional(),
  reviewer_notes: z.string().optional()
});

const bodySchema = z.object({
  action: z.enum(["save_draft", "approve_publish", "reject"]),
  finalPayload: finalSchema,
  note: z.string().optional()
});

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { id } = await params;
  const payload = bodySchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ ok: false, message: payload.error.issues[0]?.message }, { status: 400 });

  const { data: currentSubmission, error: submissionError } = await supabase.from("user_submissions").select("*").eq("id", id).maybeSingle();
  if (submissionError || !currentSubmission) return NextResponse.json({ ok: false, message: "Submission not found." }, { status: 404 });

  await supabase.from("submission_admin_versions").upsert({
    submission_id: id,
    final_payload: payload.data.finalPayload,
    last_edited_by: user.id,
    updated_at: new Date().toISOString()
  });

  if (payload.data.action === "save_draft") {
    await supabase.from("user_submissions").update({ status: "draft", reviewed_by: user.id, reviewer_notes: payload.data.note ?? null }).eq("id", id);
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: user.id,
      target_type: "submission",
      target_submission_id: id,
      action: "draft_saved",
      note: payload.data.note ?? "Draft saved",
      after_payload: payload.data.finalPayload
    });
    return NextResponse.json({ ok: true, message: "Draft saved." });
  }

  if (payload.data.action === "reject") {
    await supabase.from("user_submissions").update({ status: "rejected", reviewed_by: user.id, reviewer_notes: payload.data.note ?? null }).eq("id", id);
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: user.id,
      target_type: "submission",
      target_submission_id: id,
      action: "rejected",
      note: payload.data.note ?? "Submission rejected",
      after_payload: payload.data.finalPayload
    });
    return NextResponse.json({ ok: true, message: "Submission rejected." });
  }

  const final = payload.data.finalPayload;
  const baseSlug = slugify(`${final.brand}-${final.shoe_name}`);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const publishedShoeId = currentSubmission.published_shoe_id as string | null;

  if (!publishedShoeId) {
    const { data: insertedShoe, error: insertError } = await supabase
      .from("shoes")
      .insert({
        slug,
        brand: final.brand,
        shoe_name: final.shoe_name,
        model_line: final.model_line ?? null,
        version_name: final.version_name ?? null,
        release_year: final.release_year ?? null,
        category: final.category ?? null,
        player: final.player ?? null,
        created_by: user.id,
        is_published: true
      })
      .select("id")
      .single();

    if (insertError || !insertedShoe) return NextResponse.json({ ok: false, message: insertError?.message ?? "Could not publish shoe." }, { status: 400 });

    await supabase.from("shoe_specs").insert({
      shoe_id: insertedShoe.id,
      forefoot_midsole_tech: final.forefoot_midsole_tech ?? null,
      heel_midsole_tech: final.heel_midsole_tech ?? null,
      outsole_tech: final.outsole_tech ?? null,
      upper_tech: final.upper_tech ?? null,
      cushioning_feel: final.cushioning_feel ?? null,
      court_feel: final.court_feel ?? null,
      bounce: final.bounce ?? null,
      stability: final.stability ?? null,
      traction: final.traction ?? null,
      fit: final.fit ?? null,
      playstyle_summary: final.playstyle_summary ?? null,
      story_summary: final.story_summary ?? null,
      tags: final.tags ?? []
    });

    if (final.source_links && final.source_links.length > 0) {
      await supabase.from("sources").insert(
        final.source_links.map((url) => ({
          shoe_id: insertedShoe.id,
          source_type: "submission",
          source_label: "Admin approved submission source",
          source_url: url
        }))
      );
    }

    await supabase
      .from("user_submissions")
      .update({
        status: "published",
        reviewed_by: user.id,
        reviewer_notes: payload.data.note ?? null,
        published_shoe_id: insertedShoe.id,
        published_at: new Date().toISOString()
      })
      .eq("id", id);

    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: user.id,
      target_type: "submission",
      target_submission_id: id,
      target_shoe_id: insertedShoe.id,
      action: "approved_published",
      note: payload.data.note ?? "Submission approved and published",
      before_payload: currentSubmission.raw_payload,
      after_payload: final
    });

    return NextResponse.json({ ok: true, message: "Published to official shoes table.", shoeId: insertedShoe.id });
  }

  const { data: currentShoe } = await supabase.from("shoes").select("*").eq("id", publishedShoeId).maybeSingle();

  await supabase
    .from("shoes")
    .update({
      brand: final.brand,
      shoe_name: final.shoe_name,
      model_line: final.model_line ?? null,
      version_name: final.version_name ?? null,
      release_year: final.release_year ?? null,
      category: final.category ?? null,
      player: final.player ?? null,
      is_published: true,
      unpublished_at: null,
      unpublished_by: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", publishedShoeId);

  await supabase
    .from("shoe_specs")
    .update({
      forefoot_midsole_tech: final.forefoot_midsole_tech ?? null,
      heel_midsole_tech: final.heel_midsole_tech ?? null,
      outsole_tech: final.outsole_tech ?? null,
      upper_tech: final.upper_tech ?? null,
      cushioning_feel: final.cushioning_feel ?? null,
      court_feel: final.court_feel ?? null,
      bounce: final.bounce ?? null,
      stability: final.stability ?? null,
      traction: final.traction ?? null,
      fit: final.fit ?? null,
      playstyle_summary: final.playstyle_summary ?? null,
      story_summary: final.story_summary ?? null,
      tags: final.tags ?? [],
      updated_at: new Date().toISOString()
    })
    .eq("shoe_id", publishedShoeId);

  await supabase
    .from("user_submissions")
    .update({
      status: "published",
      reviewed_by: user.id,
      reviewer_notes: payload.data.note ?? null,
      published_at: new Date().toISOString()
    })
    .eq("id", id);

  await supabase.from("admin_audit_logs").insert({
    actor_admin_id: user.id,
    target_type: "shoe",
    target_submission_id: id,
    target_shoe_id: publishedShoeId,
    action: "updated",
    note: payload.data.note ?? "Published record updated",
    before_payload: currentShoe,
    after_payload: final
  });

  return NextResponse.json({ ok: true, message: "Published record updated.", shoeId: publishedShoeId });
}
