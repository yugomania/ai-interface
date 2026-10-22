import { NextRequest } from "next/server";
import { getOrdersController, hasValidPayPalConfig } from "@/lib/paypal/client";
import {
  CheckoutPaymentIntent,
  PaypalWalletContextShippingPreference,
  PaypalExperienceUserAction,
} from "@paypal/paypal-server-sdk";

// ─── Authoritative Server-Side Product Catalog ───────────────────────────────
// Amounts and currencies are determined here, never trusted from the browser.

export const SANDBOX_PRODUCTS: Record<
  string,
  { name: string; amount: string; currency: string; description: string }
> = {
  demo_10: {
    name: "PaySight Demo Product",
    amount: "10.00",
    currency: "USD",
    description: "[SANDBOX] PaySight $10 Demo — test payment, no real money",
  },
  sub_pro: {
    name: "PaySight Pro Merchant Plan",
    amount: "49.00",
    currency: "USD",
    description: "[SANDBOX] Monthly AI analytics & real-time monitoring",
  },
  intel_add: {
    name: "Channel3 Price Scanner Add-on",
    amount: "29.00",
    currency: "USD",
    description: "[SANDBOX] Competitor tracking for up to 10,000 SKUs",
  },
  exp_pack: {
    name: "Agentic Invoicing Expansion",
    amount: "19.00",
    currency: "USD",
    description: "[SANDBOX] Automated invoice creation & dispute shields",
  },
};

export async function POST(req: NextRequest) {
  // Validate required server-side credentials are present.
  // Report only missing variable names — never values.
  const missingVars: string[] = [];
  if (!process.env.PAYPAL_CLIENT_ID) missingVars.push("PAYPAL_CLIENT_ID");
  if (!process.env.PAYPAL_CLIENT_SECRET) missingVars.push("PAYPAL_CLIENT_SECRET");
  if (!process.env.PAYPAL_ENVIRONMENT) missingVars.push("PAYPAL_ENVIRONMENT");

  if (missingVars.length > 0 && hasValidPayPalConfig()) {
    // Config looks valid, missing vars might just be PAYPAL_ENVIRONMENT defaulting
  } else if (missingVars.includes("PAYPAL_CLIENT_ID") || missingVars.includes("PAYPAL_CLIENT_SECRET")) {
    return Response.json(
      { error: `Missing required environment variables: ${missingVars.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { productId } = body;

    // Resolve product from server-side catalog by ID — never accept amount from browser.
    const product = SANDBOX_PRODUCTS[productId ?? "demo_10"] ?? SANDBOX_PRODUCTS.demo_10;

    // Explicitly use sandbox endpoint via PAYPAL_ENVIRONMENT (not NODE_ENV).
    if (hasValidPayPalConfig()) {
      const ordersController = getOrdersController();
      const response = await ordersController.createOrder({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: {
                currencyCode: product.currency,
                value: product.amount,
              },
              description: product.description,
              customId: productId ?? "demo_10",
            },
          ],
          paymentSource: {
            paypal: {
              experienceContext: {
                brandName: "PaySight",
                shippingPreference: PaypalWalletContextShippingPreference.NoShipping,
                userAction: PaypalExperienceUserAction.PayNow,
              },
            },
          },
        },
      });

      const order = response.result;
      // Return order ID and resolved product metadata — never credentials or tokens.
      return Response.json({
        id: order.id,
        status: order.status,
        productName: product.name,
        amount: product.amount,
        currency: product.currency,
        environment: process.env.PAYPAL_ENVIRONMENT ?? "sandbox",
        isLive: true,
      });
    }

    // Demo fallback (no valid credentials)
    const demoOrderId = `ORD-DEMO-${Date.now().toString().slice(-8)}`;
    return Response.json({
      id: demoOrderId,
      status: "CREATED",
      productName: product.name,
      amount: product.amount,
      currency: product.currency,
      environment: "demo",
      isLive: false,
    });
  } catch (err) {
    let errMsg = "Failed to create order";
    let debugId: string | undefined;
    if (err && typeof err === "object") {
      const sdkErr = err as Record<string, unknown>;
      const result = sdkErr.result as Record<string, unknown> | undefined;
      const headers = sdkErr.headers as Record<string, string> | undefined;
      debugId = headers?.["paypal-debug-id"];

      if (result?.error_description && typeof result.error_description === "string") {
        errMsg = `${result.error ?? "error"}: ${result.error_description}`;
      } else if (result?.message && typeof result.message === "string") {
        errMsg = result.message;
        const details = result.details as Array<Record<string, string>> | undefined;
        if (details?.[0]?.issue) {
          errMsg = `${details[0].issue}: ${details[0].description ?? result.message}`;
        }
      } else if (sdkErr.message && typeof sdkErr.message === "string" && sdkErr.message.trim()) {
        errMsg = sdkErr.message;
      } else if (typeof sdkErr.statusCode === "number") {
        errMsg = `PayPal API error (HTTP ${sdkErr.statusCode})`;
      }
    }
    console.error("[/api/orders/create] error:", errMsg, debugId ? `(debug_id: ${debugId})` : "");
    return Response.json(
      { error: errMsg, debug_id: debugId },
      { status: 500 }
    );
  }
}
