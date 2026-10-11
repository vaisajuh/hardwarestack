import type { FitStatus } from "@/lib/ai-fit";

const STATUS_STYLES: Record<FitStatus, { label: string; className: string }> = {
  gpu: { label: "On GPU", className: "bg-emerald-50 text-emerald-700" },
  partial: { label: "GPU + RAM", className: "bg-amber-50 text-amber-700" },
  none: { label: "Won't run", className: "bg-slate-100 text-slate-500" },
};

export function StatusBadge({ status }: { status: FitStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${style.className}`}>
      {style.label}
    </span>
  );
}
