"use client";

import { useEffect, useRef, useState } from "react";
import { Shoe } from "@/lib/types";
import { useLocale } from "@/components/i18n/locale-provider";
import { METRICS, getLineStyle, scoreFor } from "@/components/compare/compare-metrics";

const SIZE = 360;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 128;
const GRID_RINGS = [0.2, 0.4, 0.6, 0.8, 1];

function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useProgress(trigger: boolean, duration = 720) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setValue(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const timeout = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 220);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [trigger, duration]);
  return value;
}

type Props = {
  shoes: Shoe[];
};

export function CompareRadar({ shoes }: Props) {
  const { translate } = useLocale();
  const { ref, inView } = useInView<HTMLDivElement>();
  const progress = useProgress(inView);
  const n = METRICS.length;
  const angles = METRICS.map((_, i) => ((-90 + i * (360 / n)) * Math.PI) / 180);

  const gridPoints = (ratio: number) =>
    angles.map((a) => `${CX + ratio * R * Math.cos(a)},${CY + ratio * R * Math.sin(a)}`).join(" ");

  const shoePoints = (shoe: Shoe) =>
    angles
      .map((a, i) => {
        const score = scoreFor(shoe, METRICS[i].key);
        const v = (score / 100) * progress;
        return `${CX + v * R * Math.cos(a)},${CY + v * R * Math.sin(a)}`;
      })
      .join(" ");

  return (
    <div ref={ref}>
      <svg
        viewBox={`-30 -16 ${SIZE + 60} ${SIZE + 32}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block w-full max-w-[360px]"
        style={{ overflow: "visible" }}
      >
        {GRID_RINGS.map((ratio) => (
          <polygon
            key={ratio}
            points={gridPoints(ratio)}
            fill="none"
            stroke="rgb(var(--muted) / 0.7)"
            strokeWidth={0.8}
          />
        ))}
        {angles.map((a, i) => (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={CX + R * Math.cos(a)}
            y2={CY + R * Math.sin(a)}
            stroke="rgb(var(--muted) / 0.55)"
            strokeWidth={0.8}
          />
        ))}
        {shoes.map((shoe, si) => {
          const style = getLineStyle(si);
          return (
            <polygon
              key={shoe.id}
              points={shoePoints(shoe)}
              fill={`rgb(var(--text) / ${0.06 + 0.02 * (shoes.length - si)})`}
              stroke={`rgb(var(--text) / ${style.opacity})`}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.dashArray}
              strokeLinejoin="round"
            />
          );
        })}
        {shoes[0]
          ? angles.map((a, i) => {
              const score = scoreFor(shoes[0], METRICS[i].key);
              const v = (score / 100) * progress;
              return (
                <circle
                  key={i}
                  cx={CX + v * R * Math.cos(a)}
                  cy={CY + v * R * Math.sin(a)}
                  r={3}
                  fill="rgb(var(--text) / 0.9)"
                />
              );
            })
          : null}
        {angles.map((a, i) => {
          const lx = CX + (R + 26) * Math.cos(a);
          const ly = CY + (R + 26) * Math.sin(a);
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontFamily="inherit"
              fontWeight={500}
              fill="rgb(var(--subtext) / 0.9)"
              letterSpacing="0.14em"
            >
              {translate(METRICS[i].label).toUpperCase()}
            </text>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {shoes.map((shoe, si) => {
          const style = getLineStyle(si);
          return (
            <div key={shoe.id} className="flex items-center gap-2">
              <svg width={22} height={6} aria-hidden>
                <line
                  x1={0}
                  y1={3}
                  x2={22}
                  y2={3}
                  stroke={`rgb(var(--text) / ${style.opacity})`}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.dashArray}
                />
              </svg>
              <span className="text-[0.7rem] soft-text">{shoe.shoe_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
