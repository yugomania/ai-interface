import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as webhookHandler } from "../src/app/api/webhooks/paypal/route";
import { captureServerSideOrder, listTransactions } from "../src/lib/paypal/api";
import { isEventProcessed, getStoredTransactions, saveTransaction } from "../src/lib/db";
import type { Transaction } from "../src/types";

test("Payment State, Reconciliation & Webhook Processing", async (t) => {
  await t.test("captureServerSideOrder validates expected amount and stores transaction", async () => {
    const orderId = `TEST-ORDER-${Date.now()}`;
    const captureResult = await captureServerSideOrder(orderId, 49.00, "USD");

    assert.equal(captureResult.success, true);
    assert.ok(captureResult.transaction);
    assert.equal(captureResult.transaction.amount, 49.00);
    assert.equal(captureResult.transaction.currency, "USD");
    assert.equal(captureResult.transaction.status, "COMPLETED");

    // Check that it's in stored transactions
    const stored = getStoredTransactions();
    const found = stored.find((t) => t.id === captureResult.transaction?.id);
    assert.ok(found, "Transaction must be durably stored");
  });

  await t.test("reconciliation prevents double-counting captures when fetched or merged", async () => {
    const uniqueId = `RECON-TX-${Date.now()}`;
    const initialTx: Transaction = {
      id: uniqueId,
      date: new Date().toISOString(),
      amount: 120.00,
      fee: 3.78,
      net: 116.22,
      currency: "USD",
      status: "COMPLETED",
      customerName: "Reconciliation Test Buyer",
      customerEmail: "recon@test.dev",
      productName: "Reconciled Service",
      paymentMethod: "paypal",
      source: "paypal_sandbox",
    };

    // Save once
    saveTransaction(initialTx);

    // Fetch list
    const list1 = await listTransactions(30);
    const count1 = list1.filter((t) => t.id === uniqueId).length;
    assert.equal(count1, 1, "Should appear exactly once");

    // Simulate repeating or re-syncing the same transaction from search
    saveTransaction(initialTx);
    const list2 = await listTransactions(30);
    const count2 = list2.filter((t) => t.id === uniqueId).length;
    assert.equal(count2, 1, "Deduplication must prevent double-counting of the same transaction");
  });

  await t.test("webhook rejects invalid transmission signatures with 401", async () => {
    const eventPayload = {
      id: `WH-TEST-${Date.now()}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-SIG-TEST",
        amount: { value: "25.00", currency_code: "USD" },
      },
    };

    const req = new NextRequest("http://localhost:3000/api/webhooks/paypal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paypal-transmission-id": "transmission-123",
        "paypal-transmission-time": new Date().toISOString(),
        "paypal-cert-url": "https://api.paypal.com/cert.pem",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "invalid_signature_data", // explicitly invalid
      },
      body: JSON.stringify(eventPayload),
    });

    const res = await webhookHandler(req);
    assert.equal(res.status, 401, "Invalid webhook signature must return 401");
  });

  await t.test("webhook processes valid event and skips duplicates idempotently", async () => {
    const eventId = `WH-IDEMP-${Date.now()}`;
    const eventPayload = {
      id: eventId,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: `CAP-WH-${Date.now()}`,
        amount: { value: "85.00", currency_code: "USD" },
        create_time: new Date().toISOString(),
        seller_receivable_breakdown: {
          paypal_fee: { value: "2.77" },
        },
      },
    };

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/webhooks/paypal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "paypal-transmission-id": "valid-id",
          "paypal-cert-url": "https://api.sandbox.paypal.com/cert.pem",
          "paypal-transmission-sig": "valid_mock_sig",
        },
        body: JSON.stringify(eventPayload),
      });

    // First call: should process
    const res1 = await webhookHandler(makeReq());
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.received, true);
    assert.equal(body1.eventId, eventId);
    assert.ok(isEventProcessed(eventId), "Event must be recorded as processed");

    // Second call with same event ID: must be skipped as duplicate
    const res2 = await webhookHandler(makeReq());
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.status, "duplicate_skipped", "Duplicate webhook event must be skipped");
  });

  await t.test("webhook handles refund events accurately", async () => {
    const refundEventId = `WH-REF-${Date.now()}`;
    const refundPayload = {
      id: refundEventId,
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: `REF-WH-${Date.now()}`,
        amount: { value: "35.00", currency_code: "USD" },
        create_time: new Date().toISOString(),
      },
    };

    const req = new NextRequest("http://localhost:3000/api/webhooks/paypal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(refundPayload),
    });

    const res = await webhookHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.eventType, "PAYMENT.CAPTURE.REFUNDED");
  });
});
