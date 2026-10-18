import type { PricingComparison, CompetitorProduct } from "@/types";

const BASE_URL = "https://api.trychannel3.com/v1";
const API_KEY = process.env.CHANNEL3_API_KEY ?? "";

// ─── Simple in-memory cache (reduce credits usage) ───────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function fromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  return null;
}

function toCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Search products ──────────────────────────────────────────────────────────

export async function searchProducts(query: string): Promise<CompetitorProduct[]> {
  const key = `search:${query}`;
  const cached = fromCache<CompetitorProduct[]>(key);
  if (cached) return cached;

  if (!API_KEY) {
    console.warn("[Channel3] No API key — returning mock data");
    return getMockProducts(query);
  }

  try {
    const res = await fetch(`${BASE_URL}/products/search?q=${encodeURIComponent(query)}&limit=10`, {
      headers: { "x-api-key": API_KEY, Accept: "application/json" },
    });

    if (!res.ok) {
      console.error("[Channel3] search failed:", res.status);
      return getMockProducts(query);
    }

    const data = await res.json();
    const products: CompetitorProduct[] = (data.products ?? []).map(
      (p: Record<string, unknown>): CompetitorProduct => ({
        productName: p.name as string ?? query,
        retailer: p.retailer as string ?? "Unknown",
        price: parseFloat(String(p.price ?? "0")),
        currency: (p.currency as string) ?? "USD",
        url: (p.url as string) ?? "#",
        inStock: (p.in_stock as boolean) ?? true,
        imageUrl: p.image_url as string | undefined,
      })
    );

    toCache(key, products);
    return products;
  } catch (err) {
    console.error("[Channel3] error:", err);
    return getMockProducts(query);
  }
}

// ─── Build pricing comparison for a merchant's product ───────────────────────

export async function getPricingComparison(
  productName: string,
  yourPrice: number,
  yourSku?: string
): Promise<PricingComparison> {
  const competitors = await searchProducts(productName);

  if (competitors.length === 0) {
    return {
      yourProductName: productName,
      yourPrice,
      yourSku,
      marketMinPrice: yourPrice,
      marketMaxPrice: yourPrice,
      marketAvgPrice: yourPrice,
      competitorCount: 0,
      pricePosition: "unknown",
      competitors: [],
    };
  }

  const prices = competitors.map((c) => c.price).filter((p) => p > 0);
  const marketMinPrice = Math.min(...prices);
  const marketMaxPrice = Math.max(...prices);
  const marketAvgPrice = prices.reduce((s, p) => s + p, 0) / prices.length;

  let pricePosition: PricingComparison["pricePosition"] = "competitive";
  if (yourPrice > marketAvgPrice * 1.15) pricePosition = "high";
  else if (yourPrice < marketAvgPrice * 0.85) pricePosition = "low";

  return {
    yourProductName: productName,
    yourPrice,
    yourSku,
    marketMinPrice,
    marketMaxPrice,
    marketAvgPrice,
    competitorCount: competitors.length,
    pricePosition,
    competitors,
  };
}

// ─── Mock data fallback ───────────────────────────────────────────────────────

function getMockProducts(query: string): CompetitorProduct[] {
  const basePrice = 80 + Math.random() * 120;
  const retailers = ["Amazon", "Best Buy", "Walmart", "Target", "Newegg", "B&H Photo"];

  return retailers.slice(0, 4 + Math.floor(Math.random() * 3)).map((retailer) => ({
    productName: query,
    retailer,
    price: parseFloat((basePrice * (0.85 + Math.random() * 0.35)).toFixed(2)),
    currency: "USD",
    url: `https://${retailer.toLowerCase().replace(/ /g, "")}.com/search?q=${encodeURIComponent(query)}`,
    inStock: Math.random() > 0.1,
  }));
}
