"use client";

import { useState } from "react";
import { calculateBottleneck } from "@/lib/bottleneck";
import type {
  CpuOption,
  GpuOption,
  RamOption,
  Resolution,
} from "@/types/hardware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BottleneckGauge } from "./BottleneckGauge";
import { UpgradeCard } from "@/components/monetization/UpgradeCard";

interface Props {
  cpus: CpuOption[];
  gpus: GpuOption[];
  rams: RamOption[];
  affiliateTag: string;
  defaultCpuId?: string;
  defaultGpuId?: string;
}

const RESOLUTIONS: Resolution[] = ["1080p", "1440p", "4K"];
const TIER_ORDER = ["ENTRY", "MID", "HIGH", "ULTRA", "ENTHUSIAST"] as const;
const TIER_LABELS: Record<string, string> = {
  ENTRY: "Entry",
  MID: "Mid-Range",
  HIGH: "High-End",
  ULTRA: "Ultra",
  ENTHUSIAST: "Enthusiast",
};

function groupByTier<T extends { tier: string }>(
  items: T[]
): { tier: string; items: T[] }[] {
  return TIER_ORDER.filter((t) => items.some((i) => i.tier === t)).map(
    (tier) => ({ tier, items: items.filter((i) => i.tier === tier) })
  );
}

const HEADLINE: Record<string, string> = {
  CPU: "CPU Bottleneck",
  GPU: "GPU Bottleneck",
  RAM: "RAM Bottleneck",
  Balanced: "Well Matched",
};

const DESCRIPTION: Record<string, (cpu: string, gpu: string, res: string) => string> = {
  CPU: (cpu, _gpu, res) =>
    `${cpu} is the limiting factor at ${res}. A faster CPU will unlock your GPU's full potential.`,
  GPU: (_cpu, gpu, res) =>
    `${gpu} can't keep up at ${res}. A GPU upgrade will directly improve frame rates.`,
  RAM: (_cpu, _gpu, res) =>
    `Slow or single-channel RAM is starving your CPU at ${res}. Faster dual-channel memory will deliver measurable FPS gains.`,
  Balanced: (cpu, gpu, res) =>
    `${cpu} and ${gpu} are well matched at ${res}.`,
};

const RESULT_ACCENT: Record<string, string> = {
  CPU: "border-l-red-500",
  GPU: "border-l-red-500",
  RAM: "border-l-amber-500",
  Balanced: "border-l-emerald-500",
};

function shortName(name: string): string {
  return name
    .replace("Intel Core ", "")
    .replace("AMD Ryzen ", "Ryzen ")
    .replace("NVIDIA GeForce ", "")
    .replace("AMD Radeon ", "");
}

export function BottleneckCalculator({
  cpus,
  gpus,
  rams,
  affiliateTag,
  defaultCpuId,
  defaultGpuId,
}: Props) {
  const [selectedCpuId, setSelectedCpuId] = useState(
    defaultCpuId && cpus.some((c) => c.id === defaultCpuId) ? defaultCpuId : ""
  );
  const [selectedGpuId, setSelectedGpuId] = useState(
    defaultGpuId && gpus.some((g) => g.id === defaultGpuId) ? defaultGpuId : ""
  );
  const [selectedRamId, setSelectedRamId] = useState("");
  const [resolution, setResolution] = useState<Resolution>("1080p");

  const selectedCpu = cpus.find((c) => c.id === selectedCpuId);
  const selectedGpu = gpus.find((g) => g.id === selectedGpuId);
  const selectedRam = rams.find((r) => r.id === selectedRamId);

  const result =
    selectedCpu && selectedGpu
      ? calculateBottleneck(selectedCpu, selectedGpu, resolution, selectedRam)
      : null;

  const cpuGroups = groupByTier(cpus);
  const gpuGroups = groupByTier(gpus);
  const ramGroups = groupByTier(rams);

  const showUpgrade =
    result && result.bottleneckComponent !== "Balanced" && selectedCpu && selectedGpu;

  return (
    <div className="flex flex-col gap-5">
      {/* Selector card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Your Components
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* CPU */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              CPU
            </Label>
            <Select
              value={selectedCpuId}
              onValueChange={(v) => {
                if (v !== null) setSelectedCpuId(v);
              }}
            >
              <SelectTrigger className="h-9 text-sm border-slate-200 w-full">
                <SelectValue placeholder="Select CPU…" />
              </SelectTrigger>
              <SelectContent>
                {cpuGroups.map(({ tier, items }) => (
                  <div key={tier}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {TIER_LABELS[tier]}
                    </div>
                    {items.map((cpu) => (
                      <SelectItem key={cpu.id} value={cpu.id} className="text-sm">
                        {cpu.modelName}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GPU */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              GPU
            </Label>
            <Select
              value={selectedGpuId}
              onValueChange={(v) => {
                if (v !== null) setSelectedGpuId(v);
              }}
            >
              <SelectTrigger className="h-9 text-sm border-slate-200 w-full">
                <SelectValue placeholder="Select GPU…" />
              </SelectTrigger>
              <SelectContent>
                {gpuGroups.map(({ tier, items }) => (
                  <div key={tier}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {TIER_LABELS[tier]}
                    </div>
                    {items.map((gpu) => (
                      <SelectItem key={gpu.id} value={gpu.id} className="text-sm">
                        {gpu.modelName}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* RAM */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              RAM{" "}
              <span className="normal-case font-normal text-slate-400">
                (optional)
              </span>
            </Label>
            <Select
              value={selectedRamId}
              onValueChange={(v) => {
                if (v !== null) setSelectedRamId(v);
              }}
            >
              <SelectTrigger className="h-9 text-sm border-slate-200 w-full">
                <SelectValue placeholder="Select RAM…" />
              </SelectTrigger>
              <SelectContent>
                {ramGroups.map(({ tier, items }) => (
                  <div key={tier}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {TIER_LABELS[tier]}
                    </div>
                    {items.map((ram) => (
                      <SelectItem key={ram.id} value={ram.id} className="text-sm">
                        {ram.modelName}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Resolution
            </Label>
            <div className="flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-1">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`flex-1 rounded text-sm font-medium transition-colors h-7 ${
                    resolution === res
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && selectedCpu && selectedGpu ? (
        <Card
          className={`border-slate-200 shadow-sm border-l-4 ${RESULT_ACCENT[result.bottleneckComponent]}`}
        >
          <CardContent className="pt-5 pb-5 flex flex-col gap-5">
            {/* Headline */}
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {HEADLINE[result.bottleneckComponent]}
                </h2>
                {result.bottleneckComponent !== "Balanced" && (
                  <span className="text-sm font-semibold text-red-500">
                    {Math.round(result.bottleneckPercentage)}% imbalance
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {DESCRIPTION[result.bottleneckComponent](
                  shortName(selectedCpu.modelName),
                  shortName(selectedGpu.modelName),
                  resolution
                )}
              </p>
            </div>

            {/* Gauges */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <BottleneckGauge
                label={shortName(selectedCpu.modelName)}
                utilization={result.cpuUtilization}
                isBottleneck={result.bottleneckComponent === "CPU"}
              />
              <BottleneckGauge
                label={shortName(selectedGpu.modelName)}
                utilization={result.gpuUtilization}
                isBottleneck={result.bottleneckComponent === "GPU"}
              />
              {selectedRam && (
                <BottleneckGauge
                  label={`${selectedRam.type}-${selectedRam.speedMhz}${selectedRam.channels === 1 ? " SC" : ""}`}
                  utilization={result.ramUtilization}
                  isBottleneck={result.bottleneckComponent === "RAM"}
                />
              )}
            </div>

            {/* Upgrade recommendation */}
            {showUpgrade && (
              <UpgradeCard
                bottleneckComponent={
                  result.bottleneckComponent as "CPU" | "GPU" | "RAM"
                }
                cpu={selectedCpu}
                gpu={selectedGpu}
                ram={selectedRam}
                affiliateTag={affiliateTag}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        /* Empty prompt */
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <div className="flex justify-center gap-4 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 opacity-30"
              >
                <div className="h-16 w-16 rounded-full border-4 border-slate-300" />
                <div className="h-2 w-12 rounded bg-slate-200" />
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            Select a CPU and GPU above to see the analysis
          </p>
        </div>
      )}
    </div>
  );
}
