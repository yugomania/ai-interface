import { NextRequest } from "next/server";
import { getOrdersController, hasValidPayPalConfig } from "@/lib/paypal/client";
import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemName, price, currency = "USD" } = body;

    if (!price || parseFloat(price) <= 0) {
      return Response.json({ error: "Invalid price amount" }, { status: 400 });
    }

    const priceNum = parseFloat(price);

    // If live PayPal sandbox credentials configured, create real PayPal order
    if (hasValidPayPalConfig()) {
      const ordersController = getOrdersController();
      const response = await ordersController.createOrder({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: {
                currencyCode: currency,
                value: priceNum.toFixed(2),
              },
              description: itemName || "PaySight Merchant Order",
            },
          ],
        },
      });

      const order = response.result;
      return Response.json({
        id: order.id,
        status: order.status,
        isLive: true,
      });
    }

    // In Demo Mode, return structured mock order ID
    const demoOrderId = `ORD-DEMO-${Date.now().toString().slice(-6)}`;
    return Response.json({
      id: demoOrderId,
      status: "CREATED",
      isLive: false,
    });
  } catch (err) {
    console.error("[/api/orders/create] error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
      { status: 500 }
    );
  }
}
