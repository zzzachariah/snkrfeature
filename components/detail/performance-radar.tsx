"use client";

import { DynamicTranslatedText } from "@/components/i18n/dynamic-translated-text";
import { useLocale } from "@/components/i18n/locale-provider";

export type RadarAxis = {
  label: string;
  rawText: string | null | undefined;
  score: number;
  tier: string;
};

type Props = {
  axes: RadarAxis[];
};

const VIEW = 320;
const CENTER = VIEW / 2;
const MAX_RADIUS = 104;
const LABEL_RADIUS = 138;

function polar(radius: number, angleRad: number) {
  const x = Number((CENTER + radius * Math.sin(angleRad)).toFixed(3));
  const y = Number((CENTER - radius * Math.cos(angleRad)).toFixed(3));
  return { x, y };
}

function ringPath(radius: number, count: number) {
  const pts = Array.from({ length: count }, (_, i) => {
    const theta = (i / count) * Math.PI * 2;
    const { x, y } = polar(radius, theta);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${pts.join(" L")} Z`;
}

export function PerformanceRadar({ axes }: Props) {
  const count = axes.length;

  const polygonPoints = axes
    .map((axis, i) => {
      const theta = (i / count) * Math.PI * 2;
      const clamped = Math.max(0, Math.min(100, axis.score));
      const r = (clamped / 100) * MAX_RADIUS;
      const { x, y } = polar(r, theta);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label="Performance radar chart"
      >
        {rings.map((r, i) => (
          <path
            key={r}
            d={ringPath(MAX_RADIUS * r, count)}
            fill={i === rings.length - 1 ? "rgb(var(--bg-elev) / 0.35)" : "none"}
            stroke="rgb(var(--glass-stroke-soft) / 0.55)"
            strokeWidth={1}
          />
        ))}

        {axes.map((_, i) => {
          const theta = (i / count) * Math.PI * 2;
          const { x, y } = polar(MAX_RADIUS, theta);
          return (
            <line
              key={`spoke-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="rgb(var(--glass-stroke-soft) / 0.45)"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygonPoints}
          fill="rgb(var(--text) / 0.18)"
          stroke="rgb(var(--text) / 0.85)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          style={{ transition: "all 400ms cubic-bezier(0.22,1,0.36,1)" }}
        />

        {axes.map((axis, i) => {
          const theta = (i / count) * Math.PI * 2;
          const clamped = Math.max(0, Math.min(100, axis.score));
          const r = (clamped / 100) * MAX_RADIUS;
          const { x, y } = polar(r, theta);
          return (
            <circle
              key={`pt-${i}`}
              cx={x}
              cy={y}
              r={3.5}
              fill="rgb(var(--text))"
              stroke="rgb(var(--bg-elev))"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0">
        {axes.map((axis, i) => <AxisLabel key={axis.label} axis={axis} index={i} count={count} />)}
      </div>
    </div>
  );
}

function AxisLabel({
  axis,
  index,
  count
}: {
  axis: RadarAxis;
  index: number;
  count: number;
}) {
  const { translate } = useLocale();
  const theta = (index / count) * Math.PI * 2;
  const { x, y } = polar(LABEL_RADIUS, theta);
  const leftPct = Number(((x / VIEW) * 100).toFixed(3));
  const topPct = Number(((y / VIEW) * 100).toFixed(3));
  const clamped = Math.max(0, Math.min(100, Math.round(axis.score)));

  const isLeft = Math.sin(theta) < -0.2;
  const isRight = Math.sin(theta) > 0.2;
  const align = isLeft ? "items-end text-right" : isRight ? "items-start text-left" : "items-center text-center";
  const translateX = isLeft ? "-100%" : isRight ? "0" : "-50%";

  return (
    <div
      className={`absolute flex flex-col gap-0.5 ${align}`}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: `translate(${translateX}, -50%)`
      }}
      title={axis.rawText?.trim() ? axis.rawText : undefined}
    >
      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] soft-text">
        {translate(axis.label)}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-semibold text-[rgb(var(--text))]">{clamped}</span>
        <DynamicTranslatedText
          as="span"
          className="text-[0.65rem] soft-text"
          text={axis.tier}
          contentType="descriptive"
        />
      </div>
    </div>
  );
}
