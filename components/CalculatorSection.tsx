"use client";

import { useState } from "react";
import { BottleneckCalculator } from "@/components/calculator/BottleneckCalculator";
import { SystemArchitectureVisualizer } from "@/components/system-architecture-visualizer";
import type { CpuOption, GpuOption, RamOption, BottleneckResult, Resolution } from "@/types/hardware";

export interface LiveData {
  result: BottleneckResult;
  cpuName: string;
  gpuName: string;
  resolution: Resolution;
}

interface Props {
  cpus: CpuOption[];
  gpus: GpuOption[];
  rams: RamOption[];
  defaultCpuId?: string;
  defaultGpuId?: string;
  children: React.ReactNode;
}

export function CalculatorSection({ cpus, gpus, rams, defaultCpuId, defaultGpuId, children }: Props) {
  const [liveData, setLiveData] = useState<LiveData | null>(null);

  return (
    <>
      <BottleneckCalculator
        cpus={cpus}
        gpus={gpus}
        rams={rams}
        defaultCpuId={defaultCpuId}
        defaultGpuId={defaultGpuId}
        onResultChange={(result, cpu, gpu, resolution) => {
          if (result && cpu && gpu) {
            setLiveData({ result, cpuName: cpu.modelName, gpuName: gpu.modelName, resolution });
          } else {
            setLiveData(null);
          }
        }}
      />

      {children}

      <section className="mt-12">
        <h2 className="text-lg font-bold text-slate-900 mb-1">How Data Moves in Your PC</h2>
        <p className="text-sm text-slate-500 mb-5">
          {liveData
            ? "Showing your build's data flow. Select a workload to compare against reference scenarios."
            : "Select a CPU and GPU above to see your build's data flow, or choose a reference workload below."}
        </p>
        <SystemArchitectureVisualizer liveData={liveData} />
      </section>
    </>
  );
}
