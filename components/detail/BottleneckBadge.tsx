import type { BottleneckComponent } from "@/types/hardware";

const BOTTLENECK_COLORS: Record<BottleneckComponent, string> = {
  CPU: "text-red-600 bg-red-50",
  GPU: "text-slate-600 bg-slate-50",
  RAM: "text-amber-600 bg-amber-50",
  Balanced: "text-emerald-600 bg-emerald-50",
};

export function BottleneckBadge({ component }: { component: BottleneckComponent }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BOTTLENECK_COLORS[component]}`}
    >
      {component === "Balanced" ? "Balanced" : `${component} BN`}
    </span>
  );
}
