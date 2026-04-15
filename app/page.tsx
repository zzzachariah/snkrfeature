import { HomeTable } from "@/components/home/home-table";
import { HomeHero } from "@/components/home/home-hero";
import { getShoes } from "@/lib/data/shoes";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const shoes = await getShoes();
  const brands = new Set(shoes.map((s) => s.brand)).size;

  return (
    <main className="container-shell space-y-8 py-8">
      <HomeHero shoesCount={shoes.length} brandsCount={brands} />

      <HomeTable shoes={shoes} initialQuery={q ?? ""} />
    </main>
  );
}
