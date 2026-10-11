import { describe, it, expect } from "vitest";
import { bitsPerWeight, checkFit, estimateMemory, minVramGb } from "./ai-fit";
import { LLM_MODELS, getLlmModel } from "./llm-models";
import type { GpuSpec, SystemRamSpec } from "./ai-fit";
import type { LlmModel } from "@/types/local-ai";

const model = (slug: string): LlmModel => {
  const m = getLlmModel(slug);
  if (!m) throw new Error(`missing model ${slug}`);
  return m;
};

const rtx4060Ti: GpuSpec = { vramGb: 8, memoryBandwidthGbs: 288 };
const rtx4090: GpuSpec = { vramGb: 24, memoryBandwidthGbs: 1008 };
const ddr5x64: SystemRamSpec = { capacityGb: 64, speedMhz: 6000, channels: 2 };
const ddr5x16: SystemRamSpec = { capacityGb: 16, speedMhz: 6000, channels: 2 };

describe("estimateMemory", () => {
  it("sums weights, KV cache and runtime overhead", () => {
    const mem = estimateMemory(model("llama-3-1-8b"), "Q4_K_M", 8192);
    expect(mem.weightsGib).toBeCloseTo(4.53, 2);
    expect(mem.kvCacheGib).toBeCloseTo(1.0, 5);
    expect(mem.overheadGib).toBe(1);
    expect(mem.totalGib).toBeCloseTo(6.53, 2);
  });

  it("caps sliding-window layers at the window size", () => {
    const mem = estimateMemory(model("gemma-3-27b"), "Q4_K_M", 32_768);
    expect(mem.kvCacheGib).toBeCloseTo(2.5 + 0.40625, 5);
  });

  it("clamps the context to the model's maximum", () => {
    const mem = estimateMemory(model("phi-4-14b"), "Q4_K_M", 131_072);
    expect(mem.kvCacheGib).toBeCloseTo(3.125, 5);
  });

  it("uses measured checkpoint sizes for pre-quantised models", () => {
    const mem = estimateMemory(model("gpt-oss-20b"), "MXFP4", 8192);
    expect(mem.weightsGib).toBeCloseTo(12.8, 1);
  });
});

describe("bitsPerWeight", () => {
  it("rejects quantisations the model isn't published in", () => {
    expect(() => bitsPerWeight(model("gpt-oss-20b"), "Q4_K_M")).toThrow();
  });
});

describe("checkFit", () => {
  it("runs a small model entirely on an 8 GB card", () => {
    const fit = checkFit({
      model: model("llama-3-1-8b"),
      quant: "Q4_K_M",
      contextTokens: 8192,
      gpu: rtx4060Ti,
      ram: null,
    });
    expect(fit.status).toBe("gpu");
    expect(fit.gpuWeightShare).toBe(1);
    expect(fit.tokensPerSecond).toBeCloseTo(39, 0);
  });

  it("offloads a 70B model to system RAM when there is enough of it", () => {
    const fit = checkFit({
      model: model("llama-3-3-70b"),
      quant: "Q4_K_M",
      contextTokens: 8192,
      gpu: rtx4090,
      ram: ddr5x64,
    });
    expect(fit.status).toBe("partial");
    expect(fit.gpuWeightShare).toBeCloseTo(0.485, 2);
    expect(fit.tokensPerSecond).toBeCloseTo(2.4, 1);
  });

  it("reports no fit when VRAM plus usable RAM is too small", () => {
    const fit = checkFit({
      model: model("llama-3-3-70b"),
      quant: "Q4_K_M",
      contextTokens: 8192,
      gpu: rtx4090,
      ram: ddr5x16,
    });
    expect(fit.status).toBe("none");
    expect(fit.tokensPerSecond).toBeNull();
  });

  it("estimates speed from active parameters for mixture-of-experts models", () => {
    const fit = checkFit({
      model: model("qwen3-30b-a3b"),
      quant: "Q4_K_M",
      contextTokens: 8192,
      gpu: rtx4090,
      ram: null,
    });
    expect(fit.status).toBe("gpu");
    expect(fit.tokensPerSecond).toBeCloseTo(231, 0);
  });

  it("still checks fit when the GPU's bandwidth is unknown", () => {
    const fit = checkFit({
      model: model("llama-3-1-8b"),
      quant: "Q4_K_M",
      contextTokens: 8192,
      gpu: { vramGb: 8, memoryBandwidthGbs: null },
      ram: null,
    });
    expect(fit.status).toBe("gpu");
    expect(fit.tokensPerSecond).toBeNull();
  });
});

describe("minVramGb", () => {
  it("rounds up to the smallest whole-GB card that fits", () => {
    expect(minVramGb(model("llama-3-1-8b"), "Q4_K_M", 8192)).toBe(7);
    expect(minVramGb(model("llama-3-3-70b"), "Q4_K_M", 8192)).toBe(46);
  });
});

describe("LLM_MODELS", () => {
  it("has unique slugs", () => {
    const slugs = LLM_MODELS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(LLM_MODELS.map((m) => [m.slug, m] as const))("%s is internally consistent", (_, m) => {
    expect(m.quants.length).toBeGreaterThan(0);
    expect(m.paramsB).toBeGreaterThan(0);
    expect(m.activeParamsB ?? m.paramsB).toBeLessThanOrEqual(m.paramsB);
    expect(m.kvBytesPerToken).toBeGreaterThan(0);
    expect(m.maxContextTokens).toBeGreaterThan(0);
    expect(m.releaseDate).toMatch(/^\d{4}-\d{2}$/);
  });
});
