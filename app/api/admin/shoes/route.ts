import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if ("error" in auth) return auth.error;

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const brand = searchParams.get("brand") ?? "all";
  const state = searchParams.get("state") ?? "all";

  let query = supabase
    .from("shoes")
    .select("id, slug, brand, shoe_name, release_year, is_published, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (brand !== "all") query = query.eq("brand", brand);
  if (state === "published") query = query.eq("is_published", true);
  if (state === "unpublished") query = query.eq("is_published", false);
  if (q) query = query.or(`shoe_name.ilike.%${q}%,brand.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, shoes: data ?? [] });
}
