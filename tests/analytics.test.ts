import test from "node:test";
import assert from "node:assert/strict";
import { getMerchantKPIs, listDisputes } from "../src/lib/paypal/api";
import { saveTransaction } from "../src/lib/db";
import type { Transaction } from "../src/types";

test("Analytics: authoritative server-side calculation and currency separation", async (t) => {
  await t.test("separates currencies correctly without mixing totals", async () => {
    // Setup test transactions with multiple currencies
    const txUSD: Transaction = {
      id: "TEST-TX-USD-1",
      date: new Date().toISOString(),
      amount: 100.00,
      fee: 3.20,
      net: 96.80,
      currency: "USD",
      status: "COMPLETED",
      customerName: "US Customer",
      customerEmail: "us@example.com",
      productName: "Test Item USD",
      paymentMethod: "paypal",
      source: "demo_sample",
    };

    const txEUR: Transaction = {
      id: "TEST-TX-EUR-1",
      date: new Date().toISOString(),
      amount: 80.00,
      fee: 2.60,
      net: 77.40,
      currency: "EUR",
      status: "COMPLETED",
      customerName: "EU Customer",
      customerEmail: "eu@example.com",
      productName: "Test Item EUR",
      paymentMethod: "paypal",
      source: "demo_sample",
    };

    saveTransaction(txUSD);
    saveTransaction(txEUR);

    const kpis = await getMerchantKPIs();
    assert.ok(kpis.currencyTotals, "currencyTotals must be present");
    assert.ok(kpis.currencyTotals["USD"], "USD currency breakdown must exist");
    assert.ok(kpis.currencyTotals["EUR"], "EUR currency breakdown must exist");

    assert.equal(typeof kpis.currencyTotals["USD"].gross, "number");
    assert.equal(typeof kpis.currencyTotals["EUR"].gross, "number");
    // Verify EUR and USD are separated in currency totals
    assert.ok(kpis.currencyTotals["EUR"].gross >= 80.00);
  });

  await t.test("refund and fee accounting is correct and distinct from gross", async () => {
    const refundTx: Transaction = {
      id: "TEST-REF-1",
      date: new Date().toISOString(),
      amount: 50.00,
      fee: 0,
      net: -50.00,
      currency: "USD",
      status: "REFUNDED",
      customerName: "Refund Customer",
      customerEmail: "refund@example.com",
      productName: "Returned Item",
      paymentMethod: "paypal",
      source: "demo_sample",
    };

    saveTransaction(refundTx);

    const kpis = await getMerchantKPIs();
    assert.ok(kpis.refundCount30d >= 1, "Must record at least 1 refund");
    assert.ok(kpis.refundAmount30d >= 50.00, "Refund amount must include the 50.00 refund");
    assert.ok(kpis.grossVolume30d > 0, "Gross volume must remain positive");
    assert.ok(kpis.totalFees30d >= 0, "Total fees must be tracked distinctly");
    assert.equal(
      parseFloat((kpis.grossVolume30d - kpis.totalFees30d).toFixed(2)),
      parseFloat(kpis.netVolume30d.toFixed(2)),
      "Net volume must equal gross volume minus total fees"
    );
  });

  await t.test("AOV has safe non-zero denominator guard", async () => {
    const kpis = await getMerchantKPIs();
    assert.ok(!isNaN(kpis.averageOrderValue), "AOV must never be NaN");
    assert.ok(isFinite(kpis.averageOrderValue), "AOV must be finite");
  });

  await t.test("API failures or missing live credentials do not invent dispute data", async () => {
    const disputeResult = await listDisputes();
    assert.equal(typeof disputeResult.isLive, "boolean");
    assert.ok(disputeResult.statusMessage.length > 0, "Status message must explain retrieval state");
    if (!disputeResult.isLive) {
      assert.equal(disputeResult.disputes.length, 0, "Must not invent fake disputes when unconfigured");
    }
  });
});
