import Anthropic from "@anthropic-ai/sdk";
import type {
  NormalizedCpu,
  NormalizedGpu,
  RawCpuEntry,
  RawGpuEntry,
} from "./types";

const client = new Anthropic();

// ─── Scoring calibration (aligned with existing seed data) ───────────────────
// singleCoreScore ≈ passmarkSingleThread × 0.57   (i9-14900K: 4200 → 2400)
// multiCoreScore  ≈ passmarkMultiCore   × 0.52   (i9-14900K: 81000 → 42000)
// rasterScore     ≈ passmarkGpu         × 0.51   (RTX 4090: 35000 → 18000)

const CPU_SYSTEM = `You are a PC hardware database expert. Given a batch of CPU entries from PassMark benchmarks, classify each one and return structured JSON.

RULES:
- Include ONLY mainstream desktop gaming CPUs: Intel Core i3/i5/i7/i9 or AMD Ryzen 3/5/7/9
- SKIP: server (Xeon, EPYC, Threadripper Pro), mobile (U/H/HX suffix without desktop context), embedded, APU-only, or obscure OEM CPUs
- Vendor: INTEL or AMD only
- Tier:
  - ENTRY:       i3 / Ryzen 3 / budget i5 or Ryzen 5 (passmark single < 3000)
  - MID:         mainstream i5 / Ryzen 5
  - HIGH:        i7 / Ryzen 7 / top Ryzen 5
  - ULTRA:       i9 / Ryzen 9 (non-flagship)
  - ENTHUSIAST:  flagship i9 or Ryzen 9 (current gen top)
- Score normalisation (multiply passmark values by these factors):
  - singleCoreScore = round(passmarkSingle × 0.57)   [range ~1400–2500]
  - multiCoreScore  = round(passmarkMulti  × 0.52)   [range ~8000–45000]
- Fill in best-effort specs (cores, threads, clocks, socket) from your knowledge
- Return null for entries that should be skipped

OUTPUT: JSON array, one element per input item, either a NormalizedCpu object or null.

NormalizedCpu schema:
{
  "modelName": "Intel Core i9-14900K",
  "vendor": "INTEL",
  "cores": 24,
  "threads": 32,
  "baseClockGhz": 3.2,
  "boostClockGhz": 6.0,
  "socket": "LGA1700",
  "tier": "ENTHUSIAST",
  "singleCoreScore": 2400,
  "multiCoreScore": 42000
}`;

const GPU_SYSTEM = `You are a PC hardware database expert. Given a batch of GPU entries from PassMark benchmarks, classify each one and return structured JSON.

RULES:
- Include ONLY discrete desktop gaming GPUs from NVIDIA (GeForce GTX/RTX) or AMD (Radeon RX)
- SKIP: integrated graphics (Intel UHD/Iris, AMD Vega iGPU), Quadro/Tesla/Instinct, laptop variants (Max-Q, Laptop GPU), or very old GPUs (pre-GTX 900 / pre-RX 400)
- Vendor: NVIDIA or AMD only
- Tier:
  - ENTRY:       Budget 1080p (GTX 1650, RX 6500 XT tier)
  - MID:         Solid 1080p/1440p (RTX 3060/4060, RX 7600 tier)
  - HIGH:        Strong 1440p (RTX 3070/4070, RX 6800 XT tier)
  - ULTRA:       High 4K (RTX 3080/4080, RX 7900 XT tier)
  - ENTHUSIAST:  Flagship 4K (RTX 4090, RX 7900 XTX tier)
- Score normalisation:
  - rasterScore = round(passmarkScore × 0.51)   [range ~3000–18000]
- Fill in best-effort specs (vramGb, memoryType, architecture) from your knowledge
- Return null for entries that should be skipped

OUTPUT: JSON array, one element per input item, either a NormalizedGpu object or null.

NormalizedGpu schema:
{
  "modelName": "NVIDIA GeForce RTX 4090",
  "vendor": "NVIDIA",
  "vramGb": 24,
  "memoryType": "GDDR6X",
  "architecture": "Ada Lovelace",
  "tier": "ENTHUSIAST",
  "rasterScore": 18000
}`;

const BATCH_SIZE = 25;

async function callClaude(system: string, userContent: string): Promise<unknown[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: system,
        // Cache the long system prompt — it's identical across all batches
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Extract JSON array from the response (Claude sometimes wraps in markdown)
  const match = /\[[\s\S]*\]/.exec(text);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as unknown[];
  } catch {
    console.error("Failed to parse Claude response:", text.slice(0, 200));
    return [];
  }
}

export async function normalizeCpus(
  raw: RawCpuEntry[]
): Promise<NormalizedCpu[]> {
  const results: NormalizedCpu[] = [];

  for (let i = 0; i < raw.length; i += BATCH_SIZE) {
    const batch = raw.slice(i, i + BATCH_SIZE);
    const userContent = batch
      .map(
        (e, idx) =>
          `${idx + 1}. "${e.name}" — Multi: ${e.multiCoreScore}, Single: ${e.singleThreadScore}`
      )
      .join("\n");

    console.log(
      `  Normalizing CPUs ${i + 1}–${Math.min(i + BATCH_SIZE, raw.length)} of ${raw.length}…`
    );
    const normalized = await callClaude(CPU_SYSTEM, userContent);

    for (const item of normalized) {
      if (item && typeof item === "object") results.push(item as NormalizedCpu);
    }

    // Respectful rate-limit pause between batches
    if (i + BATCH_SIZE < raw.length) await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}

export async function normalizeGpus(
  raw: RawGpuEntry[]
): Promise<NormalizedGpu[]> {
  const results: NormalizedGpu[] = [];

  for (let i = 0; i < raw.length; i += BATCH_SIZE) {
    const batch = raw.slice(i, i + BATCH_SIZE);
    const userContent = batch
      .map((e, idx) => `${idx + 1}. "${e.name}" — Score: ${e.score}`)
      .join("\n");

    console.log(
      `  Normalizing GPUs ${i + 1}–${Math.min(i + BATCH_SIZE, raw.length)} of ${raw.length}…`
    );
    const normalized = await callClaude(GPU_SYSTEM, userContent);

    for (const item of normalized) {
      if (item && typeof item === "object") results.push(item as NormalizedGpu);
    }

    if (i + BATCH_SIZE < raw.length) await new Promise((r) => setTimeout(r, 500));
  }

  return results;
}
