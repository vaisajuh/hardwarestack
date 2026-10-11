import { describe, it, expect } from "vitest";
import { dedupeGpusByName, formatGb, formatSpeed } from "./ai-format";
import { defaultQuant, getLlmModel } from "./llm-models";

describe("dedupeGpusByName", () => {
  it("keeps the first of names that differ only in casing", () => {
    const gpus = [
      { id: "a", modelName: "NVIDIA GeForce RTX 4070 SUPER" },
      { id: "b", modelName: "NVIDIA GeForce RTX 4070 Super" },
      { id: "c", modelName: "NVIDIA GeForce RTX 4070" },
    ];
    expect(dedupeGpusByName(gpus).map((g) => g.id)).toEqual(["a", "c"]);
  });
});

describe("formatting", () => {
  it("shows one decimal below 10 and whole numbers above", () => {
    expect(formatGb(6.534)).toBe("6.5");
    expect(formatGb(43.33)).toBe("43");
    expect(formatGb(9.97)).toBe("10");
    expect(formatSpeed(2.43)).toBe("~2.4 tok/s");
    expect(formatSpeed(38.9)).toBe("~39 tok/s");
    expect(formatSpeed(null)).toBe("—");
  });
});

describe("defaultQuant", () => {
  it("prefers Q4 and falls back to the native format", () => {
    expect(defaultQuant(getLlmModel("llama-3-1-8b")!)).toBe("Q4_K_M");
    expect(defaultQuant(getLlmModel("gpt-oss-20b")!)).toBe("MXFP4");
  });
});
