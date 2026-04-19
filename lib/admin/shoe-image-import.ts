import { randomUUID } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

type SourceType = "official" | "retailer" | "review_media" | "unknown";

type SerpApiConfig = {
  provider: string;
  apiKey: string;
  engine: string;
  baseUrl: string;
};

type SerpApiImageResult = {
  original?: string;
  title?: string;
  source?: string;
  link?: string;
  original_width?: number;
  original_height?: number;
};

type ImportMode = "single_pending" | "bulk_auto_approve";

type ImportBestImageInput = {
  supabase: SupabaseClient;
  adminStorageClient: SupabaseClient;
  shoe: { id: string; brand: string; shoe_name: string; release_year?: number | null };
  mode: ImportMode;
  createdBy: string;
  bucket?: string;
  supabaseUrl: string;
};

type ImportBestImageSuccess = {
  ok: true;
  storagePath: string;
  publicUrl: string;
  status: "pending" | "approved";
  sourceImageUrl: string;
  sourceDomain: string;
  sourceType: SourceType;
  selectionReason: string;
  queryUsed: string;
};

type ImportBestImageFailure = {
  ok: false;
  error: "No suitable image found" | "Selected image could not be downloaded" | "Image import upload failed" | "Image metadata insert failed";
  detail?: string;
};

export type ImportBestImageResult = ImportBestImageSuccess | ImportBestImageFailure;

const DEFAULT_SERP_BASE_URL = "https://serpapi.com/search.json";
const MIN_IMAGE_BYTES = 14_000;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 250;

const OFFICIAL_DOMAINS = ["nike.com", "adidas.com", "underarmour.com", "newbalance.com", "puma.com", "anta.com", "lining.com", "wayofwade.com"];
const RETAILER_DOMAINS = ["footlocker.com", "champssports.com", "finishline.com", "dickssportinggoods.com", "eastbay.com", "goat.com", "stockx.com", "zappos.com", "scheels.com"];
const REVIEW_MEDIA_DOMAINS = ["weartesters.com", "solecollector.com", "sneakernews.com", "kickscrew.com", "highsnobiety.com"];

const STRONG_POSITIVE_TERMS = ["official", "product", "lateral", "side", "profile", "catalog", "basketball"];
const STRONG_NEGATIVE_TERMS = ["on foot", "on-foot", "outfit", "campaign", "lookbook", "editorial", "thumbnail", "collage", "grid", "top 10", "best shoes"];
const STOPWORDS = new Set(["the", "and", "for", "with", "shoe", "shoes", "basketball", "model", "official", "product", "image", "view"]);

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .filter((part) => !STOPWORDS.has(part));
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
  if (domainMatches(domain, OFFICIAL_DOMAINS)) return "official";
  if (domainMatches(domain, RETAILER_DOMAINS)) return "retailer";
  if (domainMatches(domain, REVIEW_MEDIA_DOMAINS)) return "review_media";
  return "unknown";
}

export function getSerpApiConfig(): SerpApiConfig | null {
  const provider = process.env.SERP_API_PROVIDER;
  const apiKey = process.env.SERP_API_KEY;
  const engine = process.env.SERP_API_ENGINE;
  const baseUrl = process.env.SERP_API_BASE_URL ?? DEFAULT_SERP_BASE_URL;
  if (!provider || !apiKey || !engine) return null;
  return { provider, apiKey, engine, baseUrl };
}

function buildSearchQueries(brand: string, shoeName: string, releaseYear?: number | null) {
  const core = `${brand} ${shoeName} ${releaseYear ?? ""}`.replace(/\s+/g, " ").trim();
  return [
    `${core} official product image side view basketball shoe`,
    `${core} lateral product photo basketball shoe`,
    `${core} retailer product image side profile`
  ];
}

type ScoredCandidate = {
  imageUrl: string;
  title: string;
  sourcePageUrl: string;
  sourceDomain: string;
  sourceType: SourceType;
  width: number;
  height: number;
  score: number;
  isSideViewLike: boolean;
  isHighResolution: boolean;
  reasons: string[];
};

function chooseBestCandidate({
  brand,
  shoeName,
  releaseYear,
  results
}: {
  brand: string;
  shoeName: string;
  releaseYear?: number | null;
  results: SerpApiImageResult[];
}): ScoredCandidate | null {
  const brandTokens = tokens(brand);
  const shoeTokens = tokens(shoeName);
  const shoeNumberTokens = shoeTokens.filter((token) => /^\d+[a-z]*$/.test(token));
  const releaseYearToken = releaseYear ? String(releaseYear) : null;

  const scored: ScoredCandidate[] = [];

  for (const result of results) {
    const imageUrl = result.original?.trim() || "";
    if (!imageUrl) continue;

    const title = result.title?.trim() || "";
    const sourceText = result.source?.trim() || "";
    const sourcePageUrl = result.link?.trim() || "";
    const width = result.original_width ?? 0;
    const height = result.original_height ?? 0;

    const haystack = normalizeText(`${title} ${sourceText} ${sourcePageUrl}`);
    const sourceDomain = parseDomain(sourcePageUrl || imageUrl);
    const sourceType = classifySourceType(sourceDomain);

    if (shoeNumberTokens.some((token) => !haystack.includes(token))) continue;
    if (releaseYearToken && !haystack.includes(releaseYearToken)) continue;

    const matchedShoeTokens = shoeTokens.filter((token) => haystack.includes(token));
    const matchedBrandTokens = brandTokens.filter((token) => haystack.includes(token));

    if (shoeTokens.length > 0 && matchedShoeTokens.length < Math.max(1, Math.ceil(shoeTokens.length * 0.7))) continue;
    if (brandTokens.length > 0 && matchedBrandTokens.length === 0) continue;

    const lowerTitle = title.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    score += matchedShoeTokens.length * 10;
    score += matchedBrandTokens.length * 8;

    if (sourceType === "official") {
      score += 40;
      reasons.push("official_source");
    } else if (sourceType === "retailer") {
      score += 28;
      reasons.push("retailer_source");
    } else if (sourceType === "review_media") {
      score += 16;
      reasons.push("review_media_source");
    }

    const positiveHits = STRONG_POSITIVE_TERMS.filter((term) => lowerTitle.includes(term));
    const negativeHits = STRONG_NEGATIVE_TERMS.filter((term) => lowerTitle.includes(term));

    score += positiveHits.length * 6;
    score -= negativeHits.length * 10;

    const isSideViewLike = ["side", "lateral", "profile"].some((term) => lowerTitle.includes(term));
    if (isSideViewLike) score += 12;

    const isLandscape = width > 0 && height > 0 && width >= height;
    if (isLandscape) score += 4;

    const isHighResolution = width >= 1200 && height >= 700;
    if (isHighResolution) {
      score += 10;
      reasons.push("high_resolution");
    } else if (width >= 800 && height >= 500) {
      score += 4;
    } else if (width > 0 && height > 0) {
      score -= 12;
      reasons.push("low_resolution_penalty");
    }

    if ((width > 0 && width < MIN_WIDTH) || (height > 0 && height < MIN_HEIGHT)) {
      score -= 30;
      reasons.push("tiny_image_penalty");
    }

    if (lowerTitle.includes("women") && !normalizeText(shoeName).includes("women")) {
      score -= 4;
    }

    scored.push({
      imageUrl,
      title,
      sourcePageUrl,
      sourceDomain,
      sourceType,
      width,
      height,
      score,
      isSideViewLike,
      isHighResolution,
      reasons
    });
  }

  if (!scored.length) return null;

  scored.sort((a, b) => b.score - a.score);
  if (scored[0].score < 30) return null;
  return scored[0];
}

function buildSelectionReason(candidate: ScoredCandidate) {
  const sourcePrefix =
    candidate.sourceType === "official"
      ? "official"
      : candidate.sourceType === "retailer"
        ? "retailer"
        : candidate.sourceType === "review_media"
          ? "review"
          : "unknown-source";

  if (candidate.isSideViewLike && candidate.isHighResolution) {
    return `${sourcePrefix} side-view product image with exact model match and high resolution`;
  }

  if (candidate.isSideViewLike) {
    return `${sourcePrefix} side-view product image with exact model match`;
  }

  if (candidate.isHighResolution) {
    return `${sourcePrefix} product image with exact model match and high resolution`;
  }

  return `${sourcePrefix} product image chosen as best exact model candidate`;
}

async function searchCandidates(config: SerpApiConfig, query: string): Promise<SerpApiImageResult[]> {
  const url = new URL(config.baseUrl);
  url.searchParams.set("engine", config.engine);
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", config.apiKey);
  url.searchParams.set("num", "20");

  const response = await fetch(url.toString(), { method: "GET" });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`serpapi_status=${response.status} body=${text.slice(0, 300)}`);
  }

  const payload = JSON.parse(text) as { images_results?: SerpApiImageResult[] };
  if (!Array.isArray(payload.images_results)) return [];
  return payload.images_results;
}

async function downloadImageBytes(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "image/*,*/*;q=0.8",
      "user-agent": "snkrfeature-image-import/1.0"
    }
  });

  if (!response.ok) {
    return { ok: false as const, detail: `status=${response.status}` };
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return { ok: false as const, detail: `invalid_content_type=${contentType}` };
  }

  const imageBytes = Buffer.from(await response.arrayBuffer());
  if (imageBytes.byteLength < MIN_IMAGE_BYTES) {
    return { ok: false as const, detail: `image_too_small=${imageBytes.byteLength}` };
  }

  return { ok: true as const, imageBytes, contentType };
}

export async function importBestShoeImage(input: ImportBestImageInput): Promise<ImportBestImageResult> {
  const config = getSerpApiConfig();
  if (!config) {
    return { ok: false, error: "No suitable image found", detail: "serp_api_config_missing" };
  }

  const queries = buildSearchQueries(input.shoe.brand, input.shoe.shoe_name, input.shoe.release_year);
  const uniqueResults: SerpApiImageResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const queryResults = await searchCandidates(config, query);
    for (const result of queryResults) {
      const key = result.original?.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueResults.push(result);
    }
  }

  const bestCandidate = chooseBestCandidate({
    brand: input.shoe.brand,
    shoeName: input.shoe.shoe_name,
    releaseYear: input.shoe.release_year,
    results: uniqueResults
  });

  if (!bestCandidate) {
    return { ok: false, error: "No suitable image found" };
  }

  const download = await downloadImageBytes(bestCandidate.imageUrl);
  if (!download.ok) {
    return { ok: false, error: "Selected image could not be downloaded", detail: download.detail };
  }

  const extension = download.contentType.includes("png") ? "png" : download.contentType.includes("webp") ? "webp" : "jpg";
  const path = `shoes/${input.shoe.id}/${Date.now()}-${randomUUID()}.${extension}`;

  const { error: uploadError } = await input.adminStorageClient.storage.from(input.bucket ?? "shoe-images").upload(path, download.imageBytes, {
    upsert: false,
    contentType: download.contentType
  });

  if (uploadError) {
    return { ok: false, error: "Image import upload failed", detail: uploadError.message };
  }

  const status = input.mode === "bulk_auto_approve" ? "approved" : "pending";
  const nowIso = new Date().toISOString();
  const publicUrl = `${input.supabaseUrl}/storage/v1/object/public/${input.bucket ?? "shoe-images"}/${path}`;
  const selectionReason = buildSelectionReason(bestCandidate);

  if (status === "pending") {
    const { error: closePendingError } = await input.supabase
      .from("shoe_images")
      .update({
        status: "rejected",
        rejected_at: nowIso,
        rejection_reason: "Superseded by newer pending import."
      })
      .eq("shoe_id", input.shoe.id)
      .eq("status", "pending");

    if (closePendingError) {
      return { ok: false, error: "Image metadata insert failed", detail: closePendingError.message };
    }
  }

  const { error: insertError } = await input.supabase.from("shoe_images").insert({
    shoe_id: input.shoe.id,
    storage_path: path,
    public_url: publicUrl,
    status,
    provider: "SerpApi",
    search_provider: "SerpApi",
    search_model: config.engine,
    source_image_url: bestCandidate.imageUrl,
    source_domain: bestCandidate.sourceDomain || null,
    source_type: bestCandidate.sourceType,
    selection_reason: selectionReason,
    created_by: input.createdBy,
    approved_at: status === "approved" ? nowIso : null
  });

  if (insertError) {
    return { ok: false, error: "Image metadata insert failed", detail: insertError.message };
  }

  return {
    ok: true,
    storagePath: path,
    publicUrl,
    status,
    sourceImageUrl: bestCandidate.imageUrl,
    sourceDomain: bestCandidate.sourceDomain,
    sourceType: bestCandidate.sourceType,
    selectionReason,
    queryUsed: queries[0]
  };
}
