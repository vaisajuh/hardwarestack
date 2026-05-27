import type {
  BottleneckResult,
  CpuOption,
  GpuOption,
  Resolution,
} from "@/types/hardware";

const RESOLUTION_PIXEL_RATIO: Record<Resolution, number> = {
  "1080p": 1.0,
  "1440p": 1.78,
  "4K": 4.0,
};

const BALANCED_THRESHOLD = 10;

export function calculateBottleneck(
  cpu: CpuOption,
  gpu: GpuOption,
  resolution: Resolution
): BottleneckResult {
  const cpuScore = cpu.singleCoreScore ?? 0;
  const gpuBaseScore = gpu.rasterScore ?? 0;

  // GPU has to render more pixels at higher resolutions → effective score drops
  const effectiveGpuScore = gpuBaseScore / RESOLUTION_PIXEL_RATIO[resolution];

  const max = Math.max(cpuScore, effectiveGpuScore);
  const bottleneckPercentage =
    max > 0 ? (Math.abs(cpuScore - effectiveGpuScore) / max) * 100 : 0;

  if (bottleneckPercentage < BALANCED_THRESHOLD || max === 0) {
    return {
      cpuUtilization: 100,
      gpuUtilization: 100,
      bottleneckComponent: "Balanced",
      bottleneckPercentage,
    };
  }

  if (cpuScore < effectiveGpuScore) {
    return {
      cpuUtilization: 100,
      gpuUtilization: Math.round((cpuScore / effectiveGpuScore) * 100),
      bottleneckComponent: "CPU",
      bottleneckPercentage,
    };
  }

  return {
    cpuUtilization: Math.round((effectiveGpuScore / cpuScore) * 100),
    gpuUtilization: 100,
    bottleneckComponent: "GPU",
    bottleneckPercentage,
  };
}
