"use client";

import { CardFrame } from "@/components/card/card-frame";
import { CardCompareRadar } from "@/components/card/card-compare-radar";
import { getLineStyle } from "@/components/compare/compare-metrics";
import { useLocale } from "@/components/i18n/locale-provider";
import { useTranslatedText } from "@/components/i18n/use-translated-text";
import { proxiedImageSrc } from "@/lib/card/proxy-image";
import type { Shoe } from "@/lib/types";

type Props = {
  shoes: Shoe[];
};

function gridForCount(count: number): { columns: string; rows: string; imageHeight: number; nameSize: number } {
  if (count <= 2) return { columns: "1fr 1fr", rows: "1fr", imageHeight: 280, nameSize: 32 };
  if (count === 3) return { columns: "1fr 1fr 1fr", rows: "1fr", imageHeight: 220, nameSize: 24 };
  return { columns: "1fr 1fr", rows: "1fr 1fr", imageHeight: 168, nameSize: 22 };
}

function shortTech(shoe: Shoe): string {
  const parts: string[] = [];
  const midsole = [shoe.spec.forefoot_midsole_tech, shoe.spec.heel_midsole_tech]
    .map((t) => (t ?? "").trim())
    .filter(Boolean);
  if (midsole.length) {
    const dedup = midsole[0] === midsole[1] ? [midsole[0]] : midsole;
    parts.push(dedup.join(" / "));
  }
  if (shoe.spec.outsole_tech?.trim()) parts.push(shoe.spec.outsole_tech.trim());
  const joined = parts.join(" · ");
  return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined;
}

function ShoeCell({
  shoe,
  index,
  imageHeight,
  nameSize,
  noImageLabel,
}: {
  shoe: Shoe;
  index: number;
  imageHeight: number;
  nameSize: number;
  noImageLabel: string;
}) {
  const style = getLineStyle(index);
  /**
   * The short tech line includes forefoot/heel midsole tech values which the
   * editorial direction asks us to leave in their original language. Outsole
   * is concatenated together so we leave the whole string un-translated for
   * consistency on the card.
   */
  const techLine = shortTech(shoe);
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 14,
        padding: 18,
        background: "rgba(255,255,255,0.6)",
        display: "grid",
        gridTemplateRows: `${imageHeight}px auto auto`,
        rowGap: 10,
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "10%",
            right: "10%",
            bottom: "6%",
            height: 18,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 70%)",
            filter: "blur(6px)",
          }}
        />
        {shoe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxiedImageSrc(shoe.image_url)}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.14))",
            }}
          />
        ) : (
          <div
            style={{
              color: "rgba(0,0,0,0.35)",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {noImageLabel}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width={22} height={4} aria-hidden style={{ flexShrink: 0 }}>
            <line
              x1={0}
              y1={2}
              x2={22}
              y2={2}
              stroke={`rgba(0,0,0,${style.opacity})`}
              strokeWidth={style.strokeWidth + 0.4}
              strokeDasharray={style.dashArray}
            />
          </svg>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.28em",
              color: "rgba(0,0,0,0.5)",
            }}
          >
            {[shoe.brand, shoe.release_year].filter(Boolean).join(" · ")}
          </span>
        </div>
        <span
          style={{
            fontSize: nameSize,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "rgb(var(--text))",
          }}
        >
          {shoe.shoe_name}
        </span>
      </div>
      <span
        style={{
          fontSize: 11.5,
          color: "rgba(0,0,0,0.6)",
          letterSpacing: "-0.005em",
          lineHeight: 1.35,
        }}
      >
        {techLine || "—"}
      </span>
    </div>
  );
}

export function CompareCard({ shoes }: Props) {
  const { translate } = useLocale();
  const safe = shoes.slice(0, 4);
  const grid = gridForCount(safe.length);
  // Pre-fetch translation for the title summary (no-op in en).
  const translatedHeadToHead = useTranslatedText("Head to Head", { contentType: "descriptive" });
  const translatedShoes = useTranslatedText("shoes", { contentType: "descriptive" });

  return (
    <CardFrame variant="compare">
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "auto 1fr auto auto",
          rowGap: 28,
          paddingTop: 32,
          paddingBottom: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.34em",
              color: "rgba(0,0,0,0.55)",
            }}
          >
            {translatedHeadToHead} · {safe.length} {translatedShoes}
          </span>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 0.95,
              margin: 0,
              color: "rgb(var(--text))",
            }}
          >
            {safe.map((s) => s.shoe_name).join("  /  ")}
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: grid.columns,
            gridTemplateRows: grid.rows,
            gap: 18,
            minHeight: 0,
          }}
        >
          {safe.map((shoe, i) => (
            <ShoeCell
              key={shoe.id}
              shoe={shoe}
              index={i}
              imageHeight={grid.imageHeight}
              nameSize={grid.nameSize}
              noImageLabel={translate("No image")}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 8,
          }}
        >
          <CardCompareRadar shoes={safe} size={420} />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
          }}
        >
          {safe.map((shoe, i) => {
            const style = getLineStyle(i);
            return (
              <div key={shoe.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width={26} height={6} aria-hidden>
                  <line
                    x1={0}
                    y1={3}
                    x2={26}
                    y2={3}
                    stroke={`rgba(0,0,0,${style.opacity})`}
                    strokeWidth={style.strokeWidth + 0.4}
                    strokeDasharray={style.dashArray}
                  />
                </svg>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(0,0,0,0.78)",
                    letterSpacing: "-0.005em",
                  }}
                >
                  {shoe.shoe_name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </CardFrame>
  );
}
