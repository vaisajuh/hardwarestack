"use client";

import { useState } from "react";
import { calculateBottleneck } from "@/lib/bottleneck";
import type {
  CpuOption,
  GpuOption,
  RamOption,
  RamTypeValue,
  Resolution,
} from "@/types/hardware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { BottleneckGauge } from "./BottleneckGauge";
import { UpgradeCard } from "@/components/monetization/UpgradeCard";

interface Props {
  cpus: CpuOption[];
  gpus: GpuOption[];
  rams: RamOption[];
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

const SOCKET_ORDER = ["AM4", "AM5", "LGA1200", "LGA1700", "LGA1851"] as const;
const SOCKET_LABELS: Record<string, string> = {
  AM4:    "AMD AM4 (Ryzen 5000 & older)",
  AM5:    "AMD AM5 (Ryzen 7000/9000)",
  LGA1200: "Intel LGA1200 (10th/11th Gen)",
  LGA1700: "Intel LGA1700 (12th–14th Gen)",
  LGA1851: "Intel LGA1851 (Core Ultra 200)",
};

// Which RAM types are valid for each socket.
const SOCKET_RAM_COMPAT: Record<string, RamTypeValue[]> = {
  AM4:    ["DDR4"],
  AM5:    ["DDR5"],
  LGA1200: ["DDR4"],
  LGA1700: ["DDR4", "DDR5"],
  LGA1851: ["DDR5"],
};

function groupByTier<T extends { tier: string }>(
  items: T[]
): { tier: string; items: T[] }[] {
  return TIER_ORDER.filter((t) => items.some((i) => i.tier === t)).map(
    (tier) => ({ tier, items: items.filter((i) => i.tier === tier) })
  );
}

function groupBySocket(
  items: CpuOption[]
): { socket: string; items: CpuOption[] }[] {
  const present = [...new Set(items.map((c) => c.socket ?? "Unknown"))];
  const ordered = SOCKET_ORDER.filter((s) => present.includes(s));
  const rest = present.filter((s) => !SOCKET_ORDER.includes(s as never));
  return [...ordered, ...rest].map((socket) => ({
    socket,
    items: items
      .filter((c) => (c.socket ?? "Unknown") === socket)
      .sort(
        (a, b) =>
          TIER_ORDER.indexOf(b.tier as never) -
          TIER_ORDER.indexOf(a.tier as never)
      ),
  }));
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

  const compatibleRamTypes: RamTypeValue[] | null = selectedCpu?.socket
    ? (SOCKET_RAM_COMPAT[selectedCpu.socket] ?? null)
    : null;
  const compatibleRams = compatibleRamTypes
    ? rams.filter((r) => compatibleRamTypes.includes(r.type))
    : rams;

  function handleCpuChange(v: string) {
    setSelectedCpuId(v);
    const newCpu = cpus.find((c) => c.id === v);
    if (newCpu?.socket && selectedRam) {
      const compat = SOCKET_RAM_COMPAT[newCpu.socket] ?? [];
      if (!compat.includes(selectedRam.type)) setSelectedRamId("");
    }
  }

  const result =
    selectedCpu && selectedGpu
      ? calculateBottleneck(selectedCpu, selectedGpu, resolution, selectedRam)
      : null;

  const cpuGroups = groupBySocket(cpus);
  const gpuGroups = groupByTier(gpus);
  const ramGroups = groupByTier(compatibleRams);

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
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              CPU
            </Label>
            <Select
              value={selectedCpuId}
              onValueChange={(v) => { if (v !== null) handleCpuChange(v); }}
            >
              <SelectTrigger className="h-9 text-sm border-slate-200 w-full">
                <span className={`flex-1 truncate text-left ${selectedCpu ? "" : "text-slate-400"}`}>
                  {selectedCpu?.modelName ?? "Select CPU…"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {cpuGroups.map(({ socket, items }) => (
                  <div key={socket}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {SOCKET_LABELS[socket] ?? socket}
                    </div>
                    {items.map((cpu) => (
                      <SelectItem key={cpu.id} value={cpu.id} label={cpu.modelName} className="text-sm">
                        {cpu.modelName}
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          {TIER_LABELS[cpu.tier]}
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GPU */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              GPU
            </Label>
            <Select
              value={selectedGpuId}
              onValueChange={(v) => {
                if (v !== null) setSelectedGpuId(v);
              }}
            >
              <SelectTrigger className="h-9 text-sm border-slate-200 w-full">
                <span className={`flex-1 truncate text-left ${selectedGpu ? "" : "text-slate-400"}`}>
                  {selectedGpu?.modelName ?? "Select GPU…"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {gpuGroups.map(({ tier, items }) => (
                  <div key={tier}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {TIER_LABELS[tier]}
                    </div>
                    {items.map((gpu) => (
                      <SelectItem key={gpu.id} value={gpu.id} label={gpu.modelName} className="text-sm">
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
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              RAM{" "}
              {compatibleRamTypes ? (
                <span className="normal-case font-normal text-slate-400">
                  ({compatibleRamTypes.join(" / ")} only)
                </span>
              ) : (
                <span className="normal-case font-normal text-slate-400">
                  (optional)
                </span>
              )}
            </Label>
            <Select
              value={selectedRamId}
              onValueChange={(v) => {
                if (v !== null) setSelectedRamId(v);
              }}
            >
              <SelectTrigger className="h-9 text-sm border-slate-200 w-full">
                <span className={`flex-1 truncate text-left ${selectedRam ? "" : "text-slate-400"}`}>
                  {selectedRam?.modelName ?? "Select RAM…"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {ramGroups.map(({ tier, items }) => (
                  <div key={tier}>
                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {TIER_LABELS[tier]}
                    </div>
                    {items.map((ram) => (
                      <SelectItem key={ram.id} value={ram.id} label={ram.modelName} className="text-sm">
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
            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Resolution
            </Label>
            <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`flex-1 rounded text-xs font-semibold transition-all h-full ${
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
                cpus={cpus}
                gpus={gpus}
                rams={rams}
                resolution={resolution}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        /* Empty prompt */
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-6 py-9 text-center">
          <div className="flex justify-center gap-5 mb-3.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 opacity-20"
              >
                <div className="h-12 w-12 rounded-full border-[3px] border-slate-400" />
                <div className="h-1.5 w-10 rounded bg-slate-300" />
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
