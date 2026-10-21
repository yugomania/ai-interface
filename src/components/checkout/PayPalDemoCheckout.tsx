"use client";

/**
 * PayPalDemoCheckout — Live PayPal Sandbox Integration
 *
 * Uses @paypal/react-paypal-js (v10) default export:
 *   PayPalScriptProvider + PayPalButtons (createOrder / onApprove / onCancel / onError)
 *
 * Flow:
 *   1. User clicks PayPal button → PayPal popup opens for buyer login & approval
 *   2. On approval: onApprove fires with { orderID }
 *   3. We POST /api/orders/capture?orderId=… (backend verifies & captures)
 *   4. On success: display verified capture details
 *
 * Secret & OAuth token never leave the server.
 * Amount is determined server-side from productId — never trusted from browser.
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
  onSuccess: (txn: Transaction) => void;
  disabled: boolean;
  onProcessingChange: (p: boolean) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}

function PayPalButtonArea({
  onSuccess,
  disabled,
  onProcessingChange,
  onError,
  onCancel,
}: ButtonAreaProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  const createOrder = useCallback(async () => {
    onProcessingChange(true);
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
    return data.id as string; // PayPal order ID
  }, [onProcessingChange]);

  const onApprove = useCallback(
    async (data: { orderID: string }) => {
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
        onProcessingChange(false);
      }
    },
    [onSuccess, onError, onProcessingChange]
  );

  const handleCancel = useCallback(() => {
    onProcessingChange(false);
    onCancel();
  }, [onProcessingChange, onCancel]);

  const handleError = useCallback(
    (err: Record<string, unknown>) => {
      onProcessingChange(false);
      onError(String(err?.message ?? "PayPal encountered an error"));
    },
    [onError, onProcessingChange]
  );

  if (isRejected) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>
          PayPal SDK failed to load. Check that{" "}
          <code className="font-mono">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> is set and
          the sandbox app is active.
        </span>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-[#626262]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading PayPal SDK…
      </div>
    );
  }

  return (
    <PayPalButtons
      disabled={disabled}
      forceReRender={[DEMO_PRODUCT.id]}
      style={{
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "pay",
        height: 40,
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onCancel={handleCancel}
      onError={handleError}
    />
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface PayPalDemoCheckoutProps {
  onPaymentSuccess?: (newTxn: Transaction) => void;
}

type CheckoutState = "idle" | "processing" | "success" | "cancelled" | "error";

export function PayPalDemoCheckout({ onPaymentSuccess }: PayPalDemoCheckoutProps) {
  const [state, setState] = useState<CheckoutState>("idle");
  const [lastTxn, setLastTxn] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  const handleSuccess = useCallback(
    (txn: Transaction) => {
      setLastTxn(txn);
      setState("success");
      onPaymentSuccess?.(txn);
    },
    [onPaymentSuccess]
  );

  const handleError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setState("error");
  }, []);

  const handleCancel = useCallback(() => {
    setState("cancelled");
  }, []);

  const reset = () => {
    setState("idle");
    setLastTxn(null);
    setErrorMessage("");
  };

  // ─── Missing client ID guard ───────────────────────────────────────────────

  if (!clientId) {
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col gap-3">
        <SandboxBadge />
        <div className="flex items-start gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Missing environment variable</p>
            <p className="mt-0.5">
              <code className="font-mono">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> is not
              set. Add it to <code className="font-mono">.env.local</code> and restart
              the dev server. The secret key is never exposed here.
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
        // Explicitly target sandbox — independent of NODE_ENV.
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
          <SandboxBadge />
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

        {/* How it works */}
        <ol className="text-[11px] text-[#626262] list-decimal list-inside space-y-0.5 leading-relaxed">
          <li>Click the PayPal button and log in with your <strong>personal sandbox buyer account</strong>.</li>
          <li>Approve the $10.00 payment in the PayPal popup.</li>
          <li>The server captures the payment and records it in your ledger.</li>
        </ol>

        {/* Checkout area */}
        <div className="min-h-[120px] flex flex-col items-stretch justify-center">
          {/* Success */}
          {state === "success" && lastTxn && (
            <SuccessPanel txn={lastTxn} onReset={reset} />
          )}

          {/* Processing overlay */}
          {state === "processing" && (
            <div className="flex flex-col items-center py-4 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#C2410C]" />
              <span className="text-xs text-[#626262]">
                Capturing payment on the server…
              </span>
            </div>
          )}

          {/* Cancelled */}
          {state === "cancelled" && (
            <div className="flex flex-col items-center gap-2 py-3">
              <XCircle className="w-8 h-8 text-[#626262]" />
              <p className="text-xs text-[#626262]">Payment cancelled. No charge was made.</p>
              <button onClick={reset} className="text-xs text-[#C2410C] hover:text-[#9A3412] font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={reset} className="text-xs text-[#C2410C] hover:text-[#9A3412] font-medium flex items-center gap-1 self-center">
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            </div>
          )}

          {/* Idle — show PayPal button */}
          {(state === "idle") && (
            <PayPalButtonArea
              disabled={false}
              onSuccess={handleSuccess}
              onProcessingChange={(p) => { if (p) setState("processing"); }}
              onError={handleError}
              onCancel={handleCancel}
            />
          )}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-center text-[#626262] border-t border-[#E5E5E5] pt-3">
          This is a PayPal Sandbox environment. No real money is collected. Transactions
          are labelled <strong>[SANDBOX]</strong> in the ledger.
        </p>
      </div>
    </PayPalScriptProvider>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SandboxBadge() {
  return (
    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FFF3EB] text-[#C2410C] border border-[#FDBA74] flex-shrink-0">
      PayPal Sandbox
    </span>
  );
}

interface SuccessPanelProps {
  txn: Transaction;
  onReset: () => void;
}

function SuccessPanel({ txn, onReset }: SuccessPanelProps) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-2 animate-in fade-in duration-300">
      <CheckCircle2 className="w-10 h-10 text-[#15803D]" />
      <div>
        <p className="text-sm font-semibold text-[#171717]">
          Payment Captured &amp; Verified ✓
        </p>
        <p className="text-[11px] text-[#626262] mt-0.5">
          Recorded in your transaction ledger
        </p>
      </div>

      <div className="w-full bg-[#F7F7F8] border border-[#E5E5E5] rounded-lg p-3 text-left space-y-1.5 text-xs">
        <Row label="Capture ID" value={txn.id} mono />
        <Row label="Amount" value={`$${txn.amount.toFixed(2)} ${txn.currency}`} mono />
        <Row label="Status" value={txn.status} />
        <Row label="Product" value={txn.productName} />
        {txn.fee != null && (
          <Row label="Fee" value={`$${txn.fee.toFixed(2)}`} mono />
        )}
        {txn.net != null && (
          <Row label="Net" value={`$${txn.net.toFixed(2)}`} mono />
        )}
        {txn.customerEmail && (
          <Row label="Buyer" value={txn.customerEmail} />
        )}
        <Row
          label="Source"
          value={txn.source === "paypal_sandbox" ? "PayPal Sandbox API" : "Demo simulation"}
        />
      </div>

      <p className="text-[10px] text-[#626262]">
        Note: Sandbox transactions may appear in PayPal reporting with a delay.
        This ledger entry is based on the verified capture response only.
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

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[#626262] flex-shrink-0">{label}</span>
      <span
        className={`text-[#171717] text-right break-all ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
