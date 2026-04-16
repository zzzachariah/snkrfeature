import { ComparePageClient } from "@/components/compare/compare-page-client";
import { getShoes } from "@/lib/data/shoes";
import { normalizeSearchText, rankShoeMatch } from "@/lib/search/shoe-search";

export default async function ComparePage({
  searchParams
}: {
  searchParams: Promise<{ ids?: string; q?: string; brand?: string; category?: string; player?: string; tech?: string; showAdd?: string }>;
}) {
  const { ids, q: rawQ, brand: rawBrand, category: rawCategory, player: rawPlayer, tech: rawTech, showAdd } = await searchParams;
  const shoes = await getShoes();

  const selectedIds = Array.from(new Set(ids?.split(",").filter(Boolean) ?? []));
  const shoesById = new Map(shoes.map((shoe) => [shoe.id, shoe]));
  const selected = selectedIds
    .map((id) => shoesById.get(id))
    .filter((shoe): shoe is NonNullable<typeof shoe> => Boolean(shoe));
  const selectedSet = new Set(selected.map((shoe) => shoe.id));

  const q = rawQ ?? "";
  const brand = normalizeSearchText(rawBrand);
  const category = normalizeSearchText(rawCategory);
  const player = rawPlayer ?? "";
  const tech = rawTech ?? "";

  const brands = Array.from(new Set(shoes.map((s) => s.brand).filter(Boolean))).sort();
  const categories = Array.from(new Set(shoes.map((s) => s.category).filter(Boolean) as string[])).sort();

  const searchResults = shoes
    .map((shoe) => ({ shoe, score: rankShoeMatch(shoe, q) }))
    .filter(({ shoe, score }) => {
      if (selectedSet.has(shoe.id)) return false;

      const techText = `${shoe.spec.forefoot_midsole_tech ?? ""} ${shoe.spec.heel_midsole_tech ?? ""} ${shoe.spec.upper_tech ?? ""} ${shoe.spec.outsole_tech ?? ""} ${(shoe.spec.tags ?? []).join(" ")}`;

      if (score < 0) return false;
      if (brand && normalizeSearchText(shoe.brand) !== brand) return false;
      if (category && normalizeSearchText(shoe.category) !== category) return false;
      if (player && !normalizeSearchText(shoe.player).includes(normalizeSearchText(player))) return false;
      if (tech && !normalizeSearchText(techText).includes(normalizeSearchText(tech))) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .map(({ shoe }) => shoe);

  const shouldShowAddPanel = showAdd === "1" || Boolean(q || brand || category || player || tech) || selected.length === 0;

  return (
    <ComparePageClient
      selected={selected}
      searchResults={searchResults}
      rawQ={rawQ}
      rawBrand={rawBrand}
      rawCategory={rawCategory}
      rawPlayer={rawPlayer}
      rawTech={rawTech}
      brands={brands}
      categories={categories}
      shouldShowAddPanel={shouldShowAddPanel}
    />
  );
}
