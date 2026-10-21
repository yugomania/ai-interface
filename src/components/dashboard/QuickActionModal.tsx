"use client";

import { useState } from "react";
import { X, CheckCircle2, FileText, Loader2, ArrowRight, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import type { Invoice } from "@/types";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

type ModalStage = "EDIT" | "PREVIEW" | "SUCCESS";

export function QuickActionModal({
  isOpen,
  onClose,
  onInvoiceCreated,
}: QuickActionModalProps) {
  const [stage, setStage] = useState<ModalStage>("EDIT");
  const [recipientName, setRecipientName] = useState("Acme Global Partners");
  const [recipientEmail, setRecipientEmail] = useState("finance@acmepartners.com");
  const [itemName, setItemName] = useState("SaaS Intelligence License");
  const [unitAmount, setUnitAmount] = useState("1250.00");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("Quarterly PaySight Merchant Suite access");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    return d.toISOString().split("T")[0];
  });
  const [autoSend, setAutoSend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [confirmationToken, setConfirmationToken] = useState<string>("");

  if (!isOpen) return null;

  const totalAmount = (parseFloat(unitAmount) || 0) * (parseInt(quantity) || 1);

  const handleProceedToPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!recipientEmail || !recipientEmail.includes("@")) {
      setErrorMessage("Please enter a valid recipient email address.");
      return;
    }
    if (!recipientName.trim()) {
      setErrorMessage("Recipient name is required.");
      return;
    }
    if (totalAmount <= 0) {
      setErrorMessage("Invoice total must be greater than zero.");
      return;
    }

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_proposal",
          recipientName,
          recipientEmail,
          items: [
            {
              name: itemName,
              quantity: parseInt(quantity) || 1,
              unitAmount: parseFloat(unitAmount) || 100,
              description: note,
            },
          ],
          currency: "USD",
          note,
          dueDate,
        }),
      });

      const proposal = await res.json();
      if (!proposal.isValid) {
        setErrorMessage(`Missing details: ${proposal.missingFields.join(", ")}`);
        return;
      }
      setConfirmationToken(proposal.confirmationToken);
      setStage("PREVIEW");
    } catch {
      // Fallback to local preview if offline
      setStage("PREVIEW");
    }
  };

  const handleConfirmAndCreate = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          items: [
            {
              name: itemName,
              quantity: parseInt(quantity) || 1,
              unitAmount: parseFloat(unitAmount) || 100,
              description: note,
            },
          ],
          currency: "USD",
          note,
          dueDate,
          autoSend,
          confirmationToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create invoice");
      }

      setCreatedInvoice(data.invoice);
      onInvoiceCreated?.(data.invoice);
      setStage("SUCCESS");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStage("EDIT");
    setCreatedInvoice(null);
    setErrorMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white border border-[#E5E5E5] rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] text-[#171717] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">
                {stage === "EDIT"
                  ? "Prepare PayPal Invoice"
                  : stage === "PREVIEW"
                  ? "Confirm Invoice Details"
                  : "Invoice Created"}
              </h3>
              <p className="text-xs text-[#626262]">
                {stage === "EDIT"
                  ? "Step 1 of 2: Enter customer and line items"
                  : stage === "PREVIEW"
                  ? "Step 2 of 2: Review exact preview before Sandbox submission"
                  : "Recorded in PayPal Sandbox & local ledger"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[#626262] hover:text-[#171717] p-1.5 rounded-lg hover:bg-[#F7F7F8] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stage 1: Edit Details Form */}
        {stage === "EDIT" && (
          <form onSubmit={handleProceedToPreview} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#171717]">Recipient Customer / Business Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#171717]">Recipient Billing Email Address</label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
              />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Item / Service Description</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
                />
              </div>

              <div className="col-span-3 space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitAmount}
                  onChange={(e) => setUnitAmount(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
                />
              </div>

              <div className="col-span-3 space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Qty</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Payment Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Calculated Total</label>
                <div className="w-full bg-[#F7F7F8] border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs font-mono tabular-nums font-bold text-[#171717]">
                  ${totalAmount.toFixed(2)} USD
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#171717]">Merchant Notes &amp; Terms</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-xs text-[#171717] placeholder:text-[#626262] focus:outline-none focus:ring-2 focus:ring-[#FFF3EB] focus:border-[#C2410C] resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-[#626262]">Next: Review exact preview</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-white hover:bg-[#F7F7F8] text-[#171717] rounded-lg text-xs font-medium border border-[#E5E5E5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Review Preview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Stage 2: Exact Preview & Confirmation */}
        {stage === "PREVIEW" && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#F7F7F8] border border-[#E5E5E5] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#626262]">Billed To</span>
                  <div className="text-xs font-bold text-[#171717]">{recipientName}</div>
                  <div className="text-[11px] text-[#626262] font-mono">{recipientEmail}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#626262]">Due Date</span>
                  <div className="text-xs font-semibold text-[#171717]">{dueDate}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#171717]">
                  <span>{itemName} × {quantity}</span>
                  <span className="font-mono tabular-nums font-semibold">${totalAmount.toFixed(2)} USD</span>
                </div>
                {note && <p className="text-[11px] text-[#626262] italic">&ldquo;{note}&rdquo;</p>}
              </div>

              <div className="pt-2 border-t border-[#E5E5E5] flex justify-between items-baseline">
                <span className="text-xs font-bold text-[#171717]">Total Due</span>
                <span className="text-base font-bold font-mono tabular-nums text-[#C2410C]">${totalAmount.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Authoritative Action Options */}
            <div className="space-y-2 p-3 rounded-lg border border-[#E5E5E5] bg-white">
              <span className="text-xs font-semibold text-[#171717]">Action on Confirmation:</span>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="invoiceAction"
                    checked={!autoSend}
                    onChange={() => setAutoSend(false)}
                    className="accent-[#C2410C]"
                  />
                  <span>
                    <strong>Create as DRAFT</strong> (Recommended — review in PayPal Sandbox before sending)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="invoiceAction"
                    checked={autoSend}
                    onChange={() => setAutoSend(true)}
                    className="accent-[#C2410C]"
                  />
                  <span>
                    <strong>Create and SEND immediately</strong> (Authorizes email transmission to customer)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setConfirmationToken("");
                  setStage("EDIT");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#171717] rounded-lg text-xs font-medium border border-[#E5E5E5]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAndCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting to Sandbox…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Create Invoice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Stage 3: Success State */}
        {stage === "SUCCESS" && createdInvoice && (
          <div className="p-6 flex flex-col items-center text-center space-y-3.5">
            <CheckCircle2 className="w-12 h-12 text-[#15803D] animate-in zoom-in-50" />
            <h4 className="text-base font-bold text-[#171717]">Invoice Created in PayPal Sandbox</h4>

            <div className="w-full p-4 rounded-xl bg-[#F7F7F8] border border-[#E5E5E5] space-y-2 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#626262]">Invoice Identifier:</span>
                <span className="font-mono tabular-nums font-bold text-[#171717]">{createdInvoice.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#626262]">Invoice Number:</span>
                <span className="font-mono font-semibold text-[#171717]">{createdInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#626262]">Amount:</span>
                <span className="font-mono tabular-nums font-bold text-[#171717]">
                  ${createdInvoice.amount.toFixed(2)} {createdInvoice.currency}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#626262]">Actual Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    createdInvoice.status === "SENT"
                      ? "bg-[#FFF3EB] text-[#C2410C] border-[#FED7AA]"
                      : "bg-[#F7F7F8] text-[#171717] border-[#E5E5E5]"
                  }`}
                >
                  {createdInvoice.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#626262]">Recipient:</span>
                <span className="font-mono text-[#171717]">{createdInvoice.recipientEmail}</span>
              </div>
            </div>

            <p className="text-xs text-[#626262]">
              {createdInvoice.status === "DRAFT"
                ? "This invoice is safely stored as a Draft. You can authorize sending whenever ready."
                : `Invoice successfully dispatched to ${createdInvoice.recipientEmail}.`}
            </p>

            <div className="pt-2 w-full">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
