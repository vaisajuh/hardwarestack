"use client";

import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { calculateBottleneck } from "@/lib/bottleneck";
import type {
  BottleneckComponent,
  CpuOption,
  GpuOption,
  RamOption,
  Resolution,
} from "@/types/hardware";

interface UpgradeCardProps {
  bottleneckComponent: Exclude<BottleneckComponent, "Balanced">;
  cpu: CpuOption;
  gpu: GpuOption;
  ram?: RamOption;
  cpus: CpuOption[];
  gpus: GpuOption[];
  rams: RamOption[];
  resolution: Resolution;
}

function pcPartPickerQuery(name: string): string {
  return name
    .replace("Intel Core ", "")         // "i9-14900K"
    .replace(/AMD Ryzen \d+ /, "")      // "5950X", "7950X"
    .replace("NVIDIA GeForce ", "")     // "RTX 3090"
    .replace("AMD Radeon ", "");        // "RX 7900 XTX"
}

function buildGoogleShoppingUrl(modelName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(modelName)}&tbm=shop`;
}

function buildPcPartPickerUrl(modelName: string): string {
  return `https://pcpartpicker.com/search/?q=${encodeURIComponent(pcPartPickerQuery(modelName))}`;
}

// Find the cheapest upgrade that actually eliminates the bottleneck when
// paired with the current (non-bottleneck) components.
function findMinimalUpgrade(
  bottleneckComponent: Exclude<BottleneckComponent, "Balanced">,
  cpu: CpuOption,
  gpu: GpuOption,
  ram: RamOption | undefined,
  cpus: CpuOption[],
  gpus: GpuOption[],
  rams: RamOption[],
  resolution: Resolution
): CpuOption | GpuOption | RamOption | null {
  if (bottleneckComponent === "GPU") {
    const current = gpu.rasterScore ?? 0;
    const candidates = gpus
      .filter((g) => g.id !== gpu.id && (g.rasterScore ?? 0) > current)
      .sort((a, b) => (a.rasterScore ?? 0) - (b.rasterScore ?? 0));
    for (const candidate of candidates) {
      if (calculateBottleneck(cpu, candidate, resolution, ram).bottleneckComponent !== "GPU") {
        return candidate;
      }
    }
    // At high resolutions no GPU may fully resolve the bottleneck — suggest the strongest available.
    return candidates[candidates.length - 1] ?? null;
  }

  if (bottleneckComponent === "CPU") {
    const TIER_RANK: Record<string, number> = { ENTRY: 0, MID: 1, HIGH: 2, ULTRA: 3, ENTHUSIAST: 4 };
    const currentTier = TIER_RANK[cpu.tier] ?? 0;
    const currentSingle = cpu.singleCoreScore ?? 0;
    const candidates = cpus
      .filter(
        (c) =>
          c.id !== cpu.id &&
          c.vendor === cpu.vendor &&
          ((TIER_RANK[c.tier] ?? 0) > currentTier ||
            ((TIER_RANK[c.tier] ?? 0) === currentTier && (c.singleCoreScore ?? 0) > currentSingle))
      )
      .sort((a, b) => {
        const td = (TIER_RANK[a.tier] ?? 0) - (TIER_RANK[b.tier] ?? 0);
        return td !== 0 ? td : (a.singleCoreScore ?? 0) - (b.singleCoreScore ?? 0);
      });
    for (const candidate of candidates) {
      if (calculateBottleneck(candidate, gpu, resolution, ram).bottleneckComponent !== "CPU") {
        return candidate;
      }
    }
    return candidates[candidates.length - 1] ?? null;
  }

  if (bottleneckComponent === "RAM" && ram) {
    const currentBw = ram.speedMhz * ram.channels;
    const candidates = rams
      .filter((r) => r.id !== ram.id && r.speedMhz * r.channels > currentBw)
      .sort((a, b) => a.speedMhz * a.channels - b.speedMhz * b.channels);
    for (const candidate of candidates) {
      if (calculateBottleneck(cpu, gpu, resolution, candidate).bottleneckComponent !== "RAM") {
        return candidate;
      }
    }
    return candidates[candidates.length - 1] ?? null;
  }

  return null;
}

function gpuDescription(resolution: Resolution): string {
  if (resolution === "4K") {
    return "4K is extremely GPU-demanding. No single upgrade may fully close the gap — this is the strongest option in our database.";
  }
  return "Your graphics card can't keep up at this resolution. A GPU upgrade will directly improve frame rates.";
}

export function UpgradeCard({
  bottleneckComponent,
  cpu,
  gpu,
  ram,
  cpus,
  gpus,
  rams,
  resolution,
}: UpgradeCardProps) {
  const upgrade = findMinimalUpgrade(
    bottleneckComponent,
    cpu,
    gpu,
    ram,
    cpus,
    gpus,
    rams,
    resolution
  );

  if (!upgrade) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-800">
          Upgrade Recommendation
        </CardTitle>
        <p className="text-xs text-slate-500">
          {bottleneckComponent === "GPU"
            ? gpuDescription(resolution)
            : bottleneckComponent === "CPU"
              ? "Your processor is the limiting factor. A faster CPU will unlock your GPU's full potential."
              : "Slow or single-channel RAM is starving your CPU. Upgrading to faster dual-channel memory can deliver measurable FPS gains."}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
          <p className="flex-1 text-sm font-medium text-slate-800 min-w-0 truncate">
            {upgrade.modelName}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={buildPcPartPickerUrl(upgrade.modelName)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "no-underline border-slate-200 text-slate-700 hover:bg-slate-100"
              )}
            >
              PCPartPicker
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </a>
            <a
              href={buildGoogleShoppingUrl(upgrade.modelName)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "no-underline bg-slate-900 hover:bg-slate-700"
              )}
            >
              Google Shopping
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
