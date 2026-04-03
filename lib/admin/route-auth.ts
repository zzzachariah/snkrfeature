import { NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/admin/route-supabase";

export async function requireAdminApi() {
  const supabase = await createRouteSupabase();
  if (!supabase) {
    return { error: NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 }) };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ ok: false, message: "Admin authentication required." }, { status: 401 }) };
  }

  const { data: profile } = await supabase.from("profiles").select("username, role").eq("id", user.id).maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ ok: false, message: "No such admin account." }, { status: 403 }) };
  }

  return {
    supabase,
    user,
    profile: { username: profile.username, role: profile.role as "admin" }
  };
}