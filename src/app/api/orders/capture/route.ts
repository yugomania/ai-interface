import { NextRequest } from "next/server";
import { captureServerSideOrder } from "@/lib/paypal/api";

// In-process idempotency set — guards against duplicate submissions
// within the same server process lifetime.
const captureInFlight = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, productId } = body;

    if (!orderId || typeof orderId !== "string") {
      return Response.json({ error: "orderId is required" }, { status: 400 });
    }

    // Prevent concurrent duplicate captures of the same order.
    if (captureInFlight.has(orderId)) {
      return Response.json(
        { error: "Capture already in progress for this order. Please wait." },
        { status: 409 }
      );
    }
    captureInFlight.add(orderId);

    try {
      const result = await captureServerSideOrder(orderId, productId as string | undefined);

      if (!result.success) {
        return Response.json({ error: result.error ?? "Capture failed" }, { status: 400 });
      }

      return Response.json({
        success: true,
        transaction: result.transaction,
      });
    } finally {
      captureInFlight.delete(orderId);
    }
  } catch (err) {
    console.error("[/api/orders/capture] error:", err instanceof Error ? err.message : err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to capture order" },
      { status: 500 }
    );
  }
}
