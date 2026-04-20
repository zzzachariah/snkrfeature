import { SupabaseClient } from "@supabase/supabase-js";
import { importBestShoeImage } from "@/lib/admin/shoe-image-import";

export type BulkJobStatus = "running" | "cancel_requested" | "cancelled" | "completed" | "failed";

const MAX_BULK_QUANTITY = 200;

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

async function getMissingTargetShoes(supabase: SupabaseClient) {
  const { data: shoes, error: shoesError } = await supabase
    .from("shoes")
    .select("id, brand, shoe_name, release_year")
    .order("created_at", { ascending: true });

  if (shoesError) throw new Error(shoesError.message);

  const shoeRows = (shoes ?? []) as ShoeRow[];
  const shoeIds = shoeRows.map((shoe) => shoe.id);
  if (!shoeIds.length) return [] as ShoeRow[];

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

  return shoeRows.filter((shoe) => !approved.has(shoe.id) && !pending.has(shoe.id));
}

export async function listMissingBulkTargetShoes(supabase: SupabaseClient, limit = 250) {
  const targets = await getMissingTargetShoes(supabase);
  return targets.slice(0, Math.max(1, limit)).map((shoe) => ({
    id: shoe.id,
    label: `${shoe.brand} ${shoe.shoe_name}`.trim(),
    brand: shoe.brand,
    shoe_name: shoe.shoe_name,
    release_year: shoe.release_year ?? null
  }));
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

export async function createBulkJob({
  supabase,
  userId,
  selectedShoeIds,
  quantity
}: {
  supabase: SupabaseClient;
  userId: string;
  selectedShoeIds?: string[];
  quantity?: number;
}) {
  const running = await getActiveBulkJob(supabase);
  if (running) return { created: false as const, job: running };

  const allTargets = await getMissingTargetShoes(supabase);

  const selectedSet = new Set((selectedShoeIds ?? []).filter(Boolean));
  let targets: ShoeRow[];
  if (selectedSet.size > 0) {
    targets = allTargets.filter((shoe) => selectedSet.has(shoe.id));
  } else if (typeof quantity === "number") {
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_BULK_QUANTITY) {
      throw new Error(`Quantity must be an integer between 1 and ${MAX_BULK_QUANTITY}.`);
    }
    targets = allTargets.slice(0, quantity);
  } else {
    targets = allTargets;
  }

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

  const nowIso = new Date().toISOString();
  if (active.status === "running") {
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
  }

  const latest = await getLatestBulkJob(supabase);
  if (!latest) return { ok: false as const, message: "No active bulk job" };

  await forceCancelBulkJob(supabase, latest.id);
  return { ok: true as const, message: "Stopped", job: await getLatestBulkJob(supabase) };
}

async function forceCancelBulkJob(supabase: SupabaseClient, jobId: string) {
  const nowIso = new Date().toISOString();

  const { error: resetError } = await supabase
    .from("admin_bulk_image_job_items")
    .update({ status: "pending", updated_at: nowIso })
    .eq("job_id", jobId)
    .eq("status", "processing");
  if (resetError) throw new Error(resetError.message);

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
    .in("status", ["running", "cancel_requested"]);

  if (error) throw new Error(error.message);
}

export async function syncJobCounters(supabase: SupabaseClient, jobId: string) {
  const { data: job } = await supabase.from("admin_bulk_image_jobs").select("status,cancelled_at,completed_at").eq("id", jobId).single();

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
  const nowIso = new Date().toISOString();

  let status: BulkJobStatus;
  if (job?.status === "cancelled") {
    status = "cancelled";
  } else if (job?.status === "cancel_requested") {
    status = isDone ? "cancelled" : "cancel_requested";
  } else {
    status = isDone ? "completed" : "running";
  }

  const { error: updateError } = await supabase
    .from("admin_bulk_image_jobs")
    .update({
      processed_count: counts.processed,
      success_count: counts.success,
      skip_count: counts.skipped,
      failure_count: counts.failed,
      status,
      completed_at: status === "completed" || status === "cancelled" ? (job?.completed_at ?? nowIso) : null,
      cancelled_at: status === "cancelled" ? (job?.cancelled_at ?? nowIso) : null,
      current_shoe_id: null,
      current_shoe_label: null,
      updated_at: nowIso
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
    await forceCancelBulkJob(supabase, active.id);
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
  if (jobStateNow?.status === "cancel_requested" || jobStateNow?.status === "cancelled") {
    await supabase
      .from("admin_bulk_image_job_items")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", nextItem.id)
      .eq("status", "processing");
    await forceCancelBulkJob(supabase, active.id);
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
export { MAX_BULK_QUANTITY };
