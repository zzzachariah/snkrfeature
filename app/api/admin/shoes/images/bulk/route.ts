import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/route-auth";
import {
  computeBulkImageStats,
  createBulkJob,
  getBulkJobItemsSummary,
  getLatestBulkJob,
  getRunningBulkJob
} from "@/lib/admin/bulk-image-jobs";

export async function GET() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  try {
    const [stats, latestJob, runningJob] = await Promise.all([
      computeBulkImageStats(supabase),
      getLatestBulkJob(supabase),
      getRunningBulkJob(supabase)
    ]);

    const items = latestJob ? await getBulkJobItemsSummary(supabase, latestJob.id) : [];

    return NextResponse.json({
      ok: true,
      stats,
      active_job: runningJob,
      latest_job: latestJob,
      latest_items: items
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to load bulk image job status.", detail: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  try {
    const created = await createBulkJob({ supabase, userId: user.id });
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
      { ok: false, error: "Failed to start bulk image import job.", detail: error instanceof Error ? error.message : "unknown_error" },
      { status: 500 }
    );
  }
}
