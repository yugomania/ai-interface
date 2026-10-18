import { listTransactions, getMerchantKPIs, getRevenueTimeSeries } from "@/lib/paypal/api";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const type = searchParams.get("type") ?? "transactions";

  try {
    if (type === "kpis") {
      const kpis = await getMerchantKPIs();
      return Response.json(kpis);
    }
    if (type === "revenue") {
      const data = await getRevenueTimeSeries(days);
      return Response.json(data);
    }
    const txns = await listTransactions(days);
    return Response.json(txns);
  } catch (err) {
    console.error("[/api/transactions] error:", err);
    return Response.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
