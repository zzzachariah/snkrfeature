"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Shoe } from "@/lib/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";
import { SPEC_ROWS } from "@/components/compare/compare-metrics";

const EMPTY_LABEL = "—";

type Props = {
  shoes: Shoe[];
};

export function CompareSpecTable({ shoes }: Props) {
  const { translate } = useLocale();
  const [open, setOpen] = useState(false);

  if (!shoes.length) return null;

  const rows = SPEC_ROWS.map((row) => {
    const values = shoes.map((shoe) => row.get(shoe));
    const distinct = new Set(values.map((v) => (v ?? "").trim().toLowerCase()));
    return { ...row, values, differs: distinct.size > 1 };
  });

  return (
    <div className="rounded-2xl border border-[rgb(var(--glass-stroke-soft)/0.3)] bg-[rgb(var(--bg-elev)/0.45)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl bg-[rgb(var(--surface)/0.75)] px-6 py-4 transition hover:bg-[rgb(var(--surface))]"
        aria-expanded={open}
      >
        <p className="t-eyebrow">{translate("Tech Specifications")}</p>
        <ChevronDown className={`h-4 w-4 soft-text transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="spec"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {shoes.length === 2 ? (
              <PairedLayout rows={rows} shoes={shoes} translate={translate} />
            ) : (
              <ColumnLayout rows={rows} shoes={shoes} translate={translate} />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PairedLayout({
  rows,
  shoes,
  translate
}: {
  rows: Array<{ key: string; label: string; values: Array<string | null>; differs: boolean }>;
  shoes: Shoe[];
  translate: (value: string) => string;
}) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 border-b border-[rgb(var(--muted)/0.18)] bg-[rgb(var(--surface)/0.4)] px-6 py-3">
        <span className="text-[0.7rem] font-semibold text-[rgb(var(--text)/0.85)]">{shoes[0].shoe_name}</span>
        <span className="t-eyebrow text-center">{translate("Spec")}</span>
        <span className="text-right text-[0.7rem] font-semibold text-[rgb(var(--text)/0.85)]">
          {shoes[1].shoe_name}
        </span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.key}
          className={`grid grid-cols-3 items-center gap-4 px-6 py-3 ${
            i < rows.length - 1 ? "border-b border-[rgb(var(--muted)/0.14)]" : ""
          } ${row.differs ? "border-l-2 border-l-[rgb(var(--text)/0.35)] bg-[rgb(var(--text)/0.02)]" : ""}`}
        >
          <SpecValue value={row.values[0]} align="left" />
          <span className="text-center text-[0.62rem] uppercase tracking-[0.12em] text-[rgb(var(--subtext)/0.8)]">
            {translate(row.label)}
          </span>
          <SpecValue value={row.values[1]} align="right" />
        </div>
      ))}
    </div>
  );
}

function ColumnLayout({
  rows,
  shoes,
  translate
}: {
  rows: Array<{ key: string; label: string; values: Array<string | null>; differs: boolean }>;
  shoes: Shoe[];
  translate: (value: string) => string;
}) {
  const cols = `minmax(140px,1fr) repeat(${shoes.length}, minmax(140px,1fr))`;
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 140 * (shoes.length + 1) }}>
        <div
          className="grid gap-4 border-b border-[rgb(var(--muted)/0.18)] bg-[rgb(var(--surface)/0.4)] px-6 py-3"
          style={{ gridTemplateColumns: cols }}
        >
          <span className="t-eyebrow">{translate("Spec")}</span>
          {shoes.map((shoe) => (
            <span key={shoe.id} className="text-[0.7rem] font-semibold text-[rgb(var(--text)/0.85)]">
              {shoe.shoe_name}
            </span>
          ))}
        </div>
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={`grid items-center gap-4 px-6 py-3 ${
              i < rows.length - 1 ? "border-b border-[rgb(var(--muted)/0.14)]" : ""
            } ${row.differs ? "border-l-2 border-l-[rgb(var(--text)/0.35)] bg-[rgb(var(--text)/0.02)]" : ""}`}
            style={{ gridTemplateColumns: cols }}
          >
            <span className="text-[0.62rem] uppercase tracking-[0.12em] text-[rgb(var(--subtext)/0.8)]">
              {translate(row.label)}
            </span>
            {row.values.map((value, vi) => (
              <SpecValue key={`${row.key}-${vi}`} value={value} align="left" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecValue({ value, align }: { value: string | null; align: "left" | "right" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  if (!value) {
    return <span className={`text-[0.8rem] soft-text ${alignClass}`}>{EMPTY_LABEL}</span>;
  }
  return (
    <DynamicTranslatedText
      as="span"
      className={`text-[0.8rem] text-[rgb(var(--text)/0.85)] ${alignClass}`}
      text={value}
      contentType="technology"
    />
  );
}
