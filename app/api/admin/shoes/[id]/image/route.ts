import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  action: z.enum(["generate", "approve", "reject"])
});

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function buildPublicUrl(baseUrl: string, bucket: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

async function getLatestByStatus(supabase: SupabaseClient, shoeId: string, status: "pending" | "approved") {
  const { data, error } = await supabase
    .from("shoe_images")
    .select("*")
    .eq("shoe_id", shoeId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const adminClient = createAdminClient();
  if (!adminClient) return badRequest("Supabase service role key is not configured.");

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload.");
  const { id: shoeId } = await params;

  if (parsed.data.action === "approve") {
    const pending = await getLatestByStatus(supabase, shoeId, "pending");
    if (!pending) return badRequest("No pending image to approve.");

    const nowIso = new Date().toISOString();
    const { error: demoteError } = await supabase
      .from("shoe_images")
      .update({ status: "rejected", rejected_at: nowIso, rejection_reason: "Superseded by newer approved image." })
      .eq("shoe_id", shoeId)
      .eq("status", "approved");
    if (demoteError) return badRequest(demoteError.message);

    const { error: approveError } = await supabase
      .from("shoe_images")
      .update({ status: "approved", approved_at: nowIso, rejected_at: null, rejection_reason: null })
      .eq("id", pending.id);
    if (approveError) return badRequest(approveError.message);

    return NextResponse.json({ ok: true, message: "Image approved" });
  }

  if (parsed.data.action === "reject") {
    const pending = await getLatestByStatus(supabase, shoeId, "pending");
    if (!pending) return badRequest("No pending image to reject.");
    const { error: rejectError } = await supabase
      .from("shoe_images")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: "Rejected by admin review." })
      .eq("id", pending.id);
    if (rejectError) return badRequest(rejectError.message);
    return NextResponse.json({ ok: true, message: "Image rejected" });
  }

  const { data: shoe, error: shoeError } = await supabase.from("shoes").select("id, brand, shoe_name").eq("id", shoeId).maybeSingle();
  if (shoeError || !shoe) return NextResponse.json({ ok: false, message: "Shoe not found." }, { status: 404 });

  const baseUrl = process.env.PACKYAPI_BASE_URL;
  const model = process.env.PACKYAPI_IMAGE_MODEL;
  const apiKey = process.env.PACKYAPI_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "shoe-images";
  if (!baseUrl || !model || !apiKey || !supabaseUrl) {
    return badRequest("Image generation environment variables are incomplete.");
  }

  const prompt = `Product shoe illustration for ${shoe.brand} ${shoe.shoe_name}, centered single sneaker, white background, clean black line art, minimal shading, no text, no watermark.`;

  const generationResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024"
    })
  });

  if (!generationResponse.ok) {
    const failText = await generationResponse.text();
    await supabase.from("shoe_images").insert({
      shoe_id: shoeId,
      storage_path: "",
      public_url: "",
      status: "rejected",
      provider: "PackyAPI",
      prompt,
      generation_error: `Provider error: ${failText.slice(0, 500)}`,
      rejected_at: new Date().toISOString(),
      rejection_reason: "Generation failed"
    });
    return badRequest("Image generation failed.");
  }

  const generationJson = await generationResponse.json();
  const imagePayload = generationJson?.data?.[0];
  const imageUrl = imagePayload?.url as string | undefined;
  const b64 = imagePayload?.b64_json as string | undefined;
  if (!imageUrl && !b64) return badRequest("Image generation failed.");

  const imageBytes = b64
    ? Buffer.from(b64, "base64")
    : Buffer.from(await (await fetch(imageUrl!)).arrayBuffer());

  const path = `shoes/${shoeId}/${Date.now()}-${randomUUID()}.png`;
  const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, imageBytes, {
    upsert: false,
    contentType: "image/png"
  });
  if (uploadError) return badRequest(uploadError.message);

  const { error: closePendingError } = await supabase
    .from("shoe_images")
    .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: "Superseded by regenerated candidate." })
    .eq("shoe_id", shoeId)
    .eq("status", "pending");
  if (closePendingError) return badRequest(closePendingError.message);

  const { error: insertError } = await supabase.from("shoe_images").insert({
    shoe_id: shoeId,
    storage_path: path,
    public_url: buildPublicUrl(supabaseUrl, bucket, path),
    status: "pending",
    provider: "PackyAPI",
    prompt,
    created_by: user.id
  });
  if (insertError) return badRequest(insertError.message);

  return NextResponse.json({ ok: true, message: "Image pending review" });
}
