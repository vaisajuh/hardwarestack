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
import { Separator } from "@/components/ui/separator";
import { BottleneckGauge } from "./BottleneckGauge";
import { UpgradeCard } from "@/components/monetization/UpgradeCard";

interface Props {
  cpus: CpuOption[];
  gpus: GpuOption[];
  rams: RamOption[];
  affiliateTag: string;
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
  Balanced: "Balanced System",
};

export function BottleneckCalculator({ cpus, gpus, rams, affiliateTag }: Props) {
  const [selectedCpuId, setSelectedCpuId] = useState("");
  const [selectedGpuId, setSelectedGpuId] = useState("");
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
    result &&
    result.bottleneckComponent !== "Balanced" &&
    selectedCpu &&
    selectedGpu;

  const shortName = (name: string) =>
    name
      .replace("Intel Core ", "")
      .replace("AMD Ryzen ", "Ryzen ")
      .replace("NVIDIA GeForce ", "")
      .replace("AMD Radeon ", "");

  return (
    <div className="flex flex-col gap-6">
      {/* Selector card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-800">
            Select Your Components
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* CPU */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              CPU
            </Label>
            <Select
              value={selectedCpuId}
              onValueChange={(v) => { if (v !== null) setSelectedCpuId(v); }}
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
              onValueChange={(v) => { if (v !== null) setSelectedGpuId(v); }}
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
              <span className="normal-case text-slate-400">(optional)</span>
            </Label>
            <Select
              value={selectedRamId}
              onValueChange={(v) => { if (v !== null) setSelectedRamId(v); }}
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
      {result && selectedCpu && selectedGpu && (
        <div className="flex flex-col gap-4">
          {/* Headline */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${
                result.bottleneckComponent === "Balanced"
                  ? "bg-emerald-500"
                  : "bg-red-500"
              }`}
            >
              {result.bottleneckComponent === "Balanced"
                ? "✓"
                : `${Math.round(result.bottleneckPercentage)}%`}
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {HEADLINE[result.bottleneckComponent]}
                {result.bottleneckComponent !== "Balanced" &&
                  ` — ${Math.round(result.bottleneckPercentage)}%`}
              </p>
              <p className="text-sm text-slate-500">
                {result.bottleneckComponent === "Balanced"
                  ? `${selectedCpu.modelName} and ${selectedGpu.modelName} are well-matched at ${resolution}.`
                  : result.bottleneckComponent === "RAM"
                    ? `Your RAM is limiting your CPU's effective throughput at ${resolution}.`
                    : `Your ${result.bottleneckComponent} is the limiting factor at ${resolution}.`}
              </p>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* Gauges */}
          <div className="flex flex-wrap justify-center gap-6 py-2">
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
              bottleneckComponent={result.bottleneckComponent as "CPU" | "GPU" | "RAM"}
              cpu={selectedCpu}
              gpu={selectedGpu}
              ram={selectedRam}
              affiliateTag={affiliateTag}
            />
          )}
        </div>
      )}
    </div>
  );
}
