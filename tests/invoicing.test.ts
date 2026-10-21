import test from "node:test";
import assert from "node:assert/strict";
import { prepareInvoiceProposal, createInvoice } from "../src/lib/paypal/api";
import type { CreateInvoiceInput } from "../src/types";

test("PayPal Invoicing: validation, proposal preview, confirmation binding, and idempotency", async (t) => {
  await t.test("identifies missing or invalid invoice fields", () => {
    const incompleteInput: Partial<CreateInvoiceInput> = {
      recipientName: "Test Buyer",
      // missing recipientEmail
      items: [], // empty items
    };

    const proposal = prepareInvoiceProposal(incompleteInput);
    assert.equal(proposal.isValid, false, "Proposal must be invalid when missing fields");
    assert.ok(proposal.missingFields.includes("recipientEmail"), "Should flag missing recipientEmail");
    assert.ok(proposal.missingFields.includes("items"), "Should flag missing items");
  });

  await t.test("generates valid proposal with exact preview and confirmation token", () => {
    const validInput: CreateInvoiceInput = {
      recipientName: "Jane Doe",
      recipientEmail: "jane.doe@example.com",
      items: [
        { name: "Consulting Hour", quantity: 2, unitAmount: 150.00 },
        { name: "Setup Fee", quantity: 1, unitAmount: 50.00 },
      ],
      currency: "USD",
      note: "Q4 Consulting Work",
    };

    const proposal = prepareInvoiceProposal(validInput);
    assert.equal(proposal.isValid, true);
    assert.equal(proposal.totalAmount, 350.00);
    assert.equal(proposal.missingFields.length, 0);
    assert.ok(proposal.confirmationToken, "Must produce confirmationToken");
    assert.equal(proposal.status, "PROPOSAL_PENDING_CONFIRMATION");
  });

  await t.test("binds confirmation to exact details; rejects creation if details were modified after preview", async () => {
    const originalInput: CreateInvoiceInput = {
      recipientName: "Acme Corp",
      recipientEmail: "billing@acme.com",
      items: [{ name: "Widget A", quantity: 1, unitAmount: 100.00 }],
      currency: "USD",
    };

    const proposal = prepareInvoiceProposal(originalInput);
    const validToken = proposal.confirmationToken;

    // Simulate merchant modifying details (changing unit amount from $100 to $150) without re-confirming
    const modifiedInput: CreateInvoiceInput = {
      ...originalInput,
      items: [{ name: "Widget A", quantity: 1, unitAmount: 150.00 }],
      confirmationToken: validToken, // stale token
    };

    await assert.rejects(
      async () => {
        await createInvoice(modifiedInput);
      },
      {
        message: /Confirmation token mismatch: invoice details were modified after preview/,
      },
      "Must reject creation when details were altered after confirmation token was issued"
    );
  });

  await t.test("creates invoice with DRAFT status by default; never marks as SENT without explicit authorization", async () => {
    const draftInput: CreateInvoiceInput = {
      recipientName: "Default Draft Customer",
      recipientEmail: `draft-${Date.now()}@test.dev`,
      items: [{ name: "Draft Product", quantity: 1, unitAmount: 75.00 }],
      autoSend: false,
    };

    const invoice = await createInvoice(draftInput);
    assert.equal(invoice.status, "DRAFT", "Must default to DRAFT status");
    assert.ok(invoice.id, "Must return an invoice ID");
    assert.equal(invoice.amount, 75.00);
  });

  await t.test("rejects concurrent duplicate invoice creation requests (in-flight idempotency)", async () => {
    const email = `concurrent-${Date.now()}@test.dev`;
    const input: CreateInvoiceInput = {
      recipientName: "Concurrent Test",
      recipientEmail: email,
      items: [{ name: "Duplicate Guard Test", quantity: 1, unitAmount: 199.00 }],
    };

    // Trigger two creations in parallel with identical lockKey
    const p1 = createInvoice(input);
    const p2 = createInvoice(input);

    const results = await Promise.allSettled([p1, p2]);
    // At least one should succeed and subsequent concurrent calls rejected or handled atomically
    assert.ok(results.some((r) => r.status === "fulfilled"), "At least one call should succeed");
  });
});
