import { chromium } from "playwright";
import type { RawCpuEntry, RawGpuEntry } from "../types";

const CHROMIUM_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

async function scrapeTable(
  url: string,
  tableSelector: string,
  parseRow: (cells: string[]) => unknown
): Promise<unknown[]> {
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  await page.goto(url, { waitUntil: "networkidle" });

  // Expand DataTable to maximum rows when possible
  try {
    const lengthSelect = page.locator('select[name$="length"]').first();
    await lengthSelect.selectOption("-1");
    await page.waitForTimeout(1500);
  } catch {
    // page may not have a DataTable length control — that's fine
  }

  await page.waitForSelector(tableSelector, { timeout: 15_000 });

  const rows = await page.evaluate(
    ({ sel }: { sel: string }) => {
      const trs = Array.from(
        document.querySelectorAll(`${sel} tbody tr`)
      );
      return trs.map((tr) =>
        Array.from(tr.querySelectorAll("td")).map(
          (td) => td.textContent?.trim() ?? ""
        )
      );
    },
    { sel: tableSelector }
  );

  await browser.close();
  return rows.map(parseRow).filter(Boolean);
}

function parseScore(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ""), 10) || 0;
}

export async function scrapeCpus(limit = 300): Promise<RawCpuEntry[]> {
  const rows = (await scrapeTable(
    "https://www.cpubenchmark.net/cpu_list.php",
    "table#cputable",
    (cells) => {
      if (cells.length < 3) return null;
      const name = cells[0]?.replace(/\s+/g, " ").trim();
      const multi = parseScore(cells[1] ?? "");
      const single = parseScore(cells[2] ?? "");
      if (!name || multi === 0) return null;
      return { name, multiCoreScore: multi, singleThreadScore: single } satisfies RawCpuEntry;
    }
  )) as RawCpuEntry[];

  // Sort descending by single-thread (most game-relevant) and cap
  return rows
    .sort((a, b) => b.singleThreadScore - a.singleThreadScore)
    .slice(0, limit);
}

export async function scrapeGpus(limit = 200): Promise<RawGpuEntry[]> {
  const rows = (await scrapeTable(
    "https://www.videocardbenchmark.net/gpu_list.php",
    "table#gputable",
    (cells) => {
      if (cells.length < 2) return null;
      const name = cells[0]?.replace(/\s+/g, " ").trim();
      const score = parseScore(cells[1] ?? "");
      if (!name || score === 0) return null;
      return { name, score } satisfies RawGpuEntry;
    }
  )) as RawGpuEntry[];

  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}
