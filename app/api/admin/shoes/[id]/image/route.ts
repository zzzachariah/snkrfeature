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

const MIN_IMAGE_BYTES = 14_000;

function buildShoeImagePrompt(brand: string, shoeName: string) {
  const modelLabel = `${brand} ${shoeName}`.trim();
  return `Create a clean, highly recognizable side-view minimalist line drawing of the basketball shoe "${modelLabel}".

Use a square 1:1 canvas.
The shoe must be shown in a strict lateral side profile only.
No perspective, no 3/4 view, no top view, no outsole bottom view, no tilt, no rotation.
The shoe must be horizontally aligned and centered.
The entire shoe must be fully visible.
The shoe should occupy approximately 80% to 85% of the canvas width, with clean and even margin around it.
No edge clipping. Do not render a tiny floating shoe.

Render the shoe as premium black line art on a pure white background.
No color, no shading, no realistic material rendering, no texture-heavy rendering, no painterly style, no cartoon style, no fashion sketch style.
No decorative background, no text, no labels, no human body parts.

The result must be simplified but faithful.
Do NOT create a generic basketball shoe.
Preserve the defining recognizable features of "${modelLabel}", including overall silhouette, toe box shape, forefoot curvature, heel geometry, collar height and cut, tongue profile, lace panel structure, midsole sculpting, outsole edge shape, sidewall geometry, panel segmentation, and visible support structures.
Preserve any signature model-specific structural cues.

Recognition is more important than stylistic minimalism.
If simplification conflicts with recognizability, preserve recognizability.

Final output target: premium technical sneaker silhouette illustration for a basketball shoe database UI — clean, model-specific, stable, centered, monochrome, and instantly recognizable.`;
}

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

function getProviderConfig(baseUrl: string, model: string, prompt: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const isGeminiFlashImage = model.includes("gemini-2.5-flash-image");
  const providerEndpoint = isGeminiFlashImage
    ? `${normalizedBaseUrl}/v1beta/models/${model}:generateContent`
    : `${normalizedBaseUrl}/v1/images/generations`;
  const providerBody = isGeminiFlashImage
    ? {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      }
    : {
        model,
        prompt,
        size: "1024x1024"
      };
  return { providerEndpoint, providerBody, providerShape: isGeminiFlashImage ? "gemini_generateContent" : "openai_images_generations" };
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

  const prompt = buildShoeImagePrompt(shoe.brand, shoe.shoe_name);
  console.info(`[admin] /image requestId=${requestId} step=prompt_built`, { prompt, model, bucket });

  let imageBytes: Buffer | null = null;
  let imageMimeType = "image/png";
  let providerBodyText = "";
  let generationFailureDetail = "";
  const attemptErrors: string[] = [];
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const retryPrompt =
      attempt === 1
        ? prompt
        : `${prompt}\n\nRetry pass ${attempt}: enforce composition harder. Strictly center one shoe in exact side profile, horizontal alignment, no tilt, subject width target 80%-85%.`;
    const { providerEndpoint, providerBody, providerShape } = getProviderConfig(baseUrl, model, retryPrompt);

    console.info(`[admin] /image requestId=${requestId} step=provider_request start`, {
      attempt,
      providerEndpoint,
      providerShape
    });
    const generationResponse = await fetch(providerEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(providerBody)
    });

    console.info(`[admin] /image requestId=${requestId} step=provider_response`, {
      attempt,
      status: generationResponse.status
    });
    providerBodyText = await generationResponse.text();
    console.info(`[admin] /image requestId=${requestId} step=provider_body`, {
      attempt,
      raw: providerBodyText
    });

    if (!generationResponse.ok) {
      generationFailureDetail = providerBodyText.slice(0, 2000);
      attemptErrors.push(`attempt=${attempt} provider_status=${generationResponse.status}`);
      continue;
    }

    let generationJson: unknown;
    try {
      generationJson = JSON.parse(providerBodyText);
    } catch (error) {
      generationFailureDetail = error instanceof Error ? error.message : "JSON parse failed";
      attemptErrors.push(`attempt=${attempt} provider_non_json`);
      continue;
    }

    const parsedJson = generationJson as {
      data?: Array<{ url?: string; b64_json?: string }>;
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { data?: string; mimeType?: string };
          }>;
        };
      }>;
    };
    const imagePayload = parsedJson?.data?.[0];
    const imageUrl = imagePayload?.url;
    const openAiB64 = imagePayload?.b64_json;
    const geminiInlineData = parsedJson?.candidates?.[0]?.content?.parts?.find((part) => Boolean(part.inlineData?.data))?.inlineData;
    const b64 = openAiB64 ?? geminiInlineData?.data;
    imageMimeType = geminiInlineData?.mimeType ?? "image/png";
    console.info(`[admin] /image requestId=${requestId} step=provider_parse`, {
      attempt,
      hasDataArray: Array.isArray(parsedJson?.data),
      hasGeminiCandidates: Array.isArray(parsedJson?.candidates),
      hasImageUrl: Boolean(imageUrl),
      hasB64: Boolean(b64),
      imageMimeType
    });

    if (!imageUrl && !b64) {
      generationFailureDetail = providerBodyText.slice(0, 2000);
      attemptErrors.push(`attempt=${attempt} provider_no_image_data`);
      continue;
    }

    if (b64) {
      imageBytes = Buffer.from(b64, "base64");
    } else {
      console.info(`[admin] /image requestId=${requestId} step=provider_image_fetch start`, { attempt, imageUrl });
      const remoteImageResponse = await fetch(imageUrl!);
      if (!remoteImageResponse.ok) {
        generationFailureDetail = `remote_status=${remoteImageResponse.status}`;
        attemptErrors.push(`attempt=${attempt} provider_image_url_fetch_failed`);
        continue;
      }
      imageBytes = Buffer.from(await remoteImageResponse.arrayBuffer());
    }

    if (!imageBytes.length) {
      generationFailureDetail = "empty image payload";
      attemptErrors.push(`attempt=${attempt} image_empty_payload`);
      continue;
    }

    if (imageBytes.length < MIN_IMAGE_BYTES) {
      generationFailureDetail = `image payload too small (${imageBytes.length} bytes)`;
      attemptErrors.push(`attempt=${attempt} image_too_small`);
      imageBytes = null;
      continue;
    }

    console.info(`[admin] /image requestId=${requestId} step=provider_quality_check pass`, {
      attempt,
      bytes: imageBytes.length
    });
    break;
  }

  if (!imageBytes) {
    await supabase.from("shoe_images").insert({
      shoe_id: shoeId,
      storage_path: "",
      public_url: "",
      status: "rejected",
      provider: "PackyAPI",
      prompt,
      provider_model: model,
      generation_error: `Provider error: ${(generationFailureDetail || providerBodyText).slice(0, 500)} | attempts=${attemptErrors.join(",")}`,
      rejected_at: new Date().toISOString(),
      rejection_reason: "Generation failed"
    });
    return fail({
      status: 502,
      error: "Provider generation failed after retries.",
      step: "provider_request",
      detail: `${generationFailureDetail || providerBodyText.slice(0, 2000)} | attempts=${attemptErrors.join(",")}`,
      requestId
    });
  }

  const path = `shoes/${shoeId}/${Date.now()}-${randomUUID()}.png`;
  const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, imageBytes, {
    upsert: false,
    contentType: imageMimeType
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
    provider_model: model,
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
