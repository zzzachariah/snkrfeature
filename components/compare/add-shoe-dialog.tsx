"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shoe } from "@/lib/types";
import { ShoeImage } from "@/components/shoe/shoe-image";
import { normalizeSearchText, rankShoeMatch } from "@/lib/search/shoe-search";
import { useLocale } from "@/components/i18n/locale-provider";
import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";

const MAX_RESULTS = 20;

type Props = {
  open: boolean;
  onClose: () => void;
  shoes: Shoe[];
  selectedIds: Set<string>;
  onPick: (id: string) => void;
};

export function AddShoeDialog({ open, onClose, shoes, selectedIds, onPick }: Props) {
  const { translate } = useLocale();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const brands = useMemo(() => Array.from(new Set(shoes.map((s) => s.brand).filter(Boolean))).sort(), [shoes]);
  const categories = useMemo(
    () => Array.from(new Set(shoes.map((s) => s.category).filter(Boolean) as string[])).sort(),
    [shoes]
  );

  const normBrand = normalizeSearchText(brand);
  const normCategory = normalizeSearchText(category);

  const results = useMemo(() => {
    return shoes
      .filter((shoe) => !selectedIds.has(shoe.id))
      .map((shoe) => ({ shoe, score: rankShoeMatch(shoe, query) }))
      .filter(({ shoe, score }) => {
        if (query && score < 0) return false;
        if (normBrand && normalizeSearchText(shoe.brand) !== normBrand) return false;
        if (normCategory && normalizeSearchText(shoe.category) !== normCategory) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((entry) => entry.shoe);
  }, [shoes, selectedIds, query, normBrand, normCategory]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgb(var(--glass-overlay)/0.55)] p-4 md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        className="surface-card premium-border w-full max-w-2xl overflow-hidden rounded-3xl shadow-[0_30px_72px_rgb(var(--glass-shadow)/0.42)]"
        onClick={(e) => e.stopPropagation()}
      >
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div>
                <p className="t-eyebrow">{translate("Add to compare")}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{translate("Pick a shoe")}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[rgb(var(--muted)/0.5)] p-2 soft-text transition hover:border-[rgb(var(--text)/0.45)] hover:text-[rgb(var(--text))]"
                aria-label={translate("Close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 px-6 pt-4 md:grid-cols-[1fr_160px_160px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 soft-text" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={translate("Name, tags, tech…")}
                  className="pl-9"
                  autoFocus
                />
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.55)] bg-[rgb(var(--surface)/0.7)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--text)/0.35)] focus:border-[rgb(var(--text)/0.5)] focus:outline-none"
              >
                <option value="">{translate("All brands")}</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[rgb(var(--glass-stroke-soft)/0.55)] bg-[rgb(var(--surface)/0.7)] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:border-[rgb(var(--text)/0.35)] focus:border-[rgb(var(--text)/0.5)] focus:outline-none"
              >
                <option value="">{translate("All categories")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto px-6 pb-6">
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[rgb(var(--muted)/0.55)] bg-[rgb(var(--bg-elev)/0.35)] py-8 text-center">
                  <p className="text-sm font-medium">{translate("No shoes found")}</p>
                  <p className="mt-1 text-xs soft-text">
                    {translate("Try broader keywords or remove one filter.")}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[rgb(var(--muted)/0.18)]">
                  {results.map((shoe) => (
                    <li key={shoe.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onPick(shoe.id);
                        }}
                        className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-[rgb(var(--surface)/0.4)]"
                      >
                        <ShoeImage
                          src={shoe.image_url}
                          alt={shoe.shoe_name}
                          fallbackLabel={translate("No image")}
                          variant="suggestion"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="t-eyebrow">
                            {shoe.brand}
                            {shoe.category ? (
                              <>
                                {" · "}
                                <DynamicTranslatedText as="span" text={shoe.category} contentType="descriptive" />
                              </>
                            ) : null}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold tracking-[-0.01em]">{shoe.shoe_name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(shoe.spec.tags ?? []).slice(0, 3).map((tag) => (
                              <Badge key={tag}>
                                <DynamicTranslatedText as="span" text={tag} contentType="descriptive" />
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg border border-[rgb(var(--muted)/0.5)] bg-[rgb(var(--surface)/0.6)] p-2 soft-text transition group-hover:border-[rgb(var(--text)/0.45)] group-hover:text-[rgb(var(--text))]">
                          <Plus className="h-4 w-4" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
      </div>
    </div>,
    document.body
  );
}
