import { QUANT_LEVELS } from "./llm-models";
import type { GpuOption, RamOption } from "@/types/hardware";
import type { LlmModel, QuantId } from "@/types/local-ai";

// Capacities are GiB: a "24 GB" card has 24 GiB. Bandwidths are decimal GB/s.
const BYTES_PER_GIB = 1024 ** 3;

// CUDA/ROCm context and compute buffers on top of weights + KV cache.
const RUNTIME_OVERHEAD_GIB = 1.0;

// The desktop and driver keep a slice of VRAM; the OS and apps keep a slice of RAM.
const USABLE_VRAM_FRACTION = 0.95;
const USABLE_RAM_FRACTION = 0.75;

// Token generation is memory-bound: every token reads all active weights once.
// Real runtimes reach roughly these fractions of the theoretical bandwidth.
const GPU_BANDWIDTH_EFFICIENCY = 0.7;
const RAM_BANDWIDTH_EFFICIENCY = 0.6;

// Fixed per-token cost (kernel launches, sampling) that dominates for small models.
const PER_TOKEN_OVERHEAD_SECONDS = 0.0015;

export type GpuSpec = Pick<GpuOption, "vramGb" | "memoryBandwidthGbs">;
export type SystemRamSpec = Pick<RamOption, "capacityGb" | "speedMhz" | "channels">;

export type FitStatus = "gpu" | "partial" | "none";

export interface MemoryEstimate {
  weightsGib: number;
  kvCacheGib: number;
  overheadGib: number;
  totalGib: number;
}

export interface FitInput {
  model: LlmModel;
  quant: QuantId;
  contextTokens: number;
  gpu: GpuSpec;
  ram: SystemRamSpec | null;
}

export interface FitResult {
  status: FitStatus;
  memory: MemoryEstimate;
  usableVramGib: number;
  gpuWeightShare: number;         // fraction of the weights held in VRAM, 0–1
  tokensPerSecond: number | null; // null when it won't run or bandwidth is unknown
}

export function bitsPerWeight(model: LlmModel, quant: QuantId): number {
  if (!model.quants.includes(quant)) {
    throw new Error(`${model.name} is not available as ${quant}`);
  }
  return model.quantBitsOverride?.[quant] ?? QUANT_LEVELS[quant].bitsPerWeight;
}

function kvCacheBytes(model: LlmModel, contextTokens: number): number {
  const full = model.kvBytesPerToken * contextTokens;
  const window = model.slidingWindowKv;
  const sliding = window
    ? window.bytesPerToken * Math.min(contextTokens, window.windowTokens)
    : 0;
  return full + sliding;
}

export function estimateMemory(
  model: LlmModel,
  quant: QuantId,
  contextTokens: number
): MemoryEstimate {
  const ctx = Math.min(contextTokens, model.maxContextTokens);
  const weightsGib = (model.paramsB * 1e9 * bitsPerWeight(model, quant)) / 8 / BYTES_PER_GIB;
  const kvCacheGib = kvCacheBytes(model, ctx) / BYTES_PER_GIB;
  return {
    weightsGib,
    kvCacheGib,
    overheadGib: RUNTIME_OVERHEAD_GIB,
    totalGib: weightsGib + kvCacheGib + RUNTIME_OVERHEAD_GIB,
  };
}

// Theoretical bandwidth in GB/s: MT/s × 8 bytes per 64-bit channel.
function ramBandwidthGbs(ram: SystemRamSpec): number {
  return (ram.speedMhz * 8 * ram.channels) / 1000;
}

function estimateTokensPerSecond(
  model: LlmModel,
  quant: QuantId,
  gpuWeightShare: number,
  gpu: GpuSpec,
  ram: SystemRamSpec | null
): number | null {
  if (gpu.memoryBandwidthGbs === null) return null;
  const activeGb = ((model.activeParamsB ?? model.paramsB) * bitsPerWeight(model, quant)) / 8;
  let seconds =
    (activeGb * gpuWeightShare) / (gpu.memoryBandwidthGbs * GPU_BANDWIDTH_EFFICIENCY);
  if (gpuWeightShare < 1) {
    if (!ram) return null;
    seconds +=
      (activeGb * (1 - gpuWeightShare)) / (ramBandwidthGbs(ram) * RAM_BANDWIDTH_EFFICIENCY);
  }
  return 1 / (seconds + PER_TOKEN_OVERHEAD_SECONDS);
}

export function checkFit({ model, quant, contextTokens, gpu, ram }: FitInput): FitResult {
  const memory = estimateMemory(model, quant, contextTokens);
  const usableVramGib = gpu.vramGb * USABLE_VRAM_FRACTION;
  const usableRamGib = ram ? ram.capacityGb * USABLE_RAM_FRACTION : 0;

  // KV cache and runtime buffers stay on the GPU; whatever weights don't fit spill to RAM.
  const vramForWeights = usableVramGib - memory.kvCacheGib - memory.overheadGib;
  const gpuWeightShare = Math.min(1, Math.max(0, vramForWeights / memory.weightsGib));
  const spillGib = Math.max(0, memory.totalGib - usableVramGib);

  const status: FitStatus =
    spillGib === 0 ? "gpu" : spillGib <= usableRamGib ? "partial" : "none";

  return {
    status,
    memory,
    usableVramGib,
    gpuWeightShare,
    tokensPerSecond:
      status === "none" ? null : estimateTokensPerSecond(model, quant, gpuWeightShare, gpu, ram),
  };
}

// Smallest advertised VRAM size (whole GB) that runs the model entirely on the GPU.
export function minVramGb(model: LlmModel, quant: QuantId, contextTokens: number): number {
  return Math.ceil(estimateMemory(model, quant, contextTokens).totalGib / USABLE_VRAM_FRACTION);
}
