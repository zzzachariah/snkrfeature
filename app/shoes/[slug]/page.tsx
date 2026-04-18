import { notFound } from "next/navigation";
import { ShoeDetailClient } from "@/components/detail/shoe-detail-client";
import { getShoeBySlug, getShoeImageState, getShoes } from "@/lib/data/shoes";
import { createClient } from "@/lib/supabase/server";

export default async function ShoeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shoe = await getShoeBySlug(slug);
  if (!shoe) return notFound();
  const supabase = await createClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } = user ? await supabase!.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = profile?.role === "admin";
  const imageState = await getShoeImageState(shoe.id, isAdmin);

  const related = (await getShoes()).filter((s) => s.brand === shoe.brand && s.id !== shoe.id).slice(0, 3);

  return <ShoeDetailClient shoe={shoe} related={related} isAdmin={isAdmin} imageState={imageState} />;
}
