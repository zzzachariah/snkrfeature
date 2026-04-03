import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/route-auth";

const schema = z.object({
  action: z.enum(["update", "unpublish", "publish"]),
  note: z.string().optional(),
  shoe: z
    .object({
      brand: z.string(),
      shoe_name: z.string(),
      model_line: z.string().nullable().optional(),
      version_name: z.string().nullable().optional(),
      release_year: z.coerce.number().nullable().optional(),
      category: z.string().nullable().optional(),
      player: z.string().nullable().optional()
    })
    .optional(),
  spec: z
    .object({
      forefoot_midsole_tech: z.string().nullable().optional(),
      heel_midsole_tech: z.string().nullable().optional(),
      outsole_tech: z.string().nullable().optional(),
      upper_tech: z.string().nullable().optional(),
      cushioning_feel: z.string().nullable().optional(),
      court_feel: z.string().nullable().optional(),
      bounce: z.string().nullable().optional(),
      stability: z.string().nullable().optional(),
      traction: z.string().nullable().optional(),
      fit: z.string().nullable().optional(),
      playstyle_summary: z.string().nullable().optional(),
      story_summary: z.string().nullable().optional(),
      tags: z.array(z.string()).optional()
    })
    .optional()
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message }, { status: 400 });

  const { data: currentShoe } = await supabase.from("shoes").select("*").eq("id", id).maybeSingle();
  if (!currentShoe) return NextResponse.json({ ok: false, message: "Shoe not found." }, { status: 404 });

  if (parsed.data.action === "unpublish") {
    await supabase.from("shoes").update({ is_published: false, unpublished_at: new Date().toISOString(), unpublished_by: user.id }).eq("id", id);
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: user.id,
      target_type: "shoe",
      target_shoe_id: id,
      action: "unpublished",
      note: parsed.data.note ?? "Record unpublished",
      before_payload: currentShoe
    });
    await supabase.from("user_submissions").update({ status: "unpublished" }).eq("published_shoe_id", id);
    return NextResponse.json({ ok: true, message: "Record unpublished." });
  }

  if (parsed.data.action === "publish") {
    await supabase.from("shoes").update({ is_published: true, unpublished_at: null, unpublished_by: null }).eq("id", id);
    await supabase.from("admin_audit_logs").insert({
      actor_admin_id: user.id,
      target_type: "shoe",
      target_shoe_id: id,
      action: "published",
      note: parsed.data.note ?? "Record republished",
      before_payload: currentShoe
    });
    await supabase.from("user_submissions").update({ status: "published" }).eq("published_shoe_id", id);
    return NextResponse.json({ ok: true, message: "Record published." });
  }

  if (!parsed.data.shoe) {
    return NextResponse.json({ ok: false, message: "shoe payload is required for update." }, { status: 400 });
  }

  await supabase.from("shoes").update({ ...parsed.data.shoe, updated_at: new Date().toISOString() }).eq("id", id);

  if (parsed.data.spec) {
    await supabase.from("shoe_specs").update({ ...parsed.data.spec, updated_at: new Date().toISOString() }).eq("shoe_id", id);
  }

  await supabase.from("admin_audit_logs").insert({
    actor_admin_id: user.id,
    target_type: "shoe",
    target_shoe_id: id,
    action: "updated",
    note: parsed.data.note ?? "Published record updated",
    before_payload: currentShoe,
    after_payload: { ...parsed.data.shoe, spec: parsed.data.spec ?? null }
  });

  return NextResponse.json({ ok: true, message: "Record updated." });
}
