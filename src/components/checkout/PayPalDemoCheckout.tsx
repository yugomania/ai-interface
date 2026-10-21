"use client";

/**
 * PayPalDemoCheckout — Live PayPal Sandbox Integration
 *
 * Uses @paypal/react-paypal-js (v10) default export:
 *   PayPalScriptProvider + PayPalButtons (createOrder / onApprove / onCancel / onError)
 *
 * Flow:
 *   1. createOrder: calls /api/orders/create → returns PayPal order ID
 *      (PayPal SDK opens the popup from here internally — we do NOT change state)
 *   2. onApprove: buyer approved → we POST /api/orders/capture (server verifies)
 *      (Only here do we enter "capturing" state, briefly)
 *   3. Success or error panel shown; PayPal button always remains accessible.
 */

import { useState, useCallback } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import {
  ShoppingCart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { Transaction } from "@/types";

// ─── Demo product — labelled SANDBOX, $10.00 USD ──────────────────────────────

const DEMO_PRODUCT = {
  id: "demo_10",
  name: "PaySight Demo Product",
  price: "10.00",
  currency: "USD",
  desc: "[SANDBOX] $10 test payment — no real money moved",
} as const;

// ─── Inner button component (inside ScriptProvider context) ───────────────────

interface ButtonAreaProps {
  capturing: boolean;
  onCapturingChange: (c: boolean) => void;
  onSuccess: (txn: Transaction) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function PayPalButtonArea({
  capturing,
  onCapturingChange,
  onSuccess,
  onError,
  onCancel,
}: ButtonAreaProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  // createOrder: just create the order on the server and return the ID.
  // DO NOT change external state here — PayPal manages the popup lifecycle.
  const createOrder = useCallback(async () => {
    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: DEMO_PRODUCT.id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Order creation failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.id as string;
  }, []);

  // onApprove: buyer approved the payment in the popup.
  // Now we do the server-side capture — this is the only time we show a spinner.
  const onApprove = useCallback(
    async (data: { orderID: string }) => {
      onCapturingChange(true);
      try {
        const res = await fetch("/api/orders/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.orderID,
            productId: DEMO_PRODUCT.id,
          }),
        });
        const captureData = await res.json();
        if (!res.ok || !captureData.success) {
          throw new Error(captureData.error ?? `Capture failed (HTTP ${res.status})`);
        }
        onSuccess(captureData.transaction as Transaction);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Capture failed");
      } finally {
        onCapturingChange(false);
      }
    },
    [onCapturingChange, onSuccess, onError]
  );

  if (isRejected) {
    return (
      <div className="flex items-start gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">PayPal SDK failed to load</p>
          <p className="mt-0.5">
            Check that <code className="font-mono">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>{" "}
            is set and your sandbox app is active at developer.paypal.com.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#626262]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading PayPal SDK…
        </div>
      ) : (
        <PayPalButtons
          disabled={capturing}
          forceReRender={[DEMO_PRODUCT.id]}
          style={{
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "pay",
            height: 44,
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={onCancel}
          onError={(err) =>
            onError(String((err as Record<string, unknown>)?.message ?? "PayPal error"))
          }
        />
      )}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface PayPalDemoCheckoutProps {
  onPaymentSuccess?: (newTxn: Transaction) => void;
}

export function PayPalDemoCheckout({ onPaymentSuccess }: PayPalDemoCheckoutProps) {
  const [capturing, setCapturing] = useState(false);
  const [lastTxn, setLastTxn] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  const handleSuccess = useCallback(
    (txn: Transaction) => {
      setLastTxn(txn);
      setErrorMessage("");
      setCancelled(false);
      onPaymentSuccess?.(txn);
    },
    [onPaymentSuccess]
  );

  const handleError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setCancelled(false);
  }, []);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    setErrorMessage("");
  }, []);

  const reset = () => {
    setLastTxn(null);
    setErrorMessage("");
    setCancelled(false);
    setCapturing(false);
  };

  // ─── Missing client ID guard ───────────────────────────────────────────────
  if (!clientId) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-start gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Missing environment variable</p>
            <p className="mt-0.5">
              <code className="font-mono">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> is not
              set. Add it to <code className="font-mono">.env.local</code> and restart.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: DEMO_PRODUCT.currency,
        intent: "capture",
        components: "buttons",
        "buyer-country": "US",
      }}
    >
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] text-[#171717] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#171717]">
                PayPal Sandbox Checkout
              </h3>
              <p className="text-xs text-[#626262]">
                Real buyer approval · Server-side capture · Verified ledger entry
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FFF3EB] text-[#C2410C] border border-[#FDBA74] flex-shrink-0">
            PayPal Sandbox
          </span>
        </div>

        {/* Product card */}
        <div className="bg-[#F7F7F8] border border-[#E5E5E5] rounded-lg p-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#171717]">{DEMO_PRODUCT.name}</p>
            <p className="text-[11px] text-[#626262] mt-0.5">{DEMO_PRODUCT.desc}</p>
          </div>
          <p className="text-sm font-bold text-[#C2410C] font-mono tabular-nums whitespace-nowrap">
            ${DEMO_PRODUCT.price} {DEMO_PRODUCT.currency}
          </p>
        </div>

        {/* Instructions */}
        <ol className="text-[11px] text-[#626262] list-decimal list-inside space-y-0.5 leading-relaxed">
          <li>
            Click the PayPal button — a popup opens. Log in with your{" "}
            <strong>personal sandbox buyer account</strong>.
          </li>
          <li>Approve the $10.00 payment in the popup.</li>
          <li>The server captures and records the payment in your ledger.</li>
        </ol>

        {/* Popup-blocker warning */}
        <div className="text-[10px] text-[#626262] bg-[#FFFBEB] border border-[#FDE68A] rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-[#D97706] flex-shrink-0" />
          If the PayPal window doesn&apos;t open, allow pop-ups for this site in your browser.
        </div>

        {/* ── Success panel ── */}
        {lastTxn && <SuccessPanel txn={lastTxn} onReset={reset} />}

        {/* ── Inline status messages (non-blocking) ── */}
        {!lastTxn && (
          <>
            {/* Server-side capture spinner — shown only briefly after buyer approves */}
            {capturing && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#626262]">
                <Loader2 className="w-4 h-4 animate-spin text-[#C2410C]" />
                Capturing payment on the server…
              </div>
            )}

            {/* Cancelled notice */}
            {cancelled && !capturing && (
              <div className="flex items-center gap-2 text-xs text-[#626262] bg-[#F7F7F8] border border-[#E5E5E5] rounded-lg px-3 py-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                Payment cancelled — no charge was made. Try again below.
              </div>
            )}

            {/* Error notice */}
            {errorMessage && !capturing && (
              <div className="flex items-start gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PayPal button — always visible, just disabled during capture */}
            <PayPalButtonArea
              capturing={capturing}
              onCapturingChange={setCapturing}
              onSuccess={handleSuccess}
              onError={handleError}
              onCancel={handleCancel}
            />

            {/* Manual reset if somehow stuck */}
            {capturing && (
              <button
                onClick={reset}
                className="text-[11px] text-[#626262] hover:text-[#171717] underline self-center transition-colors"
              >
                Cancel / reset
              </button>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-[10px] text-center text-[#626262] border-t border-[#E5E5E5] pt-3">
          This is a PayPal Sandbox environment. No real money is collected.
          Transactions are labelled <strong>[SANDBOX]</strong> in the ledger.
        </p>
      </div>
    </PayPalScriptProvider>
  );
}

// ─── Success panel ─────────────────────────────────────────────────────────────

function SuccessPanel({ txn, onReset }: { txn: Transaction; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-2 animate-in fade-in duration-300 border border-[#BBF7D0] bg-[#F0FDF4] rounded-xl px-4 py-4">
      <CheckCircle2 className="w-10 h-10 text-[#15803D]" />
      <div>
        <p className="text-sm font-semibold text-[#171717]">
          Payment Captured &amp; Verified ✓
        </p>
        <p className="text-[11px] text-[#626262] mt-0.5">
          Recorded in your transaction ledger
        </p>
      </div>

      <div className="w-full bg-white border border-[#E5E5E5] rounded-lg p-3 text-left space-y-1.5 text-xs">
        <Row label="Capture ID" value={txn.id} mono />
        <Row label="Amount" value={`$${txn.amount.toFixed(2)} ${txn.currency}`} mono />
        <Row label="Status" value={txn.status} />
        <Row label="Product" value={txn.productName} />
        {txn.fee != null && <Row label="PayPal Fee" value={`$${txn.fee.toFixed(2)}`} mono />}
        {txn.net != null && <Row label="Net" value={`$${txn.net.toFixed(2)}`} mono />}
        {txn.customerEmail && <Row label="Buyer" value={txn.customerEmail} />}
        <Row
          label="Source"
          value={txn.source === "paypal_sandbox" ? "PayPal Sandbox API" : "Demo simulation"}
        />
      </div>

      <p className="text-[10px] text-[#626262] max-w-sm">
        Note: Sandbox transactions may appear in PayPal reporting with a delay. This
        ledger entry is based on the verified capture response only.
      </p>

      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-xs text-[#C2410C] hover:text-[#9A3412] font-medium transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Run another sandbox test
      </button>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[#626262] flex-shrink-0">{label}</span>
      <span className={`text-[#171717] text-right break-all ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </span>
    </div>
  );
}
