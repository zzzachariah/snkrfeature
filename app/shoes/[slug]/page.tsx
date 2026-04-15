import { notFound } from "next/navigation";
import { ShoeDetailClient } from "@/components/detail/shoe-detail-client";
import { getShoeBySlug, getShoes } from "@/lib/data/shoes";

export default async function ShoeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shoe = await getShoeBySlug(slug);
  if (!shoe) return notFound();

  const related = (await getShoes()).filter((s) => s.brand === shoe.brand && s.id !== shoe.id).slice(0, 3);

  return <ShoeDetailClient shoe={shoe} related={related} />;
}
