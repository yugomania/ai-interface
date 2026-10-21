import test from "node:test";
import assert from "node:assert/strict";
import { searchProducts, getPricingComparison } from "../src/lib/channel3/client";

test("Channel3 Market Comparisons: exact vs approximate matching and defined benchmarks", async (t) => {
  await t.test("searches products and returns listings with required merchant attributes", async () => {
    const products = await searchProducts("Anker 737 Power Bank");
    assert.ok(products.length > 0, "Should return product listings");

    for (const p of products) {
      assert.ok(p.productName, "Listing must have product title");
      assert.ok(p.retailer, "Listing must identify retailer");
      assert.ok(typeof p.price === "number" && p.price > 0, "Listing must have numeric price > 0");
      assert.ok(p.currency, "Listing must specify currency");
      assert.ok(p.url, "Listing must include source link");
      assert.ok(p.retrievalTime, "Listing must record retrieval timestamp");
      assert.ok(typeof p.isExactMatch === "boolean", "Listing must flag exact vs approximate match");
    }
  });

  await t.test("separates exact matches from approximate alternatives", async () => {
    const comparison = await getPricingComparison("Sony WH-1000XM5 Wireless Headphones", 349.99);

    assert.equal(comparison.yourProductName, "Sony WH-1000XM5 Wireless Headphones");
    assert.equal(comparison.yourPrice, 349.99);
    assert.ok(comparison.competitorCount > 0, "Must have competitor listings");
    assert.ok(typeof comparison.exactMatchesCount === "number", "Exact matches count must be a number");
    assert.ok(typeof comparison.approximateMatchesCount === "number", "Approximate matches count must be a number");
    assert.equal(
      comparison.exactMatchesCount + comparison.approximateMatchesCount,
      comparison.competitorCount,
      "Sum of exact and approximate counts must equal total competitor count"
    );
  });

  await t.test("calculates min, max, avg only from the defined comparable set with explicit disclaimer", async () => {
    const comparison = await getPricingComparison("Logitech MX Master 3S", 99.99);

    assert.ok(comparison.marketMinPrice > 0, "Min price must be positive");
    assert.ok(comparison.marketMaxPrice >= comparison.marketMinPrice, "Max price must be >= min price");
    assert.ok(
      comparison.marketAvgPrice >= comparison.marketMinPrice && comparison.marketAvgPrice <= comparison.marketMaxPrice,
      "Avg price must be between min and max price"
    );

    assert.ok(comparison.disclaimer, "Must contain comparison limitations disclaimer");
    assert.ok(
      comparison.disclaimer.includes("retrieved listings") || comparison.disclaimer.includes("Not an exhaustive"),
      "Disclaimer must clarify that results are among retrieved comparable listings and not a full market census"
    );
  });

  await t.test("supports arbitrary custom products without crashing", async () => {
    const customComparison = await getPricingComparison("Custom Ergonomic Mechanical Keyboard", 149.00);
    assert.equal(customComparison.yourPrice, 149.00);
    assert.ok(customComparison.competitors.length > 0);
    assert.ok(customComparison.marketAvgPrice > 0);
  });
});
