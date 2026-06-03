"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { toSlug } from "@/lib/slug";

interface Gpu {
  id: string;
  modelName: string;
  tier: string;
  vramGb: number;
  memoryType: string | null;
  architecture: string | null;
  rasterScore: number | null;
}

const TIER_ORDER = ["ENTHUSIAST", "ULTRA", "HIGH", "MID", "ENTRY"] as const;
const TIER_LABELS: Record<string, string> = {
  ENTRY: "Entry", MID: "Mid-Range", HIGH: "High-End",
  ULTRA: "Ultra", ENTHUSIAST: "Enthusiast",
};
const TIER_COLORS: Record<string, string> = {
  ENTRY: "bg-slate-100 text-slate-600", MID: "bg-blue-50 text-blue-700",
  HIGH: "bg-violet-50 text-violet-700", ULTRA: "bg-amber-50 text-amber-700",
  ENTHUSIAST: "bg-red-50 text-red-700",
};

export function GpuList({ gpus }: { gpus: Gpu[] }) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const filtered = q ? gpus.filter(g => g.modelName.toLowerCase().includes(q)) : gpus;

  const groups = TIER_ORDER
    .filter(t => filtered.some(g => g.tier === t))
    .map(tier => ({ tier, items: filtered.filter(g => g.tier === tier) }));

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative flex items-center gap-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search GPUs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none sm:max-w-xs"
        />
        {q && (
          <span className="text-xs text-slate-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-400">No GPUs match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ tier, items }) => (
            <section key={tier}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_COLORS[tier]}`}>
                  {TIER_LABELS[tier]}
                </span>
                <span className="text-xs text-slate-400">{items.length} GPUs</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Model</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden sm:table-cell">VRAM</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs hidden md:table-cell">Architecture</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">Raster Score</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(gpu => (
                      <tr key={gpu.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <Link href={`/gpu/${toSlug(gpu.modelName)}`} className="hover:text-slate-600">
                            {gpu.modelName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{gpu.vramGb} GB {gpu.memoryType ?? ""}</td>
                        <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">{gpu.architecture ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{gpu.rasterScore?.toLocaleString() ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/gpu/${toSlug(gpu.modelName)}`} className="text-xs text-slate-400 hover:text-slate-700">Test →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
