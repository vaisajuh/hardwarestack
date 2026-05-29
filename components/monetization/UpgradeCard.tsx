"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  affiliateTag: string;
}

function buildAffiliateUrl(asin: string, tag: string): string {
  return `https://www.amazon.de/dp/${asin}?tag=${tag}`;
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
      .filter((g) => g.id !== gpu.id && (g.rasterScore ?? 0) > current && g.retailLinks.length > 0)
      .sort((a, b) => (a.rasterScore ?? 0) - (b.rasterScore ?? 0));
    for (const candidate of candidates) {
      if (calculateBottleneck(cpu, candidate, resolution, ram).bottleneckComponent !== "GPU") {
        return candidate;
      }
    }
    return null;
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
          c.retailLinks.length > 0 &&
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
    return null;
  }

  if (bottleneckComponent === "RAM" && ram) {
    const currentBw = ram.speedMhz * ram.channels;
    const candidates = rams
      .filter((r) => r.id !== ram.id && r.speedMhz * r.channels > currentBw && r.retailLinks.length > 0)
      .sort((a, b) => a.speedMhz * a.channels - b.speedMhz * b.channels);
    for (const candidate of candidates) {
      if (calculateBottleneck(cpu, gpu, resolution, candidate).bottleneckComponent !== "RAM") {
        return candidate;
      }
    }
    return null;
  }

  return null;
}

const DESCRIPTIONS: Record<Exclude<BottleneckComponent, "Balanced">, string> = {
  CPU: "Your processor is the limiting factor. A faster CPU will unlock your GPU's full potential.",
  GPU: "Your graphics card can't keep up at this resolution. A GPU upgrade will directly improve frame rates.",
  RAM: "Slow or single-channel RAM is starving your CPU. Upgrading to faster dual-channel memory can deliver measurable FPS gains.",
};

export function UpgradeCard({
  bottleneckComponent,
  cpu,
  gpu,
  ram,
  cpus,
  gpus,
  rams,
  resolution,
  affiliateTag,
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

  const link = upgrade.retailLinks[0];
  if (!link) return null;

  const href = buildAffiliateUrl(link.asin, affiliateTag);
  const priceDisplay =
    link.currentPrice != null
      ? new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: link.currency,
        }).format(link.currentPrice)
      : null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Upgrade Recommendation
          </CardTitle>
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] text-slate-400 border-slate-200"
          >
            Affiliate Partner
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          {DESCRIPTIONS[bottleneckComponent]}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {upgrade.modelName}
            </p>
            {priceDisplay && (
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {priceDisplay}
              </p>
            )}
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "shrink-0 bg-slate-900 hover:bg-slate-700 no-underline"
            )}
          >
            Check Price
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
