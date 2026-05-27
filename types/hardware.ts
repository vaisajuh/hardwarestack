export type Resolution = "1080p" | "1440p" | "4K";

export type VendorType = "AMD" | "INTEL" | "NVIDIA";

export type TierType = "ENTRY" | "MID" | "HIGH" | "ULTRA" | "ENTHUSIAST";

export interface RetailLinkOption {
  asin: string;
  retailTitle: string;
  currentPrice: number | null;
  currency: string;
}

export interface CpuOption {
  id: string;
  vendor: VendorType;
  modelName: string;
  tier: TierType;
  cores: number;
  threads: number;
  boostClockGhz: number;
  singleCoreScore: number | null;
  retailLinks: RetailLinkOption[];
}

export interface GpuOption {
  id: string;
  vendor: VendorType;
  modelName: string;
  tier: TierType;
  vramGb: number;
  rasterScore: number | null;
  retailLinks: RetailLinkOption[];
}

export type BottleneckComponent = "CPU" | "GPU" | "Balanced";

export interface BottleneckResult {
  cpuUtilization: number;
  gpuUtilization: number;
  bottleneckComponent: BottleneckComponent;
  bottleneckPercentage: number;
}
