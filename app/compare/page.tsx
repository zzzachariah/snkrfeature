import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { CompareMatrix } from "@/components/compare/compare-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getShoes } from "@/lib/data/shoes";

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export default async function ComparePage({
  searchParams
}: {
  searchParams: Promise<{ ids?: string; q?: string; brand?: string; category?: string; player?: string; tech?: string; showAdd?: string }>;
}) {
  const { ids, q: rawQ, brand: rawBrand, category: rawCategory, player: rawPlayer, tech: rawTech, showAdd } = await searchParams;
  const shoes = await getShoes();
  const selectedIds = ids?.split(",").filter(Boolean) ?? [];
  const selected = selectedIds.length ? shoes.filter((s) => selectedIds.includes(s.id)) : shoes.slice(0, 2);
  const selectedSet = new Set(selected.map((shoe) => shoe.id));

  const q = normalize(rawQ);
  const brand = normalize(rawBrand);
  const category = normalize(rawCategory);
  const player = normalize(rawPlayer);
  const tech = normalize(rawTech);

  const brands = Array.from(new Set(shoes.map((s) => s.brand).filter(Boolean))).sort();
  const categories = Array.from(new Set(shoes.map((s) => s.category).filter(Boolean) as string[])).sort();

  const searchResults = shoes.filter((shoe) => {
    if (selectedSet.has(shoe.id)) return false;

    const fullText = `${shoe.shoe_name} ${shoe.brand} ${shoe.player ?? ""} ${shoe.category ?? ""} ${(shoe.spec.tags ?? []).join(" ")} ${shoe.spec.forefoot_midsole_tech ?? ""} ${shoe.spec.heel_midsole_tech ?? ""} ${shoe.spec.upper_tech ?? ""} ${shoe.spec.outsole_tech ?? ""}`.toLowerCase();
    const techText = `${shoe.spec.forefoot_midsole_tech ?? ""} ${shoe.spec.heel_midsole_tech ?? ""} ${shoe.spec.upper_tech ?? ""} ${shoe.spec.outsole_tech ?? ""} ${(shoe.spec.tags ?? []).join(" ")}`.toLowerCase();

    if (q && !fullText.includes(q)) return false;
    if (brand && shoe.brand.toLowerCase() !== brand) return false;
    if (category && (shoe.category ?? "").toLowerCase() !== category) return false;
    if (player && !(shoe.player ?? "").toLowerCase().includes(player)) return false;
    if (tech && !techText.includes(tech)) return false;
    return true;
  });

  const shouldShowAddPanel = showAdd === "1" || Boolean(q || brand || category || player || tech);

  function buildCompareHref(nextId: string) {
    return `/compare?ids=${Array.from(new Set([...selected.map((shoe) => shoe.id), nextId])).join(",")}`;
  }

  return (
    <main className="container-shell space-y-6 py-8">
      <section className="surface-card premium-border rounded-3xl p-6">
        <h1 className="text-3xl font-semibold">Compare sneakers</h1>
        <p className="mt-2 text-sm soft-text">Share this comparison via URL query params: <code>?ids=1,2,3</code></p>
      </section>

      <section className="surface-card premium-border rounded-3xl p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Search to add</h2>
            <p className="mt-1 text-sm soft-text">Find more shoes by keyword and filters, then add them directly to this comparison.</p>
          </div>
          <Link href={`/compare?ids=${selected.map((s) => s.id).join(",")}&showAdd=${shouldShowAddPanel ? "0" : "1"}`} className="w-full md:w-auto">
            <Button variant={shouldShowAddPanel ? "secondary" : "primary"} className="inline-flex w-full items-center justify-center gap-1.5 md:w-auto">
              <Search className="h-4 w-4" />
              {shouldShowAddPanel ? "Hide search" : "Open search"}
            </Button>
          </Link>
        </div>

        {shouldShowAddPanel && (
          <div className="mt-4 space-y-4">
            <form action="/compare" method="GET" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input type="hidden" name="ids" value={selected.map((s) => s.id).join(",")} />
              <input type="hidden" name="showAdd" value="1" />
              <div className="md:col-span-2 xl:col-span-5">
                <label className="mb-1 block text-xs soft-text">Keywords</label>
                <Input name="q" defaultValue={rawQ ?? ""} placeholder="Name, tags, tech, notes..." />
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">Brand</label>
                <select name="brand" defaultValue={rawBrand ?? ""} className="w-full rounded-xl border border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.95)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--ring)/0.4)] focus:border-[rgb(var(--ring)/0.85)] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring)/0.18)]">
                  <option value="">All brands</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">Category</label>
                <select name="category" defaultValue={rawCategory ?? ""} className="w-full rounded-xl border border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.95)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--ring)/0.4)] focus:border-[rgb(var(--ring)/0.85)] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring)/0.18)]">
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">Player</label>
                <Input name="player" defaultValue={rawPlayer ?? ""} placeholder="e.g. LeBron" />
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">Tech</label>
                <Input name="tech" defaultValue={rawTech ?? ""} placeholder="e.g. Zoom, plate" />
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
                <Button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"><Search className="h-4 w-4" /> Search</Button>
                <Link href={`/compare?ids=${selected.map((s) => s.id).join(",")}&showAdd=1`} className="w-full sm:w-auto">
                  <Button type="button" variant="secondary" className="w-full sm:w-auto">Reset</Button>
                </Link>
              </div>
            </form>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {searchResults.slice(0, 18).map((shoe) => (
                <Card key={shoe.id} className="p-4">
                  <p className="text-xs soft-text">{shoe.brand}{shoe.category ? ` • ${shoe.category}` : ""}</p>
                  <p className="mt-1 font-semibold">{shoe.shoe_name}</p>
                  <p className="mt-1 text-xs soft-text">{shoe.player ?? "No player tag"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(shoe.spec.tags ?? []).slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                  </div>
                  <div className="mt-4">
                    <a
                      href={buildCompareHref(shoe.id)}
                      className="interactive-soft inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--accent)/0.4)] bg-[rgb(var(--accent)/0.9)] px-3 py-1.5 text-xs font-medium text-white shadow-[0_10px_24px_rgb(var(--accent)/0.28)] transition hover:bg-[rgb(var(--accent))]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add to compare
                    </a>
                  </div>
                </Card>
              ))}
            </div>
            {searchResults.length === 0 && (
              <Card className="p-5 text-center">
                <p className="font-medium">No shoes found</p>
                <p className="mt-1 text-xs soft-text">Try broader keywords or remove one filter.</p>
              </Card>
            )}
          </div>
        )}
      </section>
      <CompareMatrix shoes={selected} />
    </main>
  );
}
