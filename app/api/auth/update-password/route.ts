import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const currentPassword = body?.currentPassword as string;
  const newPassword = body?.newPassword as string;
  const confirmPassword = body?.confirmPassword as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ ok: false, message: "All password fields are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ ok: false, message: "New password must be at least 8 characters." }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ ok: false, message: "New password and confirmation must match." }, { status: 400 });
  }

  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 400 });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 400 });

  const verifyClient = createSupabaseClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (verifyError) {
    return NextResponse.json({ ok: false, message: "Current password is incorrect." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ ok: false, message: "Service role key is not configured." }, { status: 400 });

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword
  });

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}
