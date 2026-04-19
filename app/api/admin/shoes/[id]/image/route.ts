import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSerpApiConfig, importBestShoeImage } from "@/lib/admin/shoe-image-import";

const schema = z.object({
  action: z.enum(["find", "approve", "reject"])
});

type ErrorStep = "request_parse" | "auth" | "shoe_load" | "env" | "search_request" | "db_update" | "db_insert";

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

  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

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
    if (!pending) return fail({ status: 400, error: "No pending image to approve.", step: "db_update", requestId });

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
    if (!pending) return fail({ status: 400, error: "No pending image to reject.", step: "db_update", requestId });

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
    .select("id, brand, shoe_name, release_year")
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

  try {
    const result = await importBestShoeImage({
      supabase,
      adminStorageClient: adminClient,
      shoe,
      mode: "single_pending",
      createdBy: user.id,
      supabaseUrl,
      bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "shoe-images"
    });

    if (!result.ok) {
      const status = result.error === "No suitable image found" ? 404 : result.error === "Selected image could not be downloaded" ? 502 : 500;
      return fail({
        status,
        error: result.error,
        step: result.error === "No suitable image found" ? "search_request" : result.error === "Selected image could not be downloaded" ? "search_request" : "db_insert",
        detail: result.detail,
        requestId
      });
    }

    return success(
      {
        message: "Image imported for review",
        storage_path: result.storagePath,
        public_url: result.publicUrl,
        source_image_url: result.sourceImageUrl,
        source_domain: result.sourceDomain,
        source_type: result.sourceType,
        selection_reason: result.selectionReason
      },
      requestId
    );
  } catch (error) {
    return fail({
      status: 502,
      error: "Image search failed",
      step: "search_request",
      detail: error instanceof Error ? error.message : "unknown_search_error",
      requestId
    });
  }
}
