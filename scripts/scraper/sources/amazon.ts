import { chromium } from "playwright";
import type { AmazonHit } from "../types";

const SEARCH_BASE = "https://www.amazon.de/s";
const CHROMIUM_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

const ASIN_RE = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/;

function extractAsin(url: string): string | null {
  return ASIN_RE.exec(url)?.[1] ?? null;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Extract tokens from the model name that look like specific model identifiers
// (contain digits). These must appear in the result title for it to be a valid match.
function modelTokens(name: string): string[] {
  return name.split(/\s+/).filter((t) => /\d/.test(t));
}

function titleMatchesModel(title: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = title.toLowerCase();
  // All digit-containing tokens must appear in the result title
  return tokens.every((t) => lower.includes(t.toLowerCase()));
}

const CATEGORY_SUFFIX: Record<"cpu" | "gpu", string> = {
  cpu: "desktop processor",
  gpu: "graphics card",
};

// For RAM: strip the verbose model name down to brand + DDR type + speed,
// which is what Amazon titles actually contain.
// "G.Skill Trident Z5 RGB DDR5-7200 CL34 2×16GB" → query "G.Skill DDR5-7200 memory kit"
//                                                    tokens ["DDR5", "7200"]
function buildRamSearch(modelName: string): { query: string; tokens: string[] } {
  const typeSpeed = /(DDR[45])[- ](\d+)/i.exec(modelName);
  const brand = modelName.split(/\s+/)[0] ?? "";
  if (!typeSpeed) return { query: `${modelName} memory`, tokens: [] };
  const [, type, speed] = typeSpeed;
  return {
    query: `${brand} ${type}-${speed} memory kit`,
    tokens: [type!.toUpperCase(), speed!],
  };
}

export async function searchAmazon(
  modelName: string,
  category: "cpu" | "gpu" | "ram"
): Promise<AmazonHit | null> {
  const { query, tokens } =
    category === "ram"
      ? buildRamSearch(modelName)
      : { query: `${modelName} ${CATEGORY_SUFFIX[category]}`, tokens: modelTokens(modelName) };

  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "de-DE",
  });
  const page = await context.newPage();

  try {
    // Use default relevance ranking (no s= param) for best model-match results
    const url = `${SEARCH_BASE}?k=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });

    const results = page.locator('[data-component-type="s-search-result"]');
    await results.first().waitFor({ timeout: 8_000 });

    const count = await results.count();

    // Walk the top results (up to 5) and pick the first one whose title
    // contains all the model-identifying tokens from the search query.
    for (let i = 0; i < Math.min(count, 5); i++) {
      const result = results.nth(i);

      const href = await result
        .locator("a.a-link-normal[href*='/dp/']")
        .first()
        .getAttribute("href")
        .catch(() => null);

      if (!href) continue;
      const asin = extractAsin(href);
      if (!asin) continue;

      const title = await result
        .locator("h2 span")
        .first()
        .textContent()
        .then((t) => t?.trim() ?? "")
        .catch(() => "");

      if (!titleMatchesModel(title, tokens)) continue;

      const priceWhole = await result
        .locator(".a-price-whole")
        .first()
        .textContent()
        .catch(() => null);

      const priceFraction = await result
        .locator(".a-price-fraction")
        .first()
        .textContent()
        .catch(() => null);

      const priceRaw =
        priceWhole != null
          ? `${priceWhole}${priceFraction ?? ""}`.replace(/\s/g, "")
          : null;

      return {
        asin,
        title: title || modelName,
        price: priceRaw ? parsePrice(priceRaw) : null,
        currency: "EUR",
      };
    }

    return null;
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}
