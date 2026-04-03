import { createClient } from "@/lib/supabase/server";
import { demoShoes } from "@/lib/data/demo-shoes";
import { Shoe, ShoeSpec } from "@/lib/types";

type ShoeRow = Omit<Shoe, "spec"> & { shoe_specs: ShoeSpec[] | null };

export async function getShoes(): Promise<Shoe[]> {
  const supabase = await createClient();
  if (!supabase) return demoShoes;

  const { data, error } = await supabase
    .from("shoes")
    .select("*, shoe_specs(*)")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return demoShoes;

  const rows = data as ShoeRow[];
  return rows.map((row) => ({ ...row, spec: row.shoe_specs?.[0] ?? {} }));
}

export async function getShoeBySlug(slug: string): Promise<Shoe | null> {
  const shoes = await getShoes();
  return shoes.find((s) => s.slug === slug) ?? null;
}
