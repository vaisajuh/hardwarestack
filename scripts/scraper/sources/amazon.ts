import { chromium } from "playwright";
import type { AmazonHit } from "../types";

const SEARCH_BASE = "https://www.amazon.de/s";
const CHROMIUM_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

// Amazon ASIN is a 10-character alphanumeric string embedded in product URLs.
const ASIN_RE = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/;

function extractAsin(url: string): string | null {
  return ASIN_RE.exec(url)?.[1] ?? null;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export async function searchAmazon(query: string): Promise<AmazonHit | null> {
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "de-DE",
  });
  const page = await context.newPage();

  try {
    const url = `${SEARCH_BASE}?k=${encodeURIComponent(query)}&s=review-rank`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });

    // First organic result
    const firstResult = page.locator('[data-component-type="s-search-result"]').first();
    await firstResult.waitFor({ timeout: 8_000 });

    const href = await firstResult
      .locator("a.a-link-normal[href*='/dp/']")
      .first()
      .getAttribute("href");

    if (!href) return null;
    const asin = extractAsin(href);
    if (!asin) return null;

    const title = await firstResult
      .locator("h2 span")
      .first()
      .textContent()
      .then((t) => t?.trim() ?? "")
      .catch(() => "");

    const priceWhole = await firstResult
      .locator(".a-price-whole")
      .first()
      .textContent()
      .catch(() => null);

    const priceFraction = await firstResult
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
      title: title || query,
      price: priceRaw ? parsePrice(priceRaw) : null,
      currency: "EUR",
    };
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}
