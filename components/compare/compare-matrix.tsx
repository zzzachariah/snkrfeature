"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Shoe } from "@/lib/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";

const fields: Array<{ key: string; label: string; get: (s: Shoe) => string }> = [
  { key: "name", label: "Name", get: (s) => s.shoe_name },
  { key: "brand", label: "Brand", get: (s) => s.brand },
  { key: "release", label: "Release Year", get: (s) => String(s.release_year ?? "Not yet added") },
  { key: "category", label: "Category", get: (s) => s.category ?? "Not yet added" },
  { key: "forefoot", label: "Forefoot Midsole", get: (s) => s.spec.forefoot_midsole_tech ?? "Not yet added" },
  { key: "heel", label: "Heel Midsole", get: (s) => s.spec.heel_midsole_tech ?? "Not yet added" },
  { key: "outsole", label: "Outsole", get: (s) => s.spec.outsole_tech ?? "Not yet added" },
  { key: "upper", label: "Upper", get: (s) => s.spec.upper_tech ?? "Not yet added" },
  { key: "cushion", label: "Cushioning", get: (s) => s.spec.cushioning_feel ?? "Not yet added" },
  { key: "traction", label: "Traction", get: (s) => s.spec.traction ?? "Not yet added" },
  { key: "stability", label: "Stability", get: (s) => s.spec.stability ?? "Not yet added" },
  { key: "fit", label: "Fit", get: (s) => s.spec.fit ?? "Not yet added" }
];

export function CompareMatrix({ shoes: initialShoes }: { shoes: Shoe[] }) {
  const { translate } = useLocale();
  const [highlightDiffs, setHighlightDiffs] = useState(false);
  const [shoes, setShoes] = useState(initialShoes);

  const fieldDiffMap = useMemo(() => {
    return new Map(fields.map((field) => [field.key, new Set(shoes.map((shoe) => field.get(shoe))).size > 1]));
  }, [shoes]);

  const shownFields = useMemo(() => {
    return fields.map((field) => ({ ...field, differs: fieldDiffMap.get(field.key) ?? false }));
  }, [fieldDiffMap]);

  if (!shoes.length) return <p className="rounded-2xl border border-dashed border-[rgb(var(--muted)/0.7)] p-8 soft-text">{translate("No shoes selected. Add IDs via the URL query string.")}</p>;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setHighlightDiffs((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
          highlightDiffs
            ? "border-[rgb(var(--ring)/0.55)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text))] shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.18)]"
            : "border-[rgb(var(--muted)/0.5)] bg-[rgb(var(--bg-elev)/0.55)] soft-text hover:border-[rgb(var(--ring)/0.35)]"
        }`}
      >
        <span className={`h-2 w-2 rounded-full transition ${highlightDiffs ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--muted))]"}`} />
        {translate("Highlight differences")}
      </button>
      <div className="overflow-auto rounded-3xl border border-[rgb(var(--muted)/0.5)] bg-[rgb(var(--bg-elev)/0.72)]">
        <table className="w-full min-w-[1040px] text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-64 bg-[rgb(var(--bg-elev)/0.98)] px-4 py-3 text-left">{translate("Field")}</th>
              {shoes.map((s) => (
                <th key={s.id} data-field-key="shoe_name" className="sticky top-0 z-20 bg-[rgb(var(--bg-elev)/0.98)] px-4 py-3 text-left align-top">
                  <div className="flex items-start justify-between gap-2">
                    <div><p data-field-key="shoe_name" className="font-medium text-[rgb(var(--text))]">{s.shoe_name}</p><p data-field-key="brand" className="text-xs soft-text">{s.brand}</p></div>
                    <button onClick={() => setShoes((prev) => prev.filter((p) => p.id !== s.id))} className="rounded-md border border-[rgb(var(--muted)/0.6)] p-1 soft-text transition hover:border-[rgb(var(--ring)/0.45)]"><X className="h-3 w-3" /></button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownFields.map((f, i) => (
              <tr key={f.key} data-field-key={f.key === "name" ? "shoe_name" : f.key === "forefoot" ? "forefoot_midsole_tech" : f.key === "heel" ? "heel_midsole_tech" : f.key === "outsole" ? "outsole_tech" : f.key} className={`group border-t border-[rgb(var(--muted)/0.45)] transition hover:bg-[rgb(var(--accent)/0.05)] ${i % 2 === 0 ? "bg-[rgb(var(--bg-elev)/0.18)]" : ""}`}>
                <td className={`sticky left-0 bg-[rgb(var(--surface)/0.96)] px-4 py-3 font-medium ${highlightDiffs && f.differs ? "text-[rgb(var(--text))]" : ""}`}>{translate(f.label)}</td>
                {shoes.map((s) => {
                  const value = f.get(s);
                  const contentType = f.key === "brand"
                    ? "brand"
                    : f.key === "name"
                    ? "shoe_name"
                    : f.key === "forefoot" || f.key === "heel" || f.key === "outsole" || f.key === "upper"
                    ? "technology"
                    : "descriptive";
                  const shouldKeepRaw = f.key === "forefoot" || f.key === "heel";
                  return (
                  <td
                    key={`${f.key}-${s.id}`}
                    className={`px-4 py-3 soft-text transition ${
                      highlightDiffs && f.differs
                        ? "bg-[rgb(var(--accent)/0.09)] text-[rgb(var(--text))] shadow-[inset_0_0_0_1px_rgb(var(--ring)/0.24)]"
                        : ""
                    }`}
                  >
                    {shouldKeepRaw ? value : (
                      <DynamicTranslatedText
                        text={value}
                        contentType={contentType}
                      />
                    )}
                  </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
