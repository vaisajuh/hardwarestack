"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface BottleneckGaugeProps {
  label: string;
  utilization: number;
  isBottleneck: boolean;
}

const TRACK_COLOR = "#e2e8f0";

function accentColor(utilization: number, isBottleneck: boolean): string {
  if (isBottleneck) return "#ef4444"; // red-500
  if (utilization >= 90) return "#f59e0b"; // amber-500
  return "#64748b"; // slate-500
}

export function BottleneckGauge({
  label,
  utilization,
  isBottleneck,
}: BottleneckGaugeProps) {
  const fill = accentColor(utilization, isBottleneck);
  const clamped = Math.min(100, Math.max(0, utilization));
  const data = [
    { value: clamped },
    { value: 100 - clamped },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-32 w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              startAngle={180}
              endAngle={0}
              innerRadius="62%"
              outerRadius="80%"
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={fill} />
              <Cell fill={TRACK_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* center label */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p
            className="text-2xl font-semibold tabular-nums leading-none"
            style={{ color: fill }}
          >
            {clamped}%
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-slate-400">
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
