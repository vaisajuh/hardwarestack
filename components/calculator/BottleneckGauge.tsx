"use client";

import { Cell, Pie, PieChart } from "recharts";

interface BottleneckGaugeProps {
  label: string;
  utilization: number;
  isBottleneck: boolean;
}

// Fixed pixel dimensions — avoids ResizeObserver-before-paint issues with
// ResponsiveContainer that produce -1/-1 warnings in Recharts 3.
const W = 220;
const H = 120;
const CX = W / 2;
const CY = H - 10; // flat edge sits near the bottom edge
const INNER_R = 56;
const OUTER_R = 76;
const TRACK_COLOR = "#e2e8f0";

function accentColor(utilization: number, isBottleneck: boolean): string {
  if (isBottleneck) return "#ef4444";
  if (utilization >= 90) return "#f59e0b";
  return "#64748b";
}

export function BottleneckGauge({
  label,
  utilization,
  isBottleneck,
}: BottleneckGaugeProps) {
  const fill = accentColor(utilization, isBottleneck);
  const clamped = Math.min(100, Math.max(0, utilization));
  const data = [{ value: clamped }, { value: 100 - clamped }];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: W, height: H }}>
        <PieChart width={W} height={H}>
          <Pie
            data={data}
            cx={CX}
            cy={CY}
            startAngle={180}
            endAngle={0}
            innerRadius={INNER_R}
            outerRadius={OUTER_R}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={fill} />
            <Cell fill={TRACK_COLOR} />
          </Pie>
        </PieChart>

        {/* percentage label centered above the flat edge */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center"
          style={{ bottom: 12 }}
        >
          <p
            className="text-2xl font-semibold tabular-nums leading-none"
            style={{ color: fill }}
          >
            {clamped}%
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400">
            load
          </p>
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-700">{label}</p>

      {isBottleneck && (
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200">
          Bottleneck
        </span>
      )}
    </div>
  );
}
