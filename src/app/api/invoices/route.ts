import { NextRequest } from "next/server";
import { listInvoices, createInvoice, prepareInvoiceProposal } from "@/lib/paypal/api";
import { hasValidPayPalConfig } from "@/lib/paypal/client";

export async function GET() {
  try {
    const invoices = await listInvoices();
    return Response.json({
      invoices,
      isLive: hasValidPayPalConfig(),
    });
  } catch (err) {
    console.error("[/api/invoices] GET error:", err);
    return Response.json({ error: "Failed to list invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // If client is just checking/validating proposal
    if (body.action === "validate_proposal") {
      const proposal = prepareInvoiceProposal(body);
      return Response.json(proposal);
    }

    // Creating invoice
    const newInvoice = await createInvoice({
      recipientName: body.recipientName,
      recipientEmail: body.recipientEmail,
      items: body.items,
      currency: body.currency || "USD",
      note: body.note,
      dueDate: body.dueDate,
      autoSend: Boolean(body.autoSend),
      confirmationToken: body.confirmationToken,
    });

    return Response.json({
      success: true,
      invoice: newInvoice,
    });
  } catch (err) {
    console.error("[/api/invoices] POST error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create invoice" },
      { status: 400 }
    );
  }
}
