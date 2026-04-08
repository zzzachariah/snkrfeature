"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, SearchX } from "lucide-react";
import { Shoe } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SortKey = "shoe_name" | "brand" | "release_year";

export function HomeTable({ shoes, initialQuery = "" }: { shoes: Shoe[]; initialQuery?: string }) {
  const [searchDraft, setSearchDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("release_year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const base = shoes.filter((s) => {
      const term = `${s.shoe_name} ${s.brand} ${s.player ?? ""} ${(s.spec.tags ?? []).join(" ")} ${s.spec.forefoot_midsole_tech ?? ""} ${s.spec.upper_tech ?? ""}`.toLowerCase();
      return term.includes(query.toLowerCase()) && (brand === "all" || s.brand === brand);
    });

    return base.sort((a, b) => {
      const av = (a[sortKey] ?? "") as string | number;
      const bv = (b[sortKey] ?? "") as string | number;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
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

  return (
    <section className="space-y-4">
      <form className="flex flex-col gap-3 md:flex-row" onSubmit={runSearch}>
        <Input placeholder="Search by name, player, tags, technologies..." value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
        <select className="rounded-xl border border-[rgb(var(--glass-stroke-soft)/0.58)] bg-[rgb(var(--glass-bg)/0.97)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--accent)/0.4)] focus:border-[rgb(var(--ring)/0.85)] focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring)/0.18)]" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">All brands</option>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <Button type="submit" variant="secondary" className="w-full md:w-auto">Search</Button>
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
                  <td className="px-4 py-3"><Link href={`/shoes/${shoe.slug}`} className="font-medium transition">{shoe.shoe_name}</Link></td>
                  <td className="px-4 py-3">{shoe.brand}</td>
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
