"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ChevronDown, SearchX, X } from "lucide-react";
import { Shoe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { rankShoeMatch } from "@/lib/search/shoe-search";
import { ShoeImage } from "@/components/shoe/shoe-image";

type SortKey = "shoe_name" | "brand" | "release_year";

export function HomeTable({ shoes, initialQuery = "" }: { shoes: Shoe[]; initialQuery?: string }) {
  const { translate } = useLocale();
  const [searchDraft, setSearchDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("release_year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const scored = shoes
      .map((shoe) => ({ shoe, score: rankShoeMatch(shoe, query) }))
      .filter(({ shoe, score }) => score >= 0 && (brand === "all" || shoe.brand === brand));

    return scored
      .sort((a, b) => {
        if (query.trim() && b.score !== a.score) return b.score - a.score;

        const av = (a.shoe[sortKey] ?? "") as string | number;
        const bv = (b.shoe[sortKey] ?? "") as string | number;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      })
      .map(({ shoe }) => shoe);
  }, [query, brand, shoes, sortDir, sortKey]);

  const brands = Array.from(new Set(shoes.map((s) => s.brand)));

  function toggleSort(next: SortKey) {
    if (sortKey === next) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(next);
      setSortDir("desc");
    }
  }

  function runSearch(e?: FormEvent) {
    e?.preventDefault();
    setQuery(searchDraft);
  }

  function clearSearch() {
    setSearchDraft("");
    setQuery("");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow mb-2">{translate("The Database")}</p>
          <h2 className="t-display-sm">{translate("Every pair, indexed.")}</h2>
        </div>
        <form
          onSubmit={runSearch}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <select
              className="h-9 appearance-none rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.45)] bg-[rgb(var(--surface)/0.7)] pl-3 pr-8 text-[0.77rem] text-[rgb(var(--subtext))] outline-none transition hover:border-[rgb(var(--text)/0.35)]"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="all">{translate("All brands")}</option>
              {brands.map((b) => (
                <option key={b} data-brand-option="true">
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--subtext))]" />
          </div>
          <div className="relative">
            <Input
              placeholder={translate("Search 247 shoes…")}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-9 w-[220px] pr-9 text-[0.77rem]"
            />
            {searchDraft.trim().length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={translate("Clear search")}
                className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[rgb(var(--subtext))] transition hover:bg-[rgb(var(--muted)/0.35)] hover:text-[rgb(var(--text))]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" variant="secondary" className="h-9 px-3 text-[0.77rem]">
            {translate("Search")}
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.32)] bg-[rgb(var(--bg-elev)/0.5)]">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[60px]" />
              <col className="w-[88px]" />
              <col />
              <col className="w-[140px]" />
              <col className="w-[108px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-[rgb(var(--muted)/0.22)] bg-[rgb(var(--surface)/0.9)] text-[rgb(var(--subtext))]">
              <tr>
                <th className="px-3 py-2.5 text-center text-[0.63rem] font-medium uppercase tracking-[0.12em]">
                  {translate("Compare")}
                </th>
                <th className="px-2 py-2.5 text-center text-[0.63rem] font-medium uppercase tracking-[0.12em]">
                  {translate("Image")}
                </th>
                <th className="px-4 py-2.5 text-[0.63rem] font-medium uppercase tracking-[0.12em]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-[rgb(var(--text)/0.06)]"
                    onClick={() => toggleSort("shoe_name")}
                  >
                    {translate("Name")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-[0.63rem] font-medium uppercase tracking-[0.12em]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-[rgb(var(--text)/0.06)]"
                    onClick={() => toggleSort("brand")}
                  >
                    {translate("Brand")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-[0.63rem] font-medium uppercase tracking-[0.12em]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-[rgb(var(--text)/0.06)]"
                    onClick={() => toggleSort("release_year")}
                  >
                    {translate("Release")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center soft-text">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                      <SearchX className="h-5 w-5" />
                      <p>{translate("No sneakers match this search.")}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchDraft("");
                          setQuery("");
                          setBrand("all");
                        }}
                        className="text-xs text-[rgb(var(--text))] underline-offset-2 hover:underline"
                      >
                        {translate("Clear filters")}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((shoe, i) => (
                <motion.tr
                  key={shoe.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.012, ease: [0.22, 1, 0.36, 1] }}
                  className="border-t border-[rgb(var(--muted)/0.15)] transition hover:bg-[rgb(var(--text)/0.035)]"
                >
                  <td className="px-3 py-3 text-center align-middle">
                    <input
                      className="h-4 w-4 accent-[rgb(var(--text))]"
                      type="checkbox"
                      checked={selected.includes(shoe.id)}
                      onChange={(e) =>
                        setSelected((p) =>
                          e.target.checked ? [...p, shoe.id] : p.filter((id) => id !== shoe.id)
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-3 text-center align-middle">
                    <ShoeImage
                      src={shoe.image_url}
                      alt={shoe.shoe_name}
                      fallbackLabel={translate("No image")}
                      variant="thumbnail"
                    />
                  </td>
                  <td data-field-key="shoe_name" className="px-4 py-3">
                    <Link
                      href={`/shoes/${shoe.slug}`}
                      className="font-semibold tracking-[-0.01em] transition hover:opacity-80"
                    >
                      {shoe.shoe_name}
                    </Link>
                  </td>
                  <td data-field-key="brand" className="px-4 py-3 text-[0.78rem] soft-text">
                    {shoe.brand}
                  </td>
                  <td className="px-4 py-3 text-[0.78rem] soft-text">{shoe.release_year ?? "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-center text-[0.72rem] tracking-[0.02em] soft-text">
        {translate("Showing")} {filtered.length} {translate("of")} {shoes.length}
      </p>
      {selected.length > 1 && (
        <div className="sticky bottom-4 flex flex-col gap-2 rounded-xl border border-[rgb(var(--text)/0.35)] bg-[rgb(var(--bg-elev)/0.92)] p-3 shadow-lift backdrop-blur-[20px] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            {selected.length} {translate("shoes selected for compare")}
          </p>
          <Link href={`/compare?ids=${selected.join(",")}`} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">{translate("Compare now")}</Button>
          </Link>
        </div>
      )}
    </section>
  );
}
