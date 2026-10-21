import { NextRequest } from "next/server";
import { isEventProcessed, markEventProcessed, saveTransaction, saveInvoice } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paypal/client";
import type { Transaction, Invoice } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify webhook signature if transmission headers or PAYPAL_WEBHOOK_ID are present
    const transmissionId = req.headers.get("paypal-transmission-id");
    const transmissionTime = req.headers.get("paypal-transmission-time");
    const certUrl = req.headers.get("paypal-cert-url");
    const authAlgo = req.headers.get("paypal-auth-algo");
    const transmissionSig = req.headers.get("paypal-transmission-sig");
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (transmissionId && certUrl && transmissionSig) {
      const isValid = await verifyWebhookSignature({
        transmissionId,
        transmissionTime: transmissionTime || "",
        certUrl,
        authAlgo: authAlgo || "SHA256withRSA",
        transmissionSig,
        webhookId,
        rawBody,
      });

      if (!isValid) {
        return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    const eventId = event.id;
    const eventType = event.event_type;

    if (!eventId || !eventType) {
      return Response.json({ error: "Missing event identifier or event_type" }, { status: 400 });
    }

    // Idempotency: skip already processed webhook events
    if (isEventProcessed(eventId)) {
      return Response.json({ received: true, status: "duplicate_skipped" });
    }

    const resource = event.resource ?? {};

    switch (eventType) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = resource.id || `CAP-${Date.now()}`;
        const amountVal = parseFloat(resource.amount?.value ?? "0");
        const feeVal = parseFloat(resource.seller_receivable_breakdown?.paypal_fee?.value ?? "0");

        const txn: Transaction = {
          id: captureId,
          date: resource.create_time || new Date().toISOString(),
          amount: amountVal,
          fee: feeVal,
          net: amountVal - feeVal,
          currency: resource.amount?.currency_code ?? "USD",
          status: "COMPLETED",
          customerName: resource.seller_protection?.status ? "PayPal Buyer" : "Customer",
          customerEmail: "sandbox-customer@paypal.com",
          productName: "PayPal Webhook Captured Order",
          paymentMethod: "paypal",
          source: "paypal_sandbox",
          note: `Webhook verified capture (${eventId})`,
        };

        saveTransaction(txn);
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const captureId = resource.id || `CAP-${Date.now()}`;
        const txn: Transaction = {
          id: captureId,
          date: resource.create_time || new Date().toISOString(),
          amount: parseFloat(resource.amount?.value ?? "0"),
          currency: resource.amount?.currency_code ?? "USD",
          status: "DENIED",
          customerName: "Customer",
          customerEmail: "sandbox-customer@paypal.com",
          productName: "Denied Order",
          paymentMethod: "paypal",
          source: "paypal_sandbox",
        };
        saveTransaction(txn);
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const refundId = resource.id || `REF-${Date.now()}`;
        const txn: Transaction = {
          id: refundId,
          date: resource.create_time || new Date().toISOString(),
          amount: parseFloat(resource.amount?.value ?? "0"),
          currency: resource.amount?.currency_code ?? "USD",
          status: "REFUNDED",
          customerName: "Refund Recipient",
          customerEmail: "sandbox-customer@paypal.com",
          productName: "Refund Event",
          paymentMethod: "paypal",
          source: "paypal_sandbox",
        };
        saveTransaction(txn);
        break;
      }

      case "INVOICING.INVOICE.PAID": {
        const invoiceId = resource.id;
        if (invoiceId) {
          const inv: Invoice = {
            id: invoiceId,
            invoiceNumber: resource.detail?.invoice_number || invoiceId,
            recipientName: resource.primary_recipients?.[0]?.billing_info?.name?.full_name || "Customer",
            recipientEmail: resource.primary_recipients?.[0]?.billing_info?.email_address || "",
            amount: parseFloat(resource.amount?.value ?? "0"),
            currency: resource.detail?.currency_code ?? "USD",
            status: "PAID",
            dueDate: resource.detail?.payment_term?.due_date || "",
            createdDate: resource.detail?.invoice_date || new Date().toISOString(),
            items: [],
            source: "paypal_sandbox",
          };
          saveInvoice(inv);
        }
        break;
      }

      default:
        // Ignore unhandled event types gracefully
        break;
    }

    markEventProcessed(eventId);
    return Response.json({ received: true, eventId, eventType });
  } catch (err) {
    console.error("[/api/webhooks/paypal] error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Webhook processing error" },
      { status: 500 }
    );
  }
}
