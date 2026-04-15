"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, SearchX, X } from "lucide-react";
import { Shoe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { Input } from "@/components/ui/input";
import { rankShoeMatch } from "@/lib/search/shoe-search";

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
    <section className="space-y-4">
      <form onSubmit={runSearch}>
        <div className="flex w-full items-center overflow-hidden rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.58)] bg-[rgb(var(--glass-bg)/0.97)]">
          <select
            className="h-11 w-[9.25rem] border-r border-[rgb(var(--glass-stroke-soft)/0.58)] bg-transparent px-3 text-sm text-[rgb(var(--text))] outline-none transition hover:bg-[rgb(var(--accent)/0.05)] focus:bg-[rgb(var(--accent)/0.06)]"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="all">All brands</option>
            {brands.map((b) => <option key={b} data-brand-option="true">{b}</option>)}
          </select>

          <div className="relative min-w-0 flex-1">
            <Input
              placeholder={translate("Search by name, player, tags, technologies...")}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-11 rounded-none border-0 bg-transparent pr-10 focus:ring-0"
            />
            {searchDraft.trim().length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[rgb(var(--subtext))] transition hover:bg-[rgb(var(--muted)/0.32)] hover:text-[rgb(var(--text))]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center border-l border-[rgb(var(--glass-stroke-soft)/0.58)] bg-[rgb(var(--accent)/0.12)] px-4 text-sm font-medium text-[rgb(var(--text))] transition hover:bg-[rgb(var(--accent)/0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring)/0.5)]"
          >
            Search
          </button>
        </div>
      </form>
      <div className="surface-card liquid-interactive overflow-hidden rounded-3xl premium-border">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[rgb(var(--glass-bg-strong)/0.98)] text-[rgb(var(--subtext))]">
              <tr>
                <th className="px-4 py-3">Compare</th>
                <th className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-[rgb(var(--muted)/0.3)]" onClick={() => toggleSort("shoe_name")}>Name<ArrowUpDown className="h-3 w-3" /></button></th>
                <th className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-[rgb(var(--muted)/0.3)]" onClick={() => toggleSort("brand")}>Brand<ArrowUpDown className="h-3 w-3" /></button></th>
                <th className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-[rgb(var(--muted)/0.3)]" onClick={() => toggleSort("release_year")}>Release<ArrowUpDown className="h-3 w-3" /></button></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center soft-text">
                    <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                      <SearchX className="h-5 w-5" />
                      <p>No sneakers match this search.</p>
                      <button type="button" onClick={() => { setSearchDraft(""); setQuery(""); setBrand("all"); }} className="text-xs text-[rgb(var(--accent))]">Clear filters</button>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((shoe, i) => (
                <motion.tr
                  key={shoe.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="border-t border-[rgb(var(--glass-stroke-soft)/0.35)] odd:bg-[rgb(var(--glass-bg-strong)/0.5)] transition hover:bg-[rgb(var(--accent)/0.08)]"
                >
                  <td className="px-4 py-3 align-middle"><input className="h-4 w-4 accent-[rgb(var(--accent))]" type="checkbox" checked={selected.includes(shoe.id)} onChange={(e) => setSelected((p) => e.target.checked ? [...p, shoe.id] : p.filter((id) => id !== shoe.id))} /></td>
                  <td data-field-key="shoe_name" className="px-4 py-3"><Link href={`/shoes/${shoe.slug}`} className="font-medium transition">{shoe.shoe_name}</Link></td>
                  <td data-field-key="brand" className="px-4 py-3">{shoe.brand}</td>
                  <td className="px-4 py-3">{shoe.release_year ?? "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected.length > 1 && (
        <div className="sticky bottom-4 flex flex-col gap-2 rounded-2xl border border-[rgb(var(--accent)/0.38)] bg-[rgb(var(--accent)/0.12)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">{selected.length} shoes selected for compare</p>
          <Link href={`/compare?ids=${selected.join(",")}`} className="w-full sm:w-auto"><Button className="w-full sm:w-auto">Compare now</Button></Link>
        </div>
      )}
    </section>
  );
}
