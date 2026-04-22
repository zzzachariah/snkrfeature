import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { saveComparisonSchema, deleteComparisonSchema } from "@/lib/validation/schemas";

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op in route handler
      }
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = saveComparisonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 400 });

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Authentication required to save a comparison." }, { status: 401 });

  const { data: shoeRows, error: shoeError } = await supabase
    .from("shoes")
    .select("id")
    .in("id", parsed.data.shoeIds);
  if (shoeError) return NextResponse.json({ ok: false, message: shoeError.message }, { status: 400 });
  if ((shoeRows ?? []).length !== parsed.data.shoeIds.length) {
    return NextResponse.json({ ok: false, message: "One or more shoes could not be found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("saved_comparisons")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      shoe_ids: parsed.data.shoeIds
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: data.id, message: "Compare saved." });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = deleteComparisonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const supabase = await getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, message: "Database is not configured." }, { status: 400 });

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });

  const { error } = await supabase
    .from("saved_comparisons")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, message: "Compare deleted." });
}
