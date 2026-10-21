import { NextRequest } from "next/server";
import { captureServerSideOrder } from "@/lib/paypal/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, expectedAmount, currency = "USD" } = body;

    if (!orderId) {
      return Response.json({ error: "orderId is required" }, { status: 400 });
    }

    const result = await captureServerSideOrder(
      orderId,
      expectedAmount ? parseFloat(expectedAmount) : undefined,
      currency
    );

    if (!result.success) {
      return Response.json({ error: result.error || "Capture failed" }, { status: 400 });
    }

    return Response.json({
      success: true,
      transaction: result.transaction,
    });
  } catch (err) {
    console.error("[/api/orders/capture] error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to capture order" },
      { status: 500 }
    );
  }
}
