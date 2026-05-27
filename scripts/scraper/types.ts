export interface RawCpuEntry {
  name: string;
  multiCoreScore: number;
  singleThreadScore: number;
}

export interface RawGpuEntry {
  name: string;
  score: number;
}

export type Tier = "ENTRY" | "MID" | "HIGH" | "ULTRA" | "ENTHUSIAST";
export type Vendor = "AMD" | "INTEL" | "NVIDIA";

export interface NormalizedCpu {
  modelName: string;
  vendor: "AMD" | "INTEL";
  cores: number;
  threads: number;
  baseClockGhz: number;
  boostClockGhz: number;
  socket: string;
  tier: Tier;
  singleCoreScore: number;
  multiCoreScore: number;
}

export interface NormalizedGpu {
  modelName: string;
  vendor: "AMD" | "NVIDIA";
  vramGb: number;
  memoryType: string;
  architecture: string;
  tier: Tier;
  rasterScore: number;
}

export interface AmazonHit {
  asin: string;
  title: string;
  price: number | null;
  currency: string;
}
