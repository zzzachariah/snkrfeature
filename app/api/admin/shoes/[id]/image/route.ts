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
  | "search_request"
  | "search_parse"
  | "search_reference_fetch"
  | "provider_request"
  | "provider_parse"
  | "provider_image_fetch"
  | "storage_upload"
  | "db_update"
  | "db_insert";

const MIN_IMAGE_BYTES = 14_000;

const SHOE_PROMPT_BASE_TEMPLATE = `Create a clean, highly recognizable side-view minimalist line drawing of the basketball shoe "[SHOE NAME]".

Use the provided reference image as the primary shape reference.
Preserve the defining recognizable silhouette and model-specific structure of the exact shoe shown in the reference.

The final output must be a square 1:1 image.
Show exactly one shoe.
The shoe must be in a strict lateral side view only.
No three-quarter view.
No perspective angle.
No rotation.
No tilt.
The shoe must be horizontally aligned.
The heel must be on the left.
The toe/front must point to the right.
Do not mirror or flip the shoe direction.

The entire shoe must be fully visible in frame.
Center the shoe carefully.
The shoe should occupy approximately 80% to 85% of the canvas width.
Keep clean, even margin around the shoe.
Do not make the shoe tiny in the frame.
Do not crop the shoe.

Render the shoe as premium black line art on a pure white background.
No color.
No shading.
No realistic material rendering.
No textured painterly style.
No decorative background.
No text.
No labels.
No arrows.
No human body parts.
No foot.
No leg.

The result must be simplified but faithful.
Do NOT turn it into a generic basketball shoe.
Preserve the defining shape identity of the exact model.
If simplification conflicts with recognizability, preserve recognizability.

Focus on preserving:
* overall silhouette
* toe shape
* forefoot curvature
* heel geometry
* collar cut and height
* tongue profile
* lace area structure
* midsole sculpting
* outsole edge profile
* upper panel segmentation
* sidewall geometry
* any external support shapes
* any visible model-specific structures from the reference

Final style:
premium monochrome technical silhouette illustration for a sneaker database UI.`;

type SelectedReference = {
  imageUrl: string;
  summaryBullets: string[];
  sourceType?: string;
};

type PackySearchConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  baseUrlSource: "PACKYAPI_SEARCH_BASE_URL";
  modelSource: "PACKYAPI_SEARCH_MODEL";
  keySource: "PACKYAPI_SEARCH_KEY";
  fallbackUsed: false;
};

type PackyImageConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  baseUrlSource: "PACKYAPI_IMAGE_BASE_URL";
  modelSource: "PACKYAPI_IMAGE_MODEL";
  keySource: "PACKYAPI_IMAGE_KEY";
  fallbackUsed: false;
};

function buildShoeImagePrompt(brand: string, shoeName: string, summaryBullets: string[]) {
  const modelLabel = `${brand} ${shoeName}`.trim();
  const basePrompt = SHOE_PROMPT_BASE_TEMPLATE.replace("[SHOE NAME]", modelLabel);
  const summarySection =
    summaryBullets.length > 0
      ? `\n\nReference summary:\n${summaryBullets.map((bullet) => `* ${bullet}`).join("\n")}`
      : "\n\nReference summary:\n* No reliable reference summary was available. Keep strict model recognizability using the provided shoe name.";
  return `${basePrompt}${summarySection}`;
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

function getPackySearchConfig(): PackySearchConfig | null {
  const baseUrl = process.env.PACKYAPI_SEARCH_BASE_URL;
  const model = process.env.PACKYAPI_SEARCH_MODEL;
  const apiKey = process.env.PACKYAPI_SEARCH_KEY;
  if (!baseUrl || !model || !apiKey) return null;
  return {
    baseUrl,
    model,
    apiKey,
    baseUrlSource: "PACKYAPI_SEARCH_BASE_URL",
    modelSource: "PACKYAPI_SEARCH_MODEL",
    keySource: "PACKYAPI_SEARCH_KEY",
    fallbackUsed: false
  };
}

function getPackyImageConfig(): PackyImageConfig | null {
  const baseUrl = process.env.PACKYAPI_IMAGE_BASE_URL;
  const model = process.env.PACKYAPI_IMAGE_MODEL;
  const apiKey = process.env.PACKYAPI_IMAGE_KEY;
  if (!baseUrl || !model || !apiKey) return null;
  return {
    baseUrl,
    model,
    apiKey,
    baseUrlSource: "PACKYAPI_IMAGE_BASE_URL",
    modelSource: "PACKYAPI_IMAGE_MODEL",
    keySource: "PACKYAPI_IMAGE_KEY",
    fallbackUsed: false
  };
}

function buildPackyImageRequest(config: PackyImageConfig, prompt: string, referenceInlineData?: { mimeType: string; data: string }) {
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/v1beta/models/${config.model}:generateContent`;
  return {
    endpoint,
    body: {
      contents: [
        {
          role: "user",
          parts: referenceInlineData ? [{ text: prompt }, { inlineData: referenceInlineData }] : [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    }
  };
}

async function searchReferenceImage({
  config,
  shoeLabel,
  requestId
}: {
  config: PackySearchConfig;
  shoeLabel: string;
  requestId: string;
}): Promise<SelectedReference | null> {
  const endpoint = `${config.baseUrl.replace(/\/$/, "")}/v1beta/models/${config.model}:generateContent`;
  const searchPrompt = `You are selecting exactly ONE public reference image for generating a technical side-view shoe illustration.

Target shoe model: "${shoeLabel}".
Find one best image for the exact model (not broad family).

Selection priority:
1) official product image
2) retailer product image
3) clean review/media image

Prefer: clean side or near-side view, full shoe visible, clear shape.
Avoid if possible: on-foot shots, heavy perspective, cluttered background, tiny thumbnails, stylized poster edits, partial crops.

Return JSON only with this exact schema:
{
  "image_url": "https://...",
  "source_type": "official|retailer|review_media|unknown",
  "reference_summary": ["short structural cue", "short structural cue", "short structural cue"],
  "selection_reason": "short reason"
}

If no acceptable image is found, return:
{
  "image_url": "",
  "source_type": "unknown",
  "reference_summary": [],
  "selection_reason": "NO_ACCEPTABLE_REFERENCE"
}`;

  console.info(`[admin] /image requestId=${requestId} step=search_request config`, {
    searchBaseUrlSource: config.baseUrlSource,
    searchModelSource: config.modelSource,
    searchKeySource: config.keySource,
    searchFallbackUsed: config.fallbackUsed,
    endpoint,
    model: config.model,
    shoeLabel
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      "x-goog-api-key": config.apiKey
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });
  const bodyText = await response.text();
  console.info(`[admin] /image requestId=${requestId} step=search_request response`, {
    status: response.status,
    raw: bodyText
  });
  if (!response.ok) throw new Error(`search_provider_status=${response.status} body=${bodyText.slice(0, 500)}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch (error) {
    throw new Error(`search_response_non_json ${(error as Error).message}`);
  }
  const textPart =
    (parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content?.parts?.find((part) =>
      Boolean(part.text)
    )?.text ?? "";
  if (!textPart) throw new Error("search_response_missing_text");

  let selected: unknown;
  try {
    selected = JSON.parse(textPart);
  } catch {
    throw new Error(`search_text_non_json text=${textPart.slice(0, 500)}`);
  }

  const record = selected as {
    image_url?: string;
    reference_summary?: string[];
    source_type?: string;
  };
  const imageUrl = typeof record.image_url === "string" ? record.image_url.trim() : "";
  const summaryBullets = Array.isArray(record.reference_summary)
    ? record.reference_summary.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 6)
    : [];
  if (!imageUrl) return null;
  return { imageUrl, summaryBullets, sourceType: record.source_type };
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

  const searchConfig = getPackySearchConfig();
  const imageConfig = getPackyImageConfig();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "shoe-images";
  if (!searchConfig || !imageConfig || !supabaseUrl) {
    return fail({
      status: 500,
      error: "Image generation environment variables are incomplete.",
      step: "env",
      detail: `PACKYAPI_SEARCH_BASE_URL=${Boolean(process.env.PACKYAPI_SEARCH_BASE_URL)} PACKYAPI_SEARCH_MODEL=${Boolean(process.env.PACKYAPI_SEARCH_MODEL)} PACKYAPI_SEARCH_KEY=${Boolean(process.env.PACKYAPI_SEARCH_KEY)} PACKYAPI_IMAGE_BASE_URL=${Boolean(process.env.PACKYAPI_IMAGE_BASE_URL)} PACKYAPI_IMAGE_MODEL=${Boolean(process.env.PACKYAPI_IMAGE_MODEL)} PACKYAPI_IMAGE_KEY=${Boolean(process.env.PACKYAPI_IMAGE_KEY)} supabaseUrl=${Boolean(supabaseUrl)}`,
      requestId
    });
  }

  const shoeLabel = `${shoe.brand} ${shoe.shoe_name}`.trim();
  let selectedReference: SelectedReference | null = null;
  try {
    selectedReference = await searchReferenceImage({
      config: searchConfig,
      shoeLabel,
      requestId
    });
  } catch (error) {
    console.error(`[admin] /image requestId=${requestId} step=search_request fail`, error);
  }

  let referenceInlineData: { mimeType: string; data: string } | undefined;
  if (selectedReference?.imageUrl) {
    const refImageResponse = await fetch(selectedReference.imageUrl);
    if (refImageResponse.ok) {
      const refArrayBuffer = await refImageResponse.arrayBuffer();
      const refBytes = Buffer.from(refArrayBuffer);
      if (refBytes.length > 0) {
        referenceInlineData = {
          mimeType: refImageResponse.headers.get("content-type") ?? "image/jpeg",
          data: refBytes.toString("base64")
        };
      }
    } else {
      console.warn(`[admin] /image requestId=${requestId} step=search_reference_fetch fail`, {
        status: refImageResponse.status,
        referenceUrl: selectedReference.imageUrl
      });
    }
  }

  const referenceSummary =
    selectedReference?.summaryBullets.length ? selectedReference.summaryBullets : ["No acceptable reference image was available from search."];
  const prompt = buildShoeImagePrompt(shoe.brand, shoe.shoe_name, referenceSummary);
  console.info(`[admin] /image requestId=${requestId} step=prompt_built`, {
    prompt,
    imageModel: imageConfig.model,
    bucket,
    searchUsed: Boolean(referenceInlineData),
    referenceImageUrl: selectedReference?.imageUrl ?? null
  });

  let imageBytes: Buffer | null = null;
  let imageMimeType = "image/png";
  let providerBodyText = "";
  let generationFailureDetail = "";
  const { endpoint: providerEndpoint, body: providerBody } = buildPackyImageRequest(imageConfig, prompt, referenceInlineData);

  console.info(`[admin] /image requestId=${requestId} step=provider_request config`, {
    imageBaseUrlSource: imageConfig.baseUrlSource,
    imageModelSource: imageConfig.modelSource,
    imageKeySource: imageConfig.keySource,
    imageFallbackUsed: imageConfig.fallbackUsed,
    providerEndpoint,
    providerShape: "gemini_generateContent",
    searchUsed: Boolean(referenceInlineData)
  });
  const generationResponse = await fetch(providerEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${imageConfig.apiKey}`,
      "x-goog-api-key": imageConfig.apiKey
    },
    body: JSON.stringify(providerBody)
  });

  console.info(`[admin] /image requestId=${requestId} step=provider_response`, {
    status: generationResponse.status
  });
  providerBodyText = await generationResponse.text();
  console.info(`[admin] /image requestId=${requestId} step=provider_body`, {
    raw: providerBodyText
  });

  if (!generationResponse.ok) {
    generationFailureDetail = providerBodyText.slice(0, 2000);
  } else {
    let generationJson: unknown;
    try {
      generationJson = JSON.parse(providerBodyText);
    } catch (error) {
      generationFailureDetail = error instanceof Error ? error.message : "JSON parse failed";
    }

    if (generationJson) {
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
        hasDataArray: Array.isArray(parsedJson?.data),
        hasGeminiCandidates: Array.isArray(parsedJson?.candidates),
        hasImageUrl: Boolean(imageUrl),
        hasB64: Boolean(b64),
        imageMimeType
      });

      if (!imageUrl && !b64) {
        generationFailureDetail = providerBodyText.slice(0, 2000);
      } else if (b64) {
        imageBytes = Buffer.from(b64, "base64");
      } else if (imageUrl) {
        console.info(`[admin] /image requestId=${requestId} step=provider_image_fetch start`, { imageUrl });
        const remoteImageResponse = await fetch(imageUrl);
        if (!remoteImageResponse.ok) {
          generationFailureDetail = `remote_status=${remoteImageResponse.status}`;
        } else {
          imageBytes = Buffer.from(await remoteImageResponse.arrayBuffer());
        }
      }

      if (imageBytes && !imageBytes.length) {
        generationFailureDetail = "empty image payload";
        imageBytes = null;
      }
      if (imageBytes && imageBytes.length < MIN_IMAGE_BYTES) {
        generationFailureDetail = `image payload too small (${imageBytes.length} bytes)`;
        imageBytes = null;
      }
      if (imageBytes) {
        console.info(`[admin] /image requestId=${requestId} step=provider_quality_check pass`, {
          bytes: imageBytes.length
        });
      }
    }
  }

  if (!imageBytes) {
    await supabase.from("shoe_images").insert({
      shoe_id: shoeId,
      storage_path: "",
      public_url: "",
      status: "rejected",
      provider: "PackyAPI",
      prompt,
      provider_model: imageConfig.model,
      search_provider: "PackyAPI",
      search_model: searchConfig.model,
      search_used: Boolean(referenceInlineData),
      reference_summary: referenceSummary.join("; "),
      reference_image_url: selectedReference?.imageUrl ?? null,
      generation_error: `Provider error: ${(generationFailureDetail || providerBodyText).slice(0, 500)} | fallback=prompt_only_${referenceInlineData ? "no" : "yes"}`,
      rejected_at: new Date().toISOString(),
      rejection_reason: "Generation failed"
    });
    return fail({
      status: 502,
      error: "Provider generation failed.",
      step: "provider_request",
      detail: `${generationFailureDetail || providerBodyText.slice(0, 2000)} | fallback=prompt_only_${referenceInlineData ? "no" : "yes"}`,
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
    provider_model: imageConfig.model,
    search_provider: "PackyAPI",
    search_model: searchConfig.model,
    search_used: Boolean(referenceInlineData),
    reference_summary: referenceSummary.join("; "),
    reference_image_url: selectedReference?.imageUrl ?? null,
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
