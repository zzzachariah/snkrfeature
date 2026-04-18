import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  action: z.enum(["generate", "approve", "reject"])
});

type ErrorStep =
  | "request_parse"
  | "auth"
  | "shoe_load"
  | "env"
  | "provider_request"
  | "provider_parse"
  | "provider_image_fetch"
  | "storage_upload"
  | "db_update"
  | "db_insert";

function fail({
  status,
  error,
  step,
  detail,
  requestId
}: {
  status: number;
  error: string;
  step: ErrorStep;
  detail?: string;
  requestId: string;
}) {
  console.error(`[admin] /image requestId=${requestId} step=${step} fail status=${status}`, {
    error,
    detail
  });
  return NextResponse.json({ ok: false, error, step, detail }, { status });
}

function success(payload: Record<string, unknown>, requestId: string) {
  console.info(`[admin] /image requestId=${requestId} step=final_return success status=200`, payload);
  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
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
  const requestId = randomUUID();
  console.info(`[admin] /image requestId=${requestId} step=request_received`);

  const auth = await requireAdminApi();
  if ("error" in auth) {
    console.error(`[admin] /image requestId=${requestId} step=auth fail status=401_or_403`);
    return auth.error;
  }
  const { supabase, user } = auth;
  const adminClient = createAdminClient();
  if (!adminClient) {
    return fail({
      status: 500,
      error: "Supabase service role key is not configured.",
      step: "env",
      requestId
    });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return fail({
      status: 400,
      error: "Invalid payload.",
      step: "request_parse",
      detail: parsed.error.issues[0]?.message,
      requestId
    });
  }
  const { id: shoeId } = await params;

  if (parsed.data.action === "approve") {
    const pending = await getLatestByStatus(supabase, shoeId, "pending");
    if (!pending) {
      return fail({
        status: 400,
        error: "No pending image to approve.",
        step: "db_update",
        requestId
      });
    }

    const nowIso = new Date().toISOString();
    const { error: demoteError } = await supabase
      .from("shoe_images")
      .update({ status: "rejected", rejected_at: nowIso, rejection_reason: "Superseded by newer approved image." })
      .eq("shoe_id", shoeId)
      .eq("status", "approved");
    if (demoteError) {
      return fail({
        status: 500,
        error: "Failed to demote previous approved image.",
        step: "db_update",
        detail: demoteError.message,
        requestId
      });
    }

    const { error: approveError } = await supabase
      .from("shoe_images")
      .update({ status: "approved", approved_at: nowIso, rejected_at: null, rejection_reason: null })
      .eq("id", pending.id);
    if (approveError) {
      return fail({
        status: 500,
        error: "Failed to approve pending image.",
        step: "db_update",
        detail: approveError.message,
        requestId
      });
    }

    return success({ message: "Image approved" }, requestId);
  }

  if (parsed.data.action === "reject") {
    const pending = await getLatestByStatus(supabase, shoeId, "pending");
    if (!pending) {
      return fail({
        status: 400,
        error: "No pending image to reject.",
        step: "db_update",
        requestId
      });
    }
    const { error: rejectError } = await supabase
      .from("shoe_images")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: "Rejected by admin review." })
      .eq("id", pending.id);
    if (rejectError) {
      return fail({
        status: 500,
        error: "Failed to reject pending image.",
        step: "db_update",
        detail: rejectError.message,
        requestId
      });
    }
    return success({ message: "Image rejected" }, requestId);
  }

  console.info(`[admin] /image requestId=${requestId} step=shoe_load start shoeId=${shoeId}`);
  const { data: shoe, error: shoeError } = await supabase.from("shoes").select("id, brand, shoe_name").eq("id", shoeId).maybeSingle();
  if (shoeError || !shoe) {
    return fail({
      status: 404,
      error: "Shoe not found.",
      step: "shoe_load",
      detail: shoeError?.message,
      requestId
    });
  }
  console.info(`[admin] /image requestId=${requestId} step=shoe_load success`, shoe);

  const baseUrl = process.env.PACKYAPI_BASE_URL;
  const model = process.env.PACKYAPI_IMAGE_MODEL;
  const apiKey = process.env.PACKYAPI_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "shoe-images";
  if (!baseUrl || !model || !apiKey || !supabaseUrl) {
    return fail({
      status: 500,
      error: "Image generation environment variables are incomplete.",
      step: "env",
      detail: `baseUrl=${Boolean(baseUrl)} model=${Boolean(model)} apiKey=${Boolean(apiKey)} supabaseUrl=${Boolean(supabaseUrl)}`,
      requestId
    });
  }

  const prompt = `Product shoe illustration for ${shoe.brand} ${shoe.shoe_name}, centered single sneaker, white background, clean black line art, minimal shading, no text, no watermark.`;
  console.info(`[admin] /image requestId=${requestId} step=prompt_built`, { prompt, model, bucket });

  console.info(`[admin] /image requestId=${requestId} step=provider_request start url=${baseUrl.replace(/\/$/, "")}/v1/images/generations`);
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
  console.info(`[admin] /image requestId=${requestId} step=provider_response status=${generationResponse.status}`);
  const providerBodyText = await generationResponse.text();
  console.info(`[admin] /image requestId=${requestId} step=provider_body raw=${providerBodyText}`);

  if (!generationResponse.ok) {
    await supabase.from("shoe_images").insert({
      shoe_id: shoeId,
      storage_path: "",
      public_url: "",
      status: "rejected",
      provider: "PackyAPI",
      prompt,
      generation_error: `Provider error: ${providerBodyText.slice(0, 500)}`,
      rejected_at: new Date().toISOString(),
      rejection_reason: "Generation failed"
    });
    return fail({
      status: 502,
      error: "Provider request failed.",
      step: "provider_request",
      detail: providerBodyText.slice(0, 2000),
      requestId
    });
  }

  let generationJson: unknown;
  try {
    generationJson = JSON.parse(providerBodyText);
  } catch (error) {
    return fail({
      status: 502,
      error: "Provider returned non-JSON response.",
      step: "provider_parse",
      detail: error instanceof Error ? error.message : "JSON parse failed",
      requestId
    });
  }

  const parsedJson = generationJson as { data?: Array<{ url?: string; b64_json?: string }> };
  const imagePayload = parsedJson?.data?.[0];
  const imageUrl = imagePayload?.url;
  const b64 = imagePayload?.b64_json;
  console.info(`[admin] /image requestId=${requestId} step=provider_parse parsed`, {
    hasDataArray: Array.isArray(parsedJson?.data),
    hasImageUrl: Boolean(imageUrl),
    hasB64: Boolean(b64)
  });
  if (!imageUrl && !b64) {
    return fail({
      status: 502,
      error: "Provider returned no image data.",
      step: "provider_parse",
      detail: providerBodyText.slice(0, 2000),
      requestId
    });
  }

  let imageBytes: Buffer;
  if (b64) {
    imageBytes = Buffer.from(b64, "base64");
  } else {
    console.info(`[admin] /image requestId=${requestId} step=provider_image_fetch start imageUrl=${imageUrl}`);
    const remoteImageResponse = await fetch(imageUrl!);
    if (!remoteImageResponse.ok) {
      return fail({
        status: 502,
        error: "Provider image URL download failed.",
        step: "provider_image_fetch",
        detail: `status=${remoteImageResponse.status}`,
        requestId
      });
    }
    imageBytes = Buffer.from(await remoteImageResponse.arrayBuffer());
  }
  if (!imageBytes.length) {
    return fail({
      status: 502,
      error: "Provider image payload was empty.",
      step: "provider_parse",
      requestId
    });
  }

  const path = `shoes/${shoeId}/${Date.now()}-${randomUUID()}.png`;
  const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, imageBytes, {
    upsert: false,
    contentType: "image/png"
  });
  if (uploadError) {
    return fail({
      status: 500,
      error: "Storage upload failed.",
      step: "storage_upload",
      detail: uploadError.message,
      requestId
    });
  }
  console.info(`[admin] /image requestId=${requestId} step=storage_upload success`, { bucket, path });

  const { error: closePendingError } = await supabase
    .from("shoe_images")
    .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: "Superseded by regenerated candidate." })
    .eq("shoe_id", shoeId)
    .eq("status", "pending");
  if (closePendingError) {
    return fail({
      status: 500,
      error: "Failed to supersede previous pending image.",
      step: "db_update",
      detail: closePendingError.message,
      requestId
    });
  }
  console.info(`[admin] /image requestId=${requestId} step=db_update success previous_pending_closed`);

  const publicUrl = buildPublicUrl(supabaseUrl, bucket, path);
  if (!path || !publicUrl) {
    return fail({
      status: 500,
      error: "Invalid storage output path/url.",
      step: "storage_upload",
      detail: `path=${path} publicUrl=${publicUrl}`,
      requestId
    });
  }

  const { error: insertError } = await supabase.from("shoe_images").insert({
    shoe_id: shoeId,
    storage_path: path,
    public_url: publicUrl,
    status: "pending",
    provider: "PackyAPI",
    prompt,
    created_by: user.id
  });
  if (insertError) {
    return fail({
      status: 500,
      error: "Image metadata insert failed.",
      step: "db_insert",
      detail: insertError.message,
      requestId
    });
  }
  console.info(`[admin] /image requestId=${requestId} step=db_insert success`, { shoeId, path, publicUrl });

  return success({ message: "Image pending review", storage_path: path, public_url: publicUrl }, requestId);
}
