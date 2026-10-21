"use client";

import { useState } from "react";
import { ShoppingCart, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import type { Transaction } from "@/types";

interface PayPalDemoCheckoutProps {
  onPaymentSuccess?: (newTxn: Transaction) => void;
}

const DEMO_ITEMS = [
  { id: "sub_pro", name: "PaySight Pro Merchant Plan", price: "49.00", desc: "Monthly AI analytics & real-time monitoring" },
  { id: "intel_add", name: "Channel3 Price Scanner Add-on", price: "29.00", desc: "Competitor tracking for up to 10,000 SKUs" },
  { id: "exp_pack", name: "Agentic Invoicing Expansion", price: "19.00", desc: "Automated invoice creation & dispute shields" },
];

export function PayPalDemoCheckout({ onPaymentSuccess }: PayPalDemoCheckoutProps) {
  const [selectedItem, setSelectedItem] = useState(DEMO_ITEMS[0]);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [lastTxn, setLastTxn] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleServerSideCheckout = async () => {
    setPaymentStatus("processing");
    setErrorMessage("");

    try {
      // 1. Server-side Order Creation
      const createRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: selectedItem.name,
          price: selectedItem.price,
          currency: "USD",
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Server order creation failed");
      }

      const orderData = await createRes.json();

      // 2. Server-side Order Capture with Amount & Currency Verification
      const captureRes = await fetch("/api/orders/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.id,
          expectedAmount: selectedItem.price,
          currency: "USD",
        }),
      });

      if (!captureRes.ok) {
        const err = await captureRes.json();
        throw new Error(err.error || "Server order capture failed");
      }

      const captureData = await captureRes.json();
      const authoritativeTxn: Transaction = captureData.transaction;

      setLastTxn(authoritativeTxn);
      setPaymentStatus("success");
      onPaymentSuccess?.(authoritativeTxn);
    } catch (err) {
      console.error("[PayPal Checkout] Server-side error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Payment execution failed");
      setPaymentStatus("error");
    }
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] text-[#171717] flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">Live PayPal Checkout Terminal</h3>
            <p className="text-xs text-[#626262]">Server-side creation, amount verification &amp; capture</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#F7F7F8] text-[#171717] border border-[#E5E5E5]">
          PayPal Sandbox
        </span>
      </div>

      {/* Product selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#626262]">Select Merchant Test Product</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {DEMO_ITEMS.map((item) => {
            const isSelected = selectedItem.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedItem(item);
                  setPaymentStatus("idle");
                  setErrorMessage("");
                }}
                className={`text-left p-3 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? "border-[#C2410C] bg-[#FFF3EB] text-[#171717] ring-1 ring-[#C2410C]"
                    : "border-[#E5E5E5] bg-white hover:bg-[#F7F7F8] text-[#171717]"
                }`}
              >
                <div className="font-semibold truncate">{item.name}</div>
                <div
                  className={`mt-2 font-mono tabular-nums font-bold text-sm ${
                    isSelected ? "text-[#C2410C]" : "text-[#626262]"
                  }`}
                >
                  ${item.price} USD
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checkout area */}
      <div className="bg-[#F7F7F8] border border-[#E5E5E5] rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
        {paymentStatus === "success" && lastTxn ? (
          <div className="flex flex-col items-center text-center py-2 animate-in fade-in">
            <CheckCircle2 className="w-10 h-10 text-[#15803D] mb-2" />
            <div className="text-sm font-semibold text-[#171717]">Payment Verified &amp; Captured Server-Side</div>
            <p className="text-xs text-[#626262] mt-0.5 max-w-sm">
              Capture ID <span className="font-mono tabular-nums text-[#15803D] font-semibold">{lastTxn.id}</span> ({lastTxn.productName} for ${lastTxn.amount.toFixed(2)} USD) is authoritatively posted to your persistent ledger.
            </p>
            <button
              onClick={() => {
                setPaymentStatus("idle");
                setLastTxn(null);
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#C2410C] hover:text-[#9A3412] font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Execute another sandbox test
            </button>
          </div>
        ) : paymentStatus === "processing" ? (
          <div className="flex flex-col items-center py-4">
            <div className="w-8 h-8 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs text-[#626262]">Validating order and capturing via PayPal server API…</span>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-3">
            {errorMessage && (
              <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#B91C1C]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleServerSideCheckout}
              className="w-full bg-[#ffc439] hover:bg-[#f4bb34] active:bg-[#e0ac30] text-[#003087] font-bold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <span className="font-extrabold italic text-blue-900">PayPal</span>
              <span>Execute Sandbox Checkout</span>
              <span className="font-mono tabular-nums text-xs font-semibold text-blue-950">(${selectedItem.price})</span>
            </button>
            <p className="text-[11px] text-center text-[#626262]">
              Triggers authenticated server-side order creation and server-side capture with persistent ledger recording.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
