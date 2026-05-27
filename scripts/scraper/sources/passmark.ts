import { chromium } from "playwright";
import type { RawCpuEntry, RawGpuEntry } from "../types";

const CHROMIUM_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

// Both cpubenchmark.net and videocardbenchmark.net use the same table id.
// Column layout (confirmed via DOM inspection):
//   [0] Name  [1] Mark (multi-core)  [2] Chart rank (1 = best)  [3] NA  [4] NA
const TABLE_SEL = "table#cputable";

async function scrapeSite(url: string): Promise<{ name: string; score: number; rank: number }[]> {
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(TABLE_SEL, { timeout: 20_000 });

  const rows = await page.evaluate((sel: string) => {
    return Array.from(document.querySelectorAll(`${sel} tbody tr`)).map((tr) => {
      const cells = Array.from(tr.querySelectorAll("td")).map(
        (td) => td.textContent?.trim() ?? ""
      );
      return cells;
    });
  }, TABLE_SEL);

  await browser.close();

  return rows
    .filter((cells) => cells.length >= 3 && cells[0] && !cells[0].startsWith("Add other"))
    .map((cells) => ({
      name: cells[0]!.replace(/\s+/g, " ").trim(),
      score: parseInt(cells[1]!.replace(/[^0-9]/g, ""), 10) || 0,
      rank: parseInt(cells[2]!.replace(/[^0-9]/g, ""), 10) || 999999,
    }))
    .filter((e) => e.score > 0);
}

export async function scrapeCpus(limit = 300): Promise<RawCpuEntry[]> {
  const rows = await scrapeSite("https://www.cpubenchmark.net/cpu_list.php");
  // Rank 1 = highest performing CPU
  return rows
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ name, score, rank }) => ({ name, multiCoreScore: score, rank }));
}

export async function scrapeGpus(limit = 200): Promise<RawGpuEntry[]> {
  const rows = await scrapeSite("https://www.videocardbenchmark.net/gpu_list.php");
  return rows
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ name, score, rank }) => ({ name, score, rank }));
}
