import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BottleneckCalculator } from "@/components/calculator/BottleneckCalculator";
import { MethodologySection } from "@/components/calculator/MethodologySection";
import { SystemArchitectureVisualizer } from "@/components/system-architecture-visualizer";
import type { CpuOption, GpuOption, RamOption } from "@/types/hardware";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PC Bottleneck Calculator",
};


const getCpus = unstable_cache(
  async (): Promise<CpuOption[]> => {
    const rows = await prisma.cpu.findMany({
      orderBy: [{ tier: "asc" }, { singleCoreScore: "desc" }],
      include: {
        retailLinks: {
          select: { asin: true, retailTitle: true, currentPrice: true, currency: true },
        },
      },
    });
    return rows as CpuOption[];
  },
  ["cpus"],
  { tags: ["hardware"], revalidate: 86400 }
);

const getGpus = unstable_cache(
  async (): Promise<GpuOption[]> => {
    const rows = await prisma.gpu.findMany({
      orderBy: [{ tier: "asc" }, { rasterScore: "desc" }],
      include: {
        retailLinks: {
          select: { asin: true, retailTitle: true, currentPrice: true, currency: true },
        },
      },
    });
    return rows as GpuOption[];
  },
  ["gpus"],
  { tags: ["hardware"], revalidate: 86400 }
);

const getRams = unstable_cache(
  async (): Promise<RamOption[]> => {
    const rows = await prisma.ram.findMany({
      orderBy: [{ type: "asc" }, { speedMhz: "asc" }],
      include: {
        retailLinks: {
          select: { asin: true, retailTitle: true, currentPrice: true, currency: true },
        },
      },
    });
    return rows as RamOption[];
  },
  ["rams"],
  { tags: ["hardware"], revalidate: 86400 }
);

interface HomePageProps {
  searchParams: Promise<{ cpuId?: string; gpuId?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [cpus, gpus, rams, { cpuId, gpuId }] = await Promise.all([
    getCpus(),
    getGpus(),
    getRams(),
    searchParams,
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          PC Bottleneck Calculator
        </h1>
        <p className="mt-2 text-slate-500 max-w-xl text-sm sm:text-base">
          Select your CPU and GPU to instantly calculate which component limits
          your gaming performance — and by how much.
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
            to populate the database with CPUs, GPUs, and RAM kits.
          </p>
        </div>
      ) : (
        <>
          <BottleneckCalculator
            cpus={cpus}
            gpus={gpus}
            rams={rams}
            defaultCpuId={cpuId}
            defaultGpuId={gpuId}
          />
          <MethodologySection />

          <section className="mt-12">
            <h2 className="text-lg font-bold text-slate-900 mb-1">How Data Moves in Your PC</h2>
            <p className="text-sm text-slate-500 mb-5">
              Select a workload to see which buses are under load and how data flows between components.
            </p>
            <SystemArchitectureVisualizer />
          </section>
        </>
      )}
    </main>
  );
}
