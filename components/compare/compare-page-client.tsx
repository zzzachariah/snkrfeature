"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Shoe } from "@/lib/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { ComparePlinths } from "@/components/compare/compare-plinths";
import { CompareRadar } from "@/components/compare/compare-radar";
import { CompareDiffRows } from "@/components/compare/compare-diff-rows";
import { CompareSpecTable } from "@/components/compare/compare-spec-table";
import { AddShoeDialog } from "@/components/compare/add-shoe-dialog";

const MAX_SHOES = 5;

type Props = {
  selected: Shoe[];
  allShoes: Shoe[];
};

export function ComparePageClient({ selected, allShoes }: Props) {
  const { translate } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localShoes, setLocalShoes] = useState<Shoe[]>(selected);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setLocalShoes(selected);
  }, [selected]);

  const selectedIds = useMemo(() => new Set(localShoes.map((s) => s.id)), [localShoes]);
  const canAdd = localShoes.length < MAX_SHOES;

  const setCompareIds = useCallback(
    (nextShoes: Shoe[]) => {
      setLocalShoes(nextShoes);
      const params = new URLSearchParams(searchParams.toString());
      const ids = nextShoes.map((s) => s.id);
      if (ids.length) {
        params.set("ids", ids.join(","));
      } else {
        params.delete("ids");
      }
      const next = (params.toString() ? `${pathname}?${params.toString()}` : pathname) as Route;
      router.push(next, { scroll: false });
      router.refresh();
    },
    [pathname, router, searchParams]
  );

  const onRemove = (id: string) => {
    setCompareIds(localShoes.filter((s) => s.id !== id));
  };

  const onPick = (id: string) => {
    const picked = allShoes.find((s) => s.id === id);
    if (!picked || selectedIds.has(id) || localShoes.length >= MAX_SHOES) return;
    setCompareIds([...localShoes, picked]);
    setDialogOpen(false);
  };

  const onClearAll = () => setCompareIds([]);

  return (
    <main className="container-shell pb-24">
      <section className="py-16 text-center md:py-20">
        <p className="t-eyebrow mb-3">{translate("Head to Head")}</p>
        <h1
          className="font-extrabold leading-[1] tracking-[-0.04em]"
          style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
        >
          {translate("Compare")}
        </h1>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {localShoes.length ? (
            <p className="text-[0.88rem] tracking-[-0.005em] soft-text">
              {localShoes.map((shoe, i) => (
                <span key={shoe.id}>
                  <span className="text-[rgb(var(--text)/0.9)]">{shoe.shoe_name}</span>
                  {i < localShoes.length - 1 ? <span className="mx-2 opacity-40">/</span> : null}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-[0.88rem] tracking-[-0.005em] soft-text">
              {translate("Pick up to 5 shoes to compare.")}
            </p>
          )}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!canAdd}
            className="inline-flex items-center gap-1 rounded-md border border-[rgb(var(--glass-stroke-soft)/0.4)] px-2.5 py-1 text-[0.75rem] soft-text transition hover:border-[rgb(var(--text)/0.4)] hover:text-[rgb(var(--text))] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[rgb(var(--glass-stroke-soft)/0.4)] disabled:hover:text-[rgb(var(--subtext))]"
          >
            <Plus className="h-3.5 w-3.5" /> {translate("Add shoe")}
          </button>
          {localShoes.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-md border border-transparent px-2 py-1 text-[0.72rem] soft-text transition hover:text-[rgb(var(--text))]"
            >
              {translate("Clear all")}
            </button>
          ) : null}
        </div>
      </section>

      {localShoes.length === 0 ? (
        <EmptyState onOpenAdd={() => setDialogOpen(true)} translate={translate} />
      ) : (
        <>
          <ComparePlinths
            shoes={localShoes}
            onRemove={onRemove}
            onAdd={() => setDialogOpen(true)}
            canAdd={canAdd}
          />

          <div
            className="mb-16 h-px"
            style={{
              background: "linear-gradient(to right, transparent, rgb(var(--muted) / 0.4), transparent)"
            }}
          />

          <section className="mb-16 grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="t-eyebrow mb-5 text-center">{translate("Performance Profile")}</p>
              <CompareRadar shoes={localShoes} />
            </div>
            <div>
              <CompareDiffRows shoes={localShoes} />
            </div>
          </section>

          <CompareSpecTable shoes={localShoes} />
        </>
      )}

      <AddShoeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        shoes={allShoes}
        selectedIds={selectedIds}
        onPick={onPick}
      />
    </main>
  );
}

function EmptyState({ onOpenAdd, translate }: { onOpenAdd: () => void; translate: (value: string) => string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-[rgb(var(--muted)/0.6)] bg-[rgb(var(--bg-elev)/0.36)] px-8 py-14 text-center">
      <p className="t-eyebrow mb-3">{translate("Nothing to compare yet")}</p>
      <h2 className="mb-2 text-2xl font-semibold tracking-[-0.02em]">
        {translate("Build your head-to-head")}
      </h2>
      <p className="mb-6 text-sm soft-text">
        {translate("Add up to five shoes and see their radar, diff, and full spec sheet side by side.")}
      </p>
      <button
        type="button"
        onClick={onOpenAdd}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--text))] bg-[rgb(var(--text))] px-4 py-2 text-sm font-semibold text-[rgb(var(--bg))] transition hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.3)]"
      >
        <Plus className="h-4 w-4" /> {translate("Add shoe")}
      </button>
    </div>
  );
}
