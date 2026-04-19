import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/route-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSerpApiConfig, importBestShoeImage } from "@/lib/admin/shoe-image-import";

type ShoeRow = { id: string; brand: string; shoe_name: string; release_year?: number | null };

export async function POST() {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json({ ok: false, error: "Supabase service role key is not configured." }, { status: 500 });
  }

  const config = getSerpApiConfig();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!config || !supabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Search/import environment variables are incomplete.",
        detail: `SERP_API_PROVIDER=${Boolean(process.env.SERP_API_PROVIDER)} SERP_API_KEY=${Boolean(process.env.SERP_API_KEY)} SERP_API_ENGINE=${Boolean(process.env.SERP_API_ENGINE)} supabaseUrl=${Boolean(supabaseUrl)}`
      },
      { status: 500 }
    );
  }

  const { data: shoes, error: shoesError } = await supabase.from("shoes").select("id, brand, shoe_name, release_year").order("created_at", { ascending: true });
  if (shoesError) {
    return NextResponse.json({ ok: false, error: "Failed to load shoes.", detail: shoesError.message }, { status: 500 });
  }

  const shoeRows = (shoes ?? []) as ShoeRow[];
  const shoeIds = shoeRows.map((shoe) => shoe.id);

  const { data: existingImages, error: imageError } = await supabase
    .from("shoe_images")
    .select("shoe_id, status")
    .in("shoe_id", shoeIds)
    .in("status", ["approved", "pending"]);

  if (imageError) {
    return NextResponse.json({ ok: false, error: "Failed to load image state.", detail: imageError.message }, { status: 500 });
  }

  const approvedSet = new Set<string>();
  const pendingSet = new Set<string>();

  for (const row of existingImages ?? []) {
    if (row.status === "approved") approvedSet.add(row.shoe_id);
    if (row.status === "pending") pendingSet.add(row.shoe_id);
  }

  const toProcess = shoeRows.filter((shoe) => !approvedSet.has(shoe.id) && !pendingSet.has(shoe.id));
  const skippedApproved = shoeRows.filter((shoe) => approvedSet.has(shoe.id)).length;
  const skippedPending = shoeRows.filter((shoe) => !approvedSet.has(shoe.id) && pendingSet.has(shoe.id)).length;

  if (!toProcess.length) {
    return NextResponse.json({
      ok: true,
      message: "No missing shoes found",
      summary: {
        total_checked: shoeRows.length,
        skipped: skippedApproved + skippedPending,
        skipped_approved: skippedApproved,
        skipped_pending: skippedPending,
        imported_and_approved: 0,
        failed: 0,
        failures: []
      }
    });
  }

  let importedAndApproved = 0;
  const failures: Array<{ shoe_id: string; shoe_name: string; error: string; detail?: string }> = [];

  for (const shoe of toProcess) {
    try {
      const result = await importBestShoeImage({
        supabase,
        adminStorageClient: adminClient,
        shoe,
        mode: "bulk_auto_approve",
        createdBy: user.id,
        supabaseUrl,
        bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "shoe-images"
      });

      if (result.ok) {
        importedAndApproved += 1;
      } else {
        failures.push({
          shoe_id: shoe.id,
          shoe_name: `${shoe.brand} ${shoe.shoe_name}`,
          error: result.error,
          detail: result.detail
        });
      }
    } catch (error) {
      failures.push({
        shoe_id: shoe.id,
        shoe_name: `${shoe.brand} ${shoe.shoe_name}`,
        error: "Image search failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Bulk image import completed",
    summary: {
      total_checked: shoeRows.length,
      skipped: skippedApproved + skippedPending,
      skipped_approved: skippedApproved,
      skipped_pending: skippedPending,
      imported_and_approved: importedAndApproved,
      failed: failures.length,
      failures: failures.slice(0, 20)
    }
  });
}
