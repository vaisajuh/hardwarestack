import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Desktop GPUs",
  description:
    "Browse all discrete desktop GPUs in the HardwareStack database. Compare NVIDIA GeForce and AMD Radeon graphics cards by tier and performance scores.",
};

const TIER_ORDER = ["ENTHUSIAST", "ULTRA", "HIGH", "MID", "ENTRY"] as const;
const TIER_LABELS: Record<string, string> = {
  ENTRY: "Entry",
  MID: "Mid-Range",
  HIGH: "High-End",
  ULTRA: "Ultra",
  ENTHUSIAST: "Enthusiast",
};
const TIER_COLORS: Record<string, string> = {
  ENTRY: "bg-slate-100 text-slate-600",
  MID: "bg-blue-50 text-blue-700",
  HIGH: "bg-violet-50 text-violet-700",
  ULTRA: "bg-amber-50 text-amber-700",
  ENTHUSIAST: "bg-red-50 text-red-700",
};

export default async function GpusPage() {
  const gpus = await prisma.gpu.findMany({
    orderBy: [{ tier: "desc" }, { rasterScore: "desc" }],
  });

  const groups = TIER_ORDER.filter((t) => gpus.some((g) => g.tier === t)).map(
    (tier) => ({ tier, items: gpus.filter((g) => g.tier === tier) })
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Desktop GPUs
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {gpus.length} graphics cards across {groups.length} tiers. Click any
          GPU to see its bottleneck analysis.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map(({ tier, items }) => (
          <section key={tier}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_COLORS[tier]}`}
              >
                {TIER_LABELS[tier]}
              </span>
              <span className="text-xs text-slate-400">{items.length} GPUs</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">
                      Model
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden sm:table-cell">
                      VRAM
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden md:table-cell">
                      Architecture
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">
                      Raster Score
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((gpu) => (
                    <tr key={gpu.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <Link
                          href={`/gpu/${toSlug(gpu.modelName)}`}
                          className="hover:text-slate-600"
                        >
                          {gpu.modelName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                        {gpu.vramGb} GB {gpu.memoryType ?? ""}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">
                        {gpu.architecture ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                        {gpu.rasterScore?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/gpu/${toSlug(gpu.modelName)}`}
                          className="text-xs text-slate-400 hover:text-slate-700"
                        >
                          Test →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
