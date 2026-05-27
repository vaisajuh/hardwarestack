import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Always SSR — data lives in the database, not at build time
export const dynamic = "force-dynamic";
import { BottleneckCalculator } from "@/components/calculator/BottleneckCalculator";
import type { CpuOption, GpuOption } from "@/types/hardware";

export const metadata: Metadata = {
  title: "PC Bottleneck Calculator",
};

const AFFILIATE_TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "";

async function getCpus(): Promise<CpuOption[]> {
  const rows = await prisma.cpu.findMany({
    orderBy: [{ tier: "asc" }, { modelName: "asc" }],
    include: {
      retailLinks: { select: { asin: true, retailTitle: true, currentPrice: true, currency: true } },
    },
  });
  return rows as CpuOption[];
}

async function getGpus(): Promise<GpuOption[]> {
  const rows = await prisma.gpu.findMany({
    orderBy: [{ tier: "asc" }, { modelName: "asc" }],
    include: {
      retailLinks: { select: { asin: true, retailTitle: true, currentPrice: true, currency: true } },
    },
  });
  return rows as GpuOption[];
}

export default async function HomePage() {
  const [cpus, gpus] = await Promise.all([getCpus(), getGpus()]);

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900">
            <span className="text-xs font-bold text-white">HS</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 tracking-tight">
            HardwareStack
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            PC Bottleneck Calculator
          </h1>
          <p className="mt-2 text-slate-500 max-w-xl">
            Select your CPU and GPU to instantly calculate which component is
            limiting your gaming performance — and by how much.
          </p>
        </div>

        {cpus.length === 0 || gpus.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700">No hardware data found.</p>
            <p className="mt-1">
              Run{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                npm run db:seed
              </code>{" "}
              to populate the database.
            </p>
          </div>
        ) : (
          <BottleneckCalculator
            cpus={cpus}
            gpus={gpus}
            affiliateTag={AFFILIATE_TAG}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 text-xs text-slate-400">
          Results are based on normalized benchmark scores and are intended as a
          guide. As an Amazon Associate, HardwareStack earns from qualifying
          purchases.
        </div>
      </footer>
    </div>
  );
}
