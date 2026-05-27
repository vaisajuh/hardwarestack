import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BottleneckComponent, CpuOption, GpuOption } from "@/types/hardware";

interface UpgradeCardProps {
  bottleneckComponent: Exclude<BottleneckComponent, "Balanced">;
  cpu: CpuOption;
  gpu: GpuOption;
  affiliateTag: string;
}

function buildAffiliateUrl(asin: string, tag: string): string {
  return `https://www.amazon.de/dp/${asin}?tag=${tag}`;
}

export function UpgradeCard({
  bottleneckComponent,
  cpu,
  gpu,
  affiliateTag,
}: UpgradeCardProps) {
  const component = bottleneckComponent === "CPU" ? cpu : gpu;
  const link = component.retailLinks[0];

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
          <Badge variant="outline" className="shrink-0 text-[10px] text-slate-400 border-slate-200">
            Affiliate Partner
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          Your {bottleneckComponent} is limiting your{" "}
          {bottleneckComponent === "CPU" ? "GPU" : "CPU"}&apos;s potential.
          Upgrading it will unlock measurable FPS gains.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {component.modelName}
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
