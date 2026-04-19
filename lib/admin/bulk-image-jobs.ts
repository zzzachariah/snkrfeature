import { SupabaseClient } from "@supabase/supabase-js";
import { importBestShoeImage } from "@/lib/admin/shoe-image-import";

export type BulkJobStatus = "running" | "cancel_requested" | "cancelled" | "completed" | "failed";

type ShoeRow = {
  id: string;
  brand: string;
  shoe_name: string;
  release_year?: number | null;
};

type JobRow = {
  id: string;
  status: BulkJobStatus;
  total_count: number;
  processed_count: number;
  success_count: number;
  skip_count: number;
  failure_count: number;
  started_at: string;
  updated_at: string;
  completed_at?: string | null;
  current_shoe_id?: string | null;
  current_shoe_label?: string | null;
  failure_summary?: unknown;
  cancel_requested_at?: string | null;
  cancelled_at?: string | null;
};

type ItemRow = {
  id: string;
  job_id: string;
  shoe_id: string;
  shoe_label: string;
  status: "pending" | "processing" | "success" | "skipped" | "failed";
  error_message?: string | null;
  source_image_url?: string | null;
  selection_reason?: string | null;
};

export async function computeBulkImageStats(supabase: SupabaseClient) {
  const { data: shoes, error: shoesError } = await supabase.from("shoes").select("id");
  if (shoesError) throw new Error(shoesError.message);

  const totalShoes = shoes?.length ?? 0;
  const shoeIds = (shoes ?? []).map((shoe) => shoe.id);
  if (!shoeIds.length) return { totalShoes: 0, missingApprovedImages: 0 };

  const { data: existing, error: existingError } = await supabase
    .from("shoe_images")
    .select("shoe_id, status")
    .in("shoe_id", shoeIds)
    .in("status", ["approved", "pending"]);

  if (existingError) throw new Error(existingError.message);

  const approved = new Set<string>();
  const pending = new Set<string>();
  for (const row of existing ?? []) {
    if (row.status === "approved") approved.add(row.shoe_id);
    if (row.status === "pending") pending.add(row.shoe_id);
  }

  const missingApprovedImages = shoeIds.filter((shoeId) => !approved.has(shoeId) && !pending.has(shoeId)).length;
  return { totalShoes, missingApprovedImages };
}

export async function getLatestBulkJob(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("admin_bulk_image_jobs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as JobRow | null) ?? null;
}

export async function getActiveBulkJob(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("admin_bulk_image_jobs")
    .select("*")
    .in("status", ["running", "cancel_requested"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as JobRow | null) ?? null;
}

export async function createBulkJob({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const running = await getActiveBulkJob(supabase);
  if (running) return { created: false as const, job: running };

  const { data: shoes, error: shoesError } = await supabase
    .from("shoes")
    .select("id, brand, shoe_name, release_year")
    .order("created_at", { ascending: true });

  if (shoesError) throw new Error(shoesError.message);

  const shoeRows = (shoes ?? []) as ShoeRow[];
  const shoeIds = shoeRows.map((shoe) => shoe.id);

  const { data: existing, error: existingError } = await supabase
    .from("shoe_images")
    .select("shoe_id, status")
    .in("shoe_id", shoeIds)
    .in("status", ["approved", "pending"]);

  if (existingError) throw new Error(existingError.message);

  const approved = new Set<string>();
  const pending = new Set<string>();
  for (const row of existing ?? []) {
    if (row.status === "approved") approved.add(row.shoe_id);
    if (row.status === "pending") pending.add(row.shoe_id);
  }

  const targets = shoeRows.filter((shoe) => !approved.has(shoe.id) && !pending.has(shoe.id));

  const { data: job, error: jobError } = await supabase
    .from("admin_bulk_image_jobs")
    .insert({
      status: "running",
      total_count: targets.length,
      processed_count: 0,
      success_count: 0,
      skip_count: 0,
      failure_count: 0,
      started_by: userId,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (jobError) throw new Error(jobError.message);

  if (targets.length > 0) {
    const items = targets.map((shoe) => ({
      job_id: job.id,
      shoe_id: shoe.id,
      shoe_label: `${shoe.brand} ${shoe.shoe_name}`.trim(),
      status: "pending"
    }));

    const { error: itemsError } = await supabase.from("admin_bulk_image_job_items").insert(items);
    if (itemsError) throw new Error(itemsError.message);
  } else {
    const { error: completeError } = await supabase
      .from("admin_bulk_image_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", job.id);
    if (completeError) throw new Error(completeError.message);
  }

  return { created: true as const, job: await getLatestBulkJob(supabase) };
}

export async function requestBulkJobCancel({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const active = await getActiveBulkJob(supabase);
  if (!active) return { ok: false as const, message: "No active bulk job" };

  if (active.status === "cancel_requested") return { ok: true as const, message: "Stopping...", job: active };

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("admin_bulk_image_jobs")
    .update({
      status: "cancel_requested",
      cancel_requested_at: nowIso,
      updated_at: nowIso,
      failure_summary: [{ message: `Cancel requested by admin ${userId} at ${nowIso}` }]
    })
    .eq("id", active.id)
    .eq("status", "running");

  if (error) throw new Error(error.message);
  return { ok: true as const, message: "Stopping...", job: await getLatestBulkJob(supabase) };
}

async function setJobCancelled(supabase: SupabaseClient, jobId: string) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("admin_bulk_image_jobs")
    .update({
      status: "cancelled",
      cancelled_at: nowIso,
      completed_at: nowIso,
      current_shoe_id: null,
      current_shoe_label: null,
      updated_at: nowIso
    })
    .eq("id", jobId)
    .eq("status", "cancel_requested");
  if (error) throw new Error(error.message);
}

export async function syncJobCounters(supabase: SupabaseClient, jobId: string) {
  const { data: job } = await supabase.from("admin_bulk_image_jobs").select("status").eq("id", jobId).single();

  const { data: items, error } = await supabase.from("admin_bulk_image_job_items").select("status").eq("job_id", jobId);
  if (error) throw new Error(error.message);

  const counts = { processed: 0, success: 0, skipped: 0, failed: 0, processing: 0, pending: 0 };
  for (const item of items ?? []) {
    if (item.status === "success") {
      counts.success += 1;
      counts.processed += 1;
    } else if (item.status === "skipped") {
      counts.skipped += 1;
      counts.processed += 1;
    } else if (item.status === "failed") {
      counts.failed += 1;
      counts.processed += 1;
    } else if (item.status === "processing") {
      counts.processing += 1;
    } else if (item.status === "pending") {
      counts.pending += 1;
    }
  }

  const isDone = counts.pending === 0 && counts.processing === 0;
  const status: BulkJobStatus = job?.status === "cancel_requested" ? (isDone ? "cancelled" : "cancel_requested") : isDone ? "completed" : "running";

  const { error: updateError } = await supabase
    .from("admin_bulk_image_jobs")
    .update({
      processed_count: counts.processed,
      success_count: counts.success,
      skip_count: counts.skipped,
      failure_count: counts.failed,
      status,
      completed_at: isDone ? new Date().toISOString() : null,
      cancelled_at: status === "cancelled" ? new Date().toISOString() : null,
      current_shoe_id: null,
      current_shoe_label: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId);

  if (updateError) throw new Error(updateError.message);
  return getLatestBulkJob(supabase);
}

export async function processBulkJobTick({
  supabase,
  adminStorageClient,
  supabaseUrl,
  bucket,
  userId
}: {
  supabase: SupabaseClient;
  adminStorageClient: SupabaseClient;
  supabaseUrl: string;
  bucket: string;
  userId: string;
}) {
  const active = await getActiveBulkJob(supabase);
  if (!active) return { hasRunningJob: false as const, job: await getLatestBulkJob(supabase) };

  if (active.status === "cancel_requested") {
    await setJobCancelled(supabase, active.id);
    return { hasRunningJob: false as const, job: await getLatestBulkJob(supabase) };
  }

  const { data: nextItem, error: nextItemError } = await supabase
    .from("admin_bulk_image_job_items")
    .select("*")
    .eq("job_id", active.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextItemError) throw new Error(nextItemError.message);

  if (!nextItem) {
    const synced = await syncJobCounters(supabase, active.id);
    return { hasRunningJob: synced?.status === "running" || synced?.status === "cancel_requested", job: synced };
  }

  const { data: claimedRows, error: claimError } = await supabase
    .from("admin_bulk_image_job_items")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", nextItem.id)
    .eq("status", "pending")
    .select("id");

  if (claimError) throw new Error(claimError.message);
  if (!claimedRows?.length) return { hasRunningJob: true as const, job: await getLatestBulkJob(supabase) };

  await supabase
    .from("admin_bulk_image_jobs")
    .update({ current_shoe_id: nextItem.shoe_id, current_shoe_label: nextItem.shoe_label, updated_at: new Date().toISOString() })
    .eq("id", active.id);

  const { data: jobStateNow } = await supabase.from("admin_bulk_image_jobs").select("status").eq("id", active.id).single();
  if (jobStateNow?.status === "cancel_requested") {
    await supabase
      .from("admin_bulk_image_job_items")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", nextItem.id)
      .eq("status", "processing");
    await setJobCancelled(supabase, active.id);
    return { hasRunningJob: false as const, job: await getLatestBulkJob(supabase) };
  }

  const { data: existing, error: existingError } = await supabase
    .from("shoe_images")
    .select("status")
    .eq("shoe_id", nextItem.shoe_id)
    .in("status", ["approved", "pending"]);

  if (existingError) throw new Error(existingError.message);

  if ((existing ?? []).length > 0) {
    await supabase
      .from("admin_bulk_image_job_items")
      .update({ status: "skipped", error_message: "Skipped: approved or pending image already exists.", updated_at: new Date().toISOString() })
      .eq("id", nextItem.id);
    const synced = await syncJobCounters(supabase, active.id);
    return { hasRunningJob: synced?.status === "running" || synced?.status === "cancel_requested", job: synced };
  }

  const { data: shoe, error: shoeError } = await supabase
    .from("shoes")
    .select("id, brand, shoe_name, release_year")
    .eq("id", nextItem.shoe_id)
    .maybeSingle();

  if (shoeError || !shoe) {
    await supabase
      .from("admin_bulk_image_job_items")
      .update({ status: "failed", error_message: "Shoe not found.", updated_at: new Date().toISOString() })
      .eq("id", nextItem.id);
    const synced = await syncJobCounters(supabase, active.id);
    return { hasRunningJob: synced?.status === "running" || synced?.status === "cancel_requested", job: synced };
  }

  try {
    const result = await importBestShoeImage({
      supabase,
      adminStorageClient,
      shoe,
      mode: "bulk_auto_approve",
      createdBy: userId,
      supabaseUrl,
      bucket
    });

    if (result.ok) {
      await supabase
        .from("admin_bulk_image_job_items")
        .update({
          status: "success",
          source_image_url: result.sourceImageUrl,
          selection_reason: result.selectionReason,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", nextItem.id);
    } else {
      await supabase
        .from("admin_bulk_image_job_items")
        .update({ status: "failed", error_message: `${result.error}${result.detail ? `: ${result.detail}` : ""}`.slice(0, 1800), updated_at: new Date().toISOString() })
        .eq("id", nextItem.id);
    }
  } catch (error) {
    await supabase
      .from("admin_bulk_image_job_items")
      .update({ status: "failed", error_message: error instanceof Error ? error.message : "unknown_error", updated_at: new Date().toISOString() })
      .eq("id", nextItem.id);
  }

  const synced = await syncJobCounters(supabase, active.id);

  const { data: failedItems } = await supabase
    .from("admin_bulk_image_job_items")
    .select("shoe_label, error_message")
    .eq("job_id", active.id)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(6);

  await supabase
    .from("admin_bulk_image_jobs")
    .update({ failure_summary: failedItems ?? [], updated_at: new Date().toISOString() })
    .eq("id", active.id);

  return { hasRunningJob: synced?.status === "running" || synced?.status === "cancel_requested", job: await getLatestBulkJob(supabase) };
}

export async function getBulkJobItemsSummary(supabase: SupabaseClient, jobId: string) {
  const { data: failedItems, error } = await supabase
    .from("admin_bulk_image_job_items")
    .select("shoe_id, shoe_label, status, error_message")
    .eq("job_id", jobId)
    .in("status", ["failed", "skipped"])
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  return failedItems ?? [];
}

export type BulkJobRecord = JobRow;
export type BulkJobItemRecord = ItemRow;
