/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "node:test";
import assert from "node:assert/strict";
import { getMerchantKPIs } from "../src/lib/paypal/api";
import { paysightTools } from "../src/lib/ai/orchestrator";

test("Grounded AI Assistant & Dashboard Agreement", async (t) => {
  await t.test("assistant payment summary agrees with dashboard KPIs", async () => {
    const dashboardKPIs = await getMerchantKPIs();

    // Invoke the assistant tool
    const assistantSummaryResult = await (paysightTools.summarizePayments.execute as any)({ days: 30, currency: "USD" });

    assert.equal(
      assistantSummaryResult.grossRevenue,
      dashboardKPIs.grossVolume30d,
      "Assistant gross revenue must match dashboard gross volume"
    );
    assert.equal(
      assistantSummaryResult.transactionCount,
      dashboardKPIs.transactionCount30d,
      "Assistant completed orders must match dashboard transaction count"
    );
    assert.equal(
      assistantSummaryResult.netRevenue,
      dashboardKPIs.netVolume30d,
      "Assistant net revenue must match dashboard net volume"
    );
    assert.equal(
      assistantSummaryResult.totalFees,
      dashboardKPIs.totalFees30d,
      "Assistant fees must match dashboard fees"
    );
    assert.equal(
      assistantSummaryResult.reportingTimezone,
      dashboardKPIs.reportingTimezone,
      "Reporting timezone must be explicit and identical"
    );
  });

  await t.test("assistant getTransactions filters failed or pending transactions accurately", async () => {
    const allResult = await (paysightTools.getTransactions.execute as any)({ days: 30, status: "ALL" });
    assert.ok(Array.isArray(allResult.transactions), "Must return transactions array");
    assert.ok(allResult.transactions.length > 0);

    const pendingResult = await (paysightTools.getTransactions.execute as any)({ days: 30, status: "PENDING" });
    for (const txn of pendingResult.transactions) {
      assert.equal(txn.status, "PENDING", "Filtered transactions must all have PENDING status");
    }
  });

  await t.test("assistant market comparison tool returns grounded benchmarks and source links", async () => {
    const compResult = await (paysightTools.compareProductPricing.execute as any)({
      productName: "Anker 737 Power Bank",
      yourPrice: 129.99,
    });

    assert.equal(compResult.merchantPrice, "$129.99 USD");
    assert.ok(compResult.retrievedListingsCount > 0);
    assert.ok(compResult.marketFloor);
    assert.ok(compResult.marketCeiling);
    assert.ok(compResult.marketBenchmarkAvg);
    assert.ok(compResult.disclaimer);
    assert.ok(Array.isArray(compResult.competitors));
    assert.ok(compResult.competitors[0].url.startsWith("http"));
  });

  await t.test("assistant invoice preparation tool rejects missing fields and instructs confirmation", async () => {
    // Missing items and recipient name
    const invalidResult = await (paysightTools.prepareInvoiceProposalTool.execute as any)({
      recipientName: "",
      recipientEmail: "invalid-email",
      items: [],
    });

    assert.equal(invalidResult.isValid, false);
    assert.ok(invalidResult.missingFields.length > 0);
    assert.ok(invalidResult.instruction.includes("Missing"));

    // Valid proposal
    const validResult = await (paysightTools.prepareInvoiceProposalTool.execute as any)({
      recipientName: "Acme Buyer",
      recipientEmail: "acme@example.com",
      items: [{ name: "Service", quantity: 1, unitAmount: 200.00 }],
    });

    assert.equal(validResult.isValid, true);
    assert.ok(validResult.confirmationToken, "Valid proposal must have confirmationToken");
    assert.ok(validResult.instruction.includes("Present this exact preview"));
  });
});
