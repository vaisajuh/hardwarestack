import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Desktop CPUs",
  description:
    "Browse all desktop CPUs in the HardwareStack database. Compare Intel Core and AMD Ryzen processors by tier and performance scores.",
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

export default async function CpusPage() {
  const cpus = await prisma.cpu.findMany({
    orderBy: [{ tier: "desc" }, { singleCoreScore: "desc" }],
  });

  const groups = TIER_ORDER.filter((t) => cpus.some((c) => c.tier === t)).map(
    (tier) => ({ tier, items: cpus.filter((c) => c.tier === tier) })
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Desktop CPUs
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {cpus.length} processors across {groups.length} tiers. Click any CPU
          to see its bottleneck analysis.
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
              <span className="text-xs text-slate-400">{items.length} CPUs</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">
                      Model
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden sm:table-cell">
                      Cores
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden sm:table-cell">
                      Boost
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">
                      Single-core
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden md:table-cell">
                      Multi-core
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((cpu) => (
                    <tr key={cpu.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <Link
                          href={`/cpu/${toSlug(cpu.modelName)}`}
                          className="hover:text-slate-600"
                        >
                          {cpu.modelName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                        {cpu.cores}C / {cpu.threads}T
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                        {cpu.boostClockGhz} GHz
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                        {cpu.singleCoreScore?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums hidden md:table-cell">
                        {cpu.multiCoreScore?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/cpu/${toSlug(cpu.modelName)}`}
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
