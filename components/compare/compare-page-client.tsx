"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { CompareMatrix } from "@/components/compare/compare-matrix";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shoe } from "@/lib/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";

type Props = {
  selected: Shoe[];
  searchResults: Shoe[];
  rawQ?: string;
  rawBrand?: string;
  rawCategory?: string;
  rawPlayer?: string;
  rawTech?: string;
  brands: string[];
  categories: string[];
  shouldShowAddPanel: boolean;
};

export function ComparePageClient({
  selected,
  searchResults,
  rawQ,
  rawBrand,
  rawCategory,
  rawPlayer,
  rawTech,
  brands,
  categories,
  shouldShowAddPanel
}: Props) {
  const { translate } = useLocale();
  const hasActiveSearch = Boolean(rawQ || rawBrand || rawCategory || rawPlayer || rawTech);

  const displayedSuggestions = useMemo(() => {
    if (hasActiveSearch) return searchResults.slice(0, 18);
    const shuffled = [...searchResults].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [hasActiveSearch, searchResults]);

  function buildCompareHref(nextId: string) {
    return `/compare?ids=${Array.from(new Set([...selected.map((shoe) => shoe.id), nextId])).join(",")}`;
  }

  return (
    <main className="container-shell space-y-6 py-8">
      <section className="surface-card premium-border rounded-3xl p-6">
        <h1 className="text-3xl font-semibold">{translate("Compare sneakers")}</h1>
        <p className="mt-2 text-sm soft-text">{translate("Share this comparison via URL query params:")} <code>?ids=1,2,3</code></p>
      </section>

      <section className="surface-card premium-border rounded-3xl p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{translate("Search to add")}</h2>
            <p className="mt-1 text-sm soft-text">{translate("Find more shoes by keyword and filters, then add them directly to this comparison.")}</p>
          </div>
          <Link href={`/compare?ids=${selected.map((s) => s.id).join(",")}&showAdd=${shouldShowAddPanel ? "0" : "1"}`} className="w-full md:w-auto">
            <Button variant={shouldShowAddPanel ? "secondary" : "primary"} className="inline-flex w-full items-center justify-center gap-1.5 md:w-auto">
              <Search className="h-4 w-4" />
              {shouldShowAddPanel ? translate("Hide search") : translate("Open search")}
            </Button>
          </Link>
        </div>

        {shouldShowAddPanel && (
          <div className="mt-4 space-y-4">
            <form action="/compare" method="GET" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input type="hidden" name="ids" value={selected.map((s) => s.id).join(",")} />
              <input type="hidden" name="showAdd" value="1" />
              <div className="md:col-span-2 xl:col-span-5">
                <label className="mb-1 block text-xs soft-text">{translate("Keywords")}</label>
                <Input name="q" defaultValue={rawQ ?? ""} placeholder={translate("Name, tags, tech, notes...")} />
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">{translate("Brand")}</label>
                <select name="brand" defaultValue={rawBrand ?? ""} className="w-full rounded-xl border border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.95)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--ring)/0.4)] focus:border-[rgb(var(--ring)/0.85)] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring)/0.18)]">
                  <option value="">{translate("All brands")}</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">{translate("Category")}</label>
                <select name="category" defaultValue={rawCategory ?? ""} className="w-full rounded-xl border border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.95)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--ring)/0.4)] focus:border-[rgb(var(--ring)/0.85)] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring)/0.18)]">
                  <option value="">{translate("All categories")}</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">{translate("Player")}</label>
                <Input name="player" defaultValue={rawPlayer ?? ""} placeholder={translate("e.g. LeBron")} />
              </div>
              <div>
                <label className="mb-1 block text-xs soft-text">{translate("Tech")}</label>
                <Input name="tech" defaultValue={rawTech ?? ""} placeholder={translate("e.g. Zoom, plate")} />
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
                <Button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"><Search className="h-4 w-4" /> {translate("Search")}</Button>
                <Link href={`/compare?ids=${selected.map((s) => s.id).join(",")}&showAdd=1`} className="w-full sm:w-auto">
                  <Button type="button" variant="secondary" className="w-full sm:w-auto">{translate("Reset")}</Button>
                </Link>
              </div>
            </form>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {displayedSuggestions.map((shoe) => (
                <Card key={shoe.id} className="p-4">
                  <p className="text-xs soft-text">
                    {shoe.brand}
                    {shoe.category ? (
                      <>
                        {" • "}
                        <DynamicTranslatedText as="span" text={shoe.category} contentType="descriptive" />
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 font-semibold">{shoe.shoe_name}</p>
                  <p className="mt-1 text-xs soft-text">{shoe.player ?? translate("No player tag")}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(shoe.spec.tags ?? []).slice(0, 2).map((tag) => (
                      <Badge key={tag}>
                        <DynamicTranslatedText as="span" text={tag} contentType="descriptive" />
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <a
                      href={buildCompareHref(shoe.id)}
                      className="interactive-soft inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--accent)/0.4)] bg-[rgb(var(--accent)/0.9)] px-3 py-1.5 text-xs font-medium text-white shadow-[0_10px_24px_rgb(var(--accent)/0.28)] transition hover:bg-[rgb(var(--accent))]"
                    >
                      <Plus className="h-3.5 w-3.5" /> {translate("Add to compare")}
                    </a>
                  </div>
                </Card>
              ))}
            </div>
            {displayedSuggestions.length === 0 && (
              <Card className="p-5 text-center">
                <p className="font-medium">{translate("No shoes found")}</p>
                <p className="mt-1 text-xs soft-text">{translate("Try broader keywords or remove one filter.")}</p>
              </Card>
            )}
          </div>
        )}
      </section>
      <CompareMatrix shoes={selected} />
    </main>
  );
}
