import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  action: z.enum(["find", "approve", "reject"])
});

type ErrorStep =
  | "request_parse"
  | "auth"
  | "shoe_load"
  | "env"
  | "search_request"
  | "search_parse"
  | "candidate_selection"
  | "image_download"
  | "storage_upload"
  | "db_update"
  | "db_insert";

type SourceType = "official" | "retailer" | "review_media" | "unknown";

type SerpApiConfig = {
  provider: string;
  apiKey: string;
  engine: string;
  baseUrl: string;
};

type SerpApiImageResult = {
  original?: string;
  thumbnail?: string;
  title?: string;
  source?: string;
  link?: string;
  original_width?: number;
  original_height?: number;
  position?: number;
};

type ScoredCandidate = {
  imageUrl: string;
  title: string;
  sourcePageUrl: string;
  sourceDomain: string;
  sourceType: SourceType;
  width: number;
  height: number;
  score: number;
  reasons: string[];
};

const DEFAULT_SERP_BASE_URL = "https://serpapi.com/search.json";
const MIN_IMAGE_BYTES = 14_000;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 250;
const RETAILER_DOMAINS = [
  "nike.com",
  "adidas.com",
  "underarmour.com",
  "newbalance.com",
  "puma.com",
  "anta.com",
  "lining.com",
  "wayofwade.com",
  "footlocker.com",
  "champssports.com",
  "finishline.com",
  "dickssportinggoods.com",
  "eastbay.com",
  "jd.com",
  "goat.com",
  "stockx.com",
  "zappos.com"
];
const REVIEW_MEDIA_DOMAINS = [
  "weartesters.com",
  "solecollector.com",
  "sneakernews.com",
  "kickscrew.com",
  "highsnobiety.com"
];
const OFFICIAL_HINTS = ["official", "product", "nike", "adidas", "under armour", "new balance", "puma"];

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
  console.error(`[admin] /image requestId=${requestId} step=${step} fail status=${status}`, { error, detail });
  return NextResponse.json({ ok: false, error, step, detail }, { status });
}

function success(payload: Record<string, unknown>, requestId: string) {
  console.info(`[admin] /image requestId=${requestId} step=final_return success status=200`, payload);
  return NextResponse.json({ ok: true, ...payload }, { status: 200 });
}

function buildPublicUrl(baseUrl: string, bucket: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function parseDomain(urlValue?: string) {
  if (!urlValue) return "";
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function domainMatches(domain: string, candidates: string[]) {
  return candidates.some((candidate) => domain === candidate || domain.endsWith(`.${candidate}`));
}

function classifySourceType(domain: string): SourceType {
  if (!domain) return "unknown";
  if (domainMatches(domain, RETAILER_DOMAINS.slice(0, 7))) return "official";
  if (domainMatches(domain, RETAILER_DOMAINS)) return "retailer";
  if (domainMatches(domain, REVIEW_MEDIA_DOMAINS)) return "review_media";
  return "unknown";
}

function getSerpApiConfig(): SerpApiConfig | null {
  const provider = process.env.SERP_API_PROVIDER;
  const apiKey = process.env.SERP_API_KEY;
  const engine = process.env.SERP_API_ENGINE;
  const baseUrl = process.env.SERP_API_BASE_URL ?? DEFAULT_SERP_BASE_URL;
  if (!provider || !apiKey || !engine) return null;
  return { provider, apiKey, engine, baseUrl };
}

function buildSearchQuery(brand: string, shoeName: string) {
  return `${brand} ${shoeName} official product image side view`.replace(/\s+/g, " ").trim();
}

function chooseBestCandidate({
  brand,
  shoeName,
  results
}: {
  brand: string;
  shoeName: string;
  results: SerpApiImageResult[];
}): ScoredCandidate | null {
  const brandTokens = tokens(brand);
  const shoeTokens = tokens(shoeName);
  const shoeNumberTokens = shoeTokens.filter((token) => /^\d+[a-z]*$/.test(token));

  const scored: ScoredCandidate[] = [];

  for (const result of results) {
    const imageUrl = result.original?.trim() || "";
    const title = result.title?.trim() || "";
    const sourcePageUrl = result.link?.trim() || "";
    const sourceText = result.source?.trim() || "";
    const width = result.original_width ?? 0;
    const height = result.original_height ?? 0;
    if (!imageUrl) continue;

    const haystack = normalizeText(`${title} ${sourceText} ${sourcePageUrl}`);
    const sourceDomain = parseDomain(sourcePageUrl || imageUrl);
    const sourceType = classifySourceType(sourceDomain);

    if (shoeNumberTokens.some((token) => !haystack.includes(token))) {
      continue;
    }

    const matchedShoeTokens = shoeTokens.filter((token) => haystack.includes(token));
    const matchedBrandTokens = brandTokens.filter((token) => haystack.includes(token));

    if (shoeTokens.length > 0 && matchedShoeTokens.length < Math.max(1, Math.ceil(shoeTokens.length * 0.5))) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    score += matchedShoeTokens.length * 8;
    if (matchedShoeTokens.length > 0) reasons.push(`shoe_tokens:${matchedShoeTokens.length}`);

    score += matchedBrandTokens.length * 6;
    if (matchedBrandTokens.length > 0) reasons.push(`brand_tokens:${matchedBrandTokens.length}`);

    if (sourceType === "official") {
      score += 28;
      reasons.push("source:official");
    } else if (sourceType === "retailer") {
      score += 18;
      reasons.push("source:retailer");
    } else if (sourceType === "review_media") {
      score += 9;
      reasons.push("source:review_media");
    }

    const lowerTitle = title.toLowerCase();

    if (OFFICIAL_HINTS.some((hint) => lowerTitle.includes(hint))) {
      score += 6;
      reasons.push("official_hint");
    }
    if (lowerTitle.includes("side") || lowerTitle.includes("lateral") || lowerTitle.includes("profile")) {
      score += 10;
      reasons.push("side_view_hint");
    }
    if (lowerTitle.includes("on foot") || lowerTitle.includes("on-foot") || lowerTitle.includes("outfit")) {
      score -= 10;
      reasons.push("penalty:on_foot");
    }
    if (lowerTitle.includes("thumbnail") || lowerTitle.includes("thumb") || lowerTitle.includes("logo")) {
      score -= 10;
      reasons.push("penalty:thumbnail_or_logo");
    }

    if (width >= 1200 && height >= 700) {
      score += 8;
      reasons.push("resolution:high");
    } else if (width >= 800 && height >= 500) {
      score += 4;
      reasons.push("resolution:medium");
    } else if (width > 0 && height > 0) {
      score -= 8;
      reasons.push("penalty:low_resolution");
    }

    if ((width > 0 && width < MIN_WIDTH) || (height > 0 && height < MIN_HEIGHT)) {
      score -= 20;
      reasons.push("penalty:tiny_image");
    }

    scored.push({ imageUrl, title, sourcePageUrl, sourceDomain, sourceType, width, height, score, reasons });
  }

  if (!scored.length) return null;

  scored.sort((a, b) => b.score - a.score);

  if (scored[0].score < 20) return null;
  return scored[0];
}

async function searchCandidates({ config, query }: { config: SerpApiConfig; query: string }): Promise<SerpApiImageResult[]> {
  const url = new URL(config.baseUrl);
  url.searchParams.set("engine", config.engine);
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", config.apiKey);
  url.searchParams.set("num", "20");

  const response = await fetch(url.toString(), { method: "GET" });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`serpapi_status=${response.status} body=${text.slice(0, 400)}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error(`serpapi_non_json ${(error as Error).message}`);
  }

  const imagesResults = (payload as { images_results?: SerpApiImageResult[] }).images_results;
  if (!Array.isArray(imagesResults)) return [];

  return imagesResults;
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

  if (error) {
    throw new Error(error.message);
  }

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
      return fail({ status: 400, error: "No pending image to approve.", step: "db_update", requestId });
    }

    const nowIso = new Date().toISOString();

    const { error: demoteError } = await supabase
      .from("shoe_images")
      .update({
        status: "rejected",
        rejected_at: nowIso,
        rejection_reason: "Superseded by newer approved image."
      })
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
      return fail({ status: 400, error: "No pending image to reject.", step: "db_update", requestId });
    }

    const { error: rejectError } = await supabase
      .from("shoe_images")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: "Rejected by admin review."
      })
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

  const config = getSerpApiConfig();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "shoe-images";

  if (!config || !supabaseUrl) {
    return fail({
      status: 500,
      error: "Search/import environment variables are incomplete.",
      step: "env",
      detail: `SERP_API_PROVIDER=${Boolean(process.env.SERP_API_PROVIDER)} SERP_API_KEY=${Boolean(process.env.SERP_API_KEY)} SERP_API_ENGINE=${Boolean(process.env.SERP_API_ENGINE)} supabaseUrl=${Boolean(supabaseUrl)}`,
      requestId
    });
  }

  const { data: shoe, error: shoeError } = await supabase
    .from("shoes")
    .select("id, brand, shoe_name")
    .eq("id", shoeId)
    .maybeSingle();

  if (shoeError || !shoe) {
    return fail({
      status: 404,
      error: "Shoe not found.",
      step: "shoe_load",
      detail: shoeError?.message,
      requestId
    });
  }

  const query = buildSearchQuery(shoe.brand, shoe.shoe_name);
  let candidates: SerpApiImageResult[] = [];
  try {
    candidates = await searchCandidates({ config, query });
  } catch (error) {
    return fail({
      status: 502,
      error: "Image search failed",
      step: "search_request",
      detail: error instanceof Error ? error.message : "unknown_search_error",
      requestId
    });
  }

  const bestCandidate = chooseBestCandidate({ brand: shoe.brand, shoeName: shoe.shoe_name, results: candidates });
  if (!bestCandidate) {
    return fail({
      status: 404,
      error: "No suitable image found",
      step: "candidate_selection",
      requestId
    });
  }

  let imageBytes: Buffer;
  let contentType = "image/jpeg";
  try {
    const response = await fetch(bestCandidate.imageUrl, {
      headers: {
        accept: "image/*,*/*;q=0.8",
        "user-agent": "snkrfeature-image-import/1.0"
      }
    });

    if (!response.ok) {
      return fail({
        status: 502,
        error: "Selected image could not be downloaded",
        step: "image_download",
        detail: `status=${response.status}`,
        requestId
      });
    }

    contentType = response.headers.get("content-type") ?? contentType;
    if (!contentType.toLowerCase().startsWith("image/")) {
      return fail({
        status: 502,
        error: "Selected image could not be downloaded",
        step: "image_download",
        detail: `invalid_content_type=${contentType}`,
        requestId
      });
    }

    imageBytes = Buffer.from(await response.arrayBuffer());
    if (imageBytes.byteLength < MIN_IMAGE_BYTES) {
      return fail({
        status: 502,
        error: "Selected image could not be downloaded",
        step: "image_download",
        detail: `image_too_small=${imageBytes.byteLength}`,
        requestId
      });
    }
  } catch (error) {
    return fail({
      status: 502,
      error: "Selected image could not be downloaded",
      step: "image_download",
      detail: error instanceof Error ? error.message : "download_error",
      requestId
    });
  }

  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `shoes/${shoeId}/${Date.now()}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, imageBytes, {
    upsert: false,
    contentType
  });

  if (uploadError) {
    return fail({
      status: 500,
      error: "Image import upload failed",
      step: "storage_upload",
      detail: uploadError.message,
      requestId
    });
  }

  const { error: closePendingError } = await supabase
    .from("shoe_images")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: "Superseded by newer pending import."
    })
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

  const publicUrl = buildPublicUrl(supabaseUrl, bucket, path);
  const selectionReason = `score=${bestCandidate.score}; reasons=${bestCandidate.reasons.join(",")}; query=${query}`;

  const { error: insertError } = await supabase.from("shoe_images").insert({
    shoe_id: shoeId,
    storage_path: path,
    public_url: publicUrl,
    status: "pending",
    provider: "SerpApi",
    search_provider: "SerpApi",
    search_model: config.engine,
    source_image_url: bestCandidate.imageUrl,
    source_domain: bestCandidate.sourceDomain || null,
    source_type: bestCandidate.sourceType,
    selection_reason: selectionReason,
    created_by: user.id
  });

  if (insertError) {
    return fail({
      status: 500,
      error: "Image metadata insert failed",
      step: "db_insert",
      detail: insertError.message,
      requestId
    });
  }

  return success(
    {
      message: "Image imported for review",
      storage_path: path,
      public_url: publicUrl,
      source_image_url: bestCandidate.imageUrl,
      source_domain: bestCandidate.sourceDomain,
      source_type: bestCandidate.sourceType,
      selection_reason: selectionReason
    },
    requestId
  );
}
