import { getPricingComparison } from "@/lib/channel3/client";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const product = searchParams.get("product") ?? "";
  const price = parseFloat(searchParams.get("price") ?? "0");

  if (!product) {
    return Response.json({ error: "product param required" }, { status: 400 });
  }

  try {
    const comparison = await getPricingComparison(product, price);
    return Response.json(comparison);
  } catch (err) {
    console.error("[/api/pricing] error:", err);
    return Response.json({ error: "Failed to fetch pricing" }, { status: 500 });
  }
}
