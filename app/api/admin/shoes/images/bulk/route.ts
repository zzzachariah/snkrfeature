import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/route-auth";
import {
  computeBulkImageStats,
  createBulkJob,
  getActiveBulkJob,
  getBulkJobItemsSummary,
  getLatestBulkJob,
  listMissingBulkTargetShoes,
  MAX_BULK_QUANTITY
} from "@/lib/admin/bulk-image-jobs";

export async function GET() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  try {
    const [stats, latestJob, activeJob, availableShoes] = await Promise.all([
      computeBulkImageStats(supabase),
      getLatestBulkJob(supabase),
      getActiveBulkJob(supabase),
      listMissingBulkTargetShoes(supabase)
    ]);

    const items = latestJob ? await getBulkJobItemsSummary(supabase, latestJob.id) : [];

    return NextResponse.json({
      ok: true,
      stats,
      active_job: activeJob,
      latest_job: latestJob,
      latest_items: items,
      available_shoes: availableShoes,
      max_quantity: MAX_BULK_QUANTITY
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to load bulk image job status.", detail: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  let payload: { quantity?: unknown; selectedShoeIds?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const selectedShoeIds = Array.isArray(payload.selectedShoeIds)
    ? payload.selectedShoeIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  const parsedQuantity = typeof payload.quantity === "number" ? payload.quantity : Number(payload.quantity);
  const quantity = Number.isFinite(parsedQuantity) ? parsedQuantity : undefined;

  try {
    const created = await createBulkJob({
      supabase,
      userId: user.id,
      selectedShoeIds,
      quantity
    });
    const stats = await computeBulkImageStats(supabase);

    return NextResponse.json({
      ok: true,
      message: created.created ? "Bulk image import started" : "Bulk job in progress",
      started_new_job: created.created,
      job: created.job,
      stats
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to start bulk image import job." },
      { status: 400 }
    );
  }
}
