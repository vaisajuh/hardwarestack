/**
 * HardwareStack scraping pipeline
 *
 * Usage:
 *   npm run scraper:cpus        – scrape + normalise CPUs → DB
 *   npm run scraper:gpus        – scrape + normalise GPUs → DB
 *   npm run scraper:amazon      – enrich DB entries with Amazon ASINs + prices
 *   npm run scraper:all         – run all three in sequence
 *
 * Intermediate results are cached in scripts/scraper/.cache/ so a failed run
 * can resume without re-scraping or re-calling the Claude API.
 *
 * Requires: DATABASE_URL and ANTHROPIC_API_KEY in .env
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { scrapeCpus, scrapeGpus } from "./sources/passmark";
import { searchAmazon } from "./sources/amazon";
import { normalizeCpus, normalizeGpus } from "./normalizer";
import { prisma } from "./db";
import type { NormalizedCpu, NormalizedGpu } from "./types";

const CACHE_DIR = path.join(__dirname, ".cache");

function cacheRead<T>(file: string): T | null {
  const p = path.join(CACHE_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function cacheWrite(file: string, data: unknown): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, file), JSON.stringify(data, null, 2));
}

// ─── CPU pipeline ────────────────────────────────────────────────────────────

async function runCpus() {
  console.log("\n=== CPU pipeline ===");

  let raw = cacheRead<ReturnType<typeof scrapeCpus> extends Promise<infer T> ? T : never>("cpus-raw.json");
  if (!raw) {
    console.log("Scraping PassMark CPU list…");
    raw = await scrapeCpus(300);
    cacheWrite("cpus-raw.json", raw);
    console.log(`  Scraped ${raw.length} raw entries`);
  } else {
    console.log(`  Using cached raw data (${raw.length} entries)`);
  }

  let normalized = cacheRead<NormalizedCpu[]>("cpus-normalized.json");
  if (!normalized) {
    console.log("Normalizing with Claude API…");
    normalized = await normalizeCpus(raw);
    cacheWrite("cpus-normalized.json", normalized);
    console.log(`  Kept ${normalized.length} valid desktop CPUs`);
  } else {
    console.log(`  Using cached normalized data (${normalized.length} entries)`);
  }

  console.log("Upserting to database…");
  let upserted = 0;
  for (const cpu of normalized) {
    await prisma.cpu.upsert({
      where: { modelName: cpu.modelName },
      update: {
        tier: cpu.tier,
        singleCoreScore: cpu.singleCoreScore,
        multiCoreScore: cpu.multiCoreScore,
      },
      create: cpu,
    });
    upserted++;
  }
  console.log(`  Upserted ${upserted} CPUs ✓`);
}

// ─── GPU pipeline ────────────────────────────────────────────────────────────

async function runGpus() {
  console.log("\n=== GPU pipeline ===");

  let raw = cacheRead<ReturnType<typeof scrapeGpus> extends Promise<infer T> ? T : never>("gpus-raw.json");
  if (!raw) {
    console.log("Scraping PassMark GPU list…");
    raw = await scrapeGpus(200);
    cacheWrite("gpus-raw.json", raw);
    console.log(`  Scraped ${raw.length} raw entries`);
  } else {
    console.log(`  Using cached raw data (${raw.length} entries)`);
  }

  let normalized = cacheRead<NormalizedGpu[]>("gpus-normalized.json");
  if (!normalized) {
    console.log("Normalizing with Claude API…");
    normalized = await normalizeGpus(raw);
    cacheWrite("gpus-normalized.json", normalized);
    console.log(`  Kept ${normalized.length} valid discrete GPUs`);
  } else {
    console.log(`  Using cached normalized data (${normalized.length} entries)`);
  }

  console.log("Upserting to database…");
  let upserted = 0;
  for (const gpu of normalized) {
    await prisma.gpu.upsert({
      where: { modelName: gpu.modelName },
      update: { tier: gpu.tier, rasterScore: gpu.rasterScore },
      create: gpu,
    });
    upserted++;
  }
  console.log(`  Upserted ${upserted} GPUs ✓`);
}

// ─── Amazon enrichment pipeline ──────────────────────────────────────────────

async function runAmazon() {
  console.log("\n=== Amazon enrichment pipeline ===");

  const [cpus, gpus, rams] = await Promise.all([
    prisma.cpu.findMany({ include: { retailLinks: true } }),
    prisma.gpu.findMany({ include: { retailLinks: true } }),
    prisma.ram.findMany({ include: { retailLinks: true } }),
  ]);

  // Only enrich entries that have no retail link yet
  const cpusToEnrich = cpus.filter((c) => c.retailLinks.length === 0);
  const gpusToEnrich = gpus.filter((g) => g.retailLinks.length === 0);
  const ramsToEnrich = rams.filter((r) => r.retailLinks.length === 0);

  console.log(
    `  Enriching ${cpusToEnrich.length} CPUs, ${gpusToEnrich.length} GPUs, ${ramsToEnrich.length} RAM kits`
  );

  const DELAY_MS = 3000; // be respectful to Amazon

  for (const cpu of cpusToEnrich) {
    console.log(`  Searching Amazon: ${cpu.modelName}`);
    const hit = await searchAmazon(cpu.modelName);
    if (hit) {
      await prisma.retailLink.upsert({
        where: { asin: hit.asin },
        update: { currentPrice: hit.price },
        create: {
          asin: hit.asin,
          retailTitle: hit.title,
          currentPrice: hit.price,
          currency: hit.currency,
          cpuId: cpu.id,
        },
      });
      console.log(`    ✓ ASIN ${hit.asin}${hit.price ? ` — €${hit.price}` : ""}`);
    } else {
      console.log(`    ✗ No result`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  for (const gpu of gpusToEnrich) {
    console.log(`  Searching Amazon: ${gpu.modelName}`);
    const hit = await searchAmazon(gpu.modelName);
    if (hit) {
      await prisma.retailLink.upsert({
        where: { asin: hit.asin },
        update: { currentPrice: hit.price },
        create: {
          asin: hit.asin,
          retailTitle: hit.title,
          currentPrice: hit.price,
          currency: hit.currency,
          gpuId: gpu.id,
        },
      });
      console.log(`    ✓ ASIN ${hit.asin}${hit.price ? ` — €${hit.price}` : ""}`);
    } else {
      console.log(`    ✗ No result`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  for (const ram of ramsToEnrich) {
    console.log(`  Searching Amazon: ${ram.modelName}`);
    const hit = await searchAmazon(ram.modelName);
    if (hit) {
      await prisma.retailLink.upsert({
        where: { asin: hit.asin },
        update: { currentPrice: hit.price },
        create: {
          asin: hit.asin,
          retailTitle: hit.title,
          currentPrice: hit.price,
          currency: hit.currency,
          ramId: ram.id,
        },
      });
      console.log(`    ✓ ASIN ${hit.asin}${hit.price ? ` — €${hit.price}` : ""}`);
    } else {
      console.log(`    ✗ No result`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log("  Amazon enrichment complete ✓");
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const MODE = process.argv[2] ?? "all";

async function main() {
  try {
    if (MODE === "cpus" || MODE === "all") await runCpus();
    if (MODE === "gpus" || MODE === "all") await runGpus();
    if (MODE === "amazon" || MODE === "all") await runAmazon();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
