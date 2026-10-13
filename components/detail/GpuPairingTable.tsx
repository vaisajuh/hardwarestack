"use client";

import { useState } from "react";
import Link from "next/link";
import { RESOLUTIONS, calculateBottleneck } from "@/lib/bottleneck";
import { toSlug } from "@/lib/slug";
import { pairHref } from "@/lib/pair-pages";
import { BottleneckBadge } from "@/components/detail/BottleneckBadge";
import type { CpuOption, GpuOption, Resolution } from "@/types/hardware";


interface Props {
  pairingCpus: CpuOption[];
  gpu: GpuOption;
}

export function GpuPairingTable({ pairingCpus, gpu }: Props) {
  const [resolution, setResolution] = useState<Resolution>("1080p");

  const pairings = pairingCpus.map((cpu) => ({
    cpu,
    result: calculateBottleneck(cpu, gpu, resolution),
    href: pairHref(cpu, gpu),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800">
          CPU Pairing Analysis
        </h2>
        <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
          {RESOLUTIONS.map((res) => (
            <button
              key={res}
              onClick={() => setResolution(res)}
              className={`px-3 rounded text-xs font-semibold transition-all h-full ${
                resolution === res
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">
                CPU
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">
                CPU Load
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">
                GPU Load
              </th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500 text-xs">
                Result
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pairings.map(({ cpu, result, href }) => (
              <tr key={cpu.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link
                    href={`/cpu/${toSlug(cpu.modelName)}`}
                    className="hover:text-slate-600"
                  >
                    {cpu.modelName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {result.cpuUtilization}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {result.gpuUtilization}%
                </td>
                <td className="px-4 py-3 text-right">
                  <BottleneckBadge component={result.bottleneckComponent} />
                </td>
                <td className="px-4 py-3 text-right">
                  {href && (
                    <Link
                      href={href}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Full test →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
