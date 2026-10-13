import { afterEach, describe, expect, it, vi } from "vitest";
import { AFFILIATE_REL, buildAmazonSearchUrl, buildShopLink, hasAffiliateTag } from "./shopping-links";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Amazon affiliate links", () => {
  it("builds a tagged amazon.de search link", () => {
    vi.stubEnv("NEXT_PUBLIC_AMAZON_AFFILIATE_TAG", "hardwarestack-21");
    expect(buildAmazonSearchUrl("NVIDIA GeForce RTX 4070 SUPER")).toBe(
      "https://www.amazon.de/s?k=NVIDIA%20GeForce%20RTX%204070%20SUPER&tag=hardwarestack-21"
    );
    expect(buildShopLink("AMD Radeon RX 7800 XT")).toMatchObject({ label: "Amazon", rel: AFFILIATE_REL });
  });

  it("falls back to Google Shopping without a tag", () => {
    vi.stubEnv("NEXT_PUBLIC_AMAZON_AFFILIATE_TAG", "");
    expect(buildAmazonSearchUrl("AMD Radeon RX 7800 XT")).toBeNull();
    expect(buildShopLink("AMD Radeon RX 7800 XT").href).toContain("google.com");
  });
});

describe("hasAffiliateTag", () => {
  it("is true only when a tag is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_AMAZON_AFFILIATE_TAG", "hardwarestack-21");
    expect(hasAffiliateTag()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_AMAZON_AFFILIATE_TAG", "");
    expect(hasAffiliateTag()).toBe(false);
  });
});
