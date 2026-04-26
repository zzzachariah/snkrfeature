"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CARD_HEIGHT, CARD_WIDTH } from "@/components/card/card-frame";
import { CompareCard } from "@/components/card/compare-card";
import { SingleShoeCard } from "@/components/card/single-shoe-card";
import { useLocale } from "@/components/i18n/locale-provider";
import type { RadarAxis } from "@/components/detail/performance-radar";
import { captureCardToBlob, safeFilename, triggerDownload } from "@/lib/card/capture";
import type { Shoe } from "@/lib/types";

type Mode =
  | { kind: "single"; shoe: Shoe; axes: RadarAxis[] }
  | { kind: "compare"; shoes: Shoe[] };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: Mode | null;
};

export function CardPreviewModal({ open, onClose, mode }: Props) {
  const { translate } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const node = wrapRef.current;
    if (!node) return;
    const compute = () => {
      const cs = window.getComputedStyle(node);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const availableWidth = Math.max(0, node.clientWidth - padX);
      const availableHeight = Math.max(0, node.clientHeight - padY);
      const sx = availableWidth / CARD_WIDTH;
      const sy = availableHeight / CARD_HEIGHT;
      const next = Math.min(sx, sy, 0.7);
      if (Number.isFinite(next) && next > 0) {
        setScale(Math.max(0.18, next));
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(node);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [open]);

  const filename = useMemo(() => {
    if (!mode) return "snkrfeature-card.png";
    if (mode.kind === "single") return safeFilename(["snkrfeature", mode.shoe.slug]);
    return safeFilename(["snkrfeature", "compare", ...mode.shoes.map((s) => s.slug)]);
  }, [mode]);

  async function handleDownload() {
    const node = cardRef.current;
    if (!node) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await captureCardToBlob(node);
      triggerDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render the card.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted || !open || !mode) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgb(0_0_0/0.55)] p-4 md:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          key="dialog"
          role="dialog"
          aria-modal
          className="surface-card premium-border relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl shadow-[0_30px_72px_rgb(var(--glass-shadow)/0.42)]"
          initial={{ y: 18, opacity: 0, scale: 0.985 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 8, opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-6 pt-5">
            <div>
              <p className="t-eyebrow">{translate("Share card")}</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
                {mode.kind === "single" ? translate("Spec sheet") : translate("Comparison sheet")}
              </h2>
              <p className="mt-1 text-xs soft-text">
                {translate("3:4 ratio · 1080 × 1440 captured at 3x for retina sharpness.")}
              </p>
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

          {/* Offscreen native-size card — what we capture */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: 0,
              left: -99999,
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              pointerEvents: "none",
            }}
          >
            <div ref={cardRef}>
              {mode.kind === "single" ? (
                <SingleShoeCard shoe={mode.shoe} axes={mode.axes} />
              ) : (
                <CompareCard shoes={mode.shoes} />
              )}
            </div>
          </div>

          {/* Visible scaled preview — separate render */}
          <div
            ref={wrapRef}
            className="flex flex-1 items-center justify-center overflow-auto px-6 py-5"
            style={{ minHeight: 0 }}
          >
            <div
              style={{
                width: CARD_WIDTH * scale,
                height: CARD_HEIGHT * scale,
                position: "relative",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "0 0",
                }}
              >
                {mode.kind === "single" ? (
                  <SingleShoeCard shoe={mode.shoe} axes={mode.axes} />
                ) : (
                  <CompareCard shoes={mode.shoes} />
                )}
              </div>
            </div>
          </div>

          {error ? (
            <p className="px-6 pb-2 text-xs text-rose-400">{error}</p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-[rgb(var(--muted)/0.25)] bg-[rgb(var(--bg-elev)/0.55)] px-6 py-4">
            <p className="text-xs soft-text">{filename}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-[rgb(var(--muted)/0.5)] px-3 py-1.5 text-xs soft-text transition hover:border-[rgb(var(--text)/0.45)] hover:text-[rgb(var(--text))] disabled:opacity-50"
              >
                {translate("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--text))] bg-[rgb(var(--text))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--bg))] transition hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {busy ? translate("Rendering...") : translate("Download PNG")}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
