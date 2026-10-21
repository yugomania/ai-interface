"use client";

import { DollarSign, ShoppingBag, ArrowUpRight, ArrowDownRight, ShieldCheck, Activity } from "lucide-react";
import type { MerchantKPIs } from "@/types";

interface KPICardsProps {
  kpis: MerchantKPIs | null;
  loading: boolean;
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function KPICards({ kpis, loading }: KPICardsProps) {
  const cards = [
    {
      label: "Total Net Volume",
      value: kpis ? formatCurrency(kpis.netVolume30d ?? kpis.totalRevenue30d, kpis.currency) : "$0",
      change: kpis?.totalRevenue30dChange ? `${kpis.totalRevenue30dChange >= 0 ? "+" : ""}${kpis.totalRevenue30dChange.toFixed(1)}%` : "+0.0%",
      isPositive: (kpis?.totalRevenue30dChange ?? 0) >= 0,
      timeframe: kpis?.totalFees30d ? `Fees: $${kpis.totalFees30d.toFixed(2)}` : "vs last month",
      icon: DollarSign,
    },
    {
      label: "Settled Orders",
      value: kpis ? kpis.transactionCount30d.toLocaleString() : "0",
      change: kpis?.transactionCount30dChange ? `${kpis.transactionCount30dChange >= 0 ? "+" : ""}${kpis.transactionCount30dChange.toFixed(1)}%` : "+0.0%",
      isPositive: (kpis?.transactionCount30dChange ?? 0) >= 0,
      timeframe: kpis?.refundCount30d ? `${kpis.refundCount30d} refund(s)` : "vs last month",
      icon: ShoppingBag,
    },
    {
      label: "Avg Transaction Size",
      value: kpis ? formatCurrency(kpis.averageOrderValue, kpis.currency) : "$0",
      change: kpis?.averageOrderValueChange ? `${kpis.averageOrderValueChange >= 0 ? "+" : ""}${kpis.averageOrderValueChange.toFixed(1)}%` : "+0.0%",
      isPositive: (kpis?.averageOrderValueChange ?? 0) >= 0,
      timeframe: "completed sales AOV",
      icon: Activity,
    },
    {
      label: "Dispute / Risk Rate",
      value: kpis ? `${kpis.disputeRate.toFixed(2)}%` : "0.00%",
      change: "0.0%",
      isPositive: (kpis?.disputeRate ?? 0) === 0,
      timeframe: (kpis?.disputeRate ?? 0) > 0 ? "active disputes" : "no liability claims",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col justify-between transition-colors"
          >
            {/* Top row: Label & Icon badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#626262]">
                {card.label}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] flex items-center justify-center text-[#171717]">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Main Value */}
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-[#F7F7F8] rounded-lg animate-pulse" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-[#171717] tabular-nums">
                  {card.value}
                </div>
              )}
            </div>

            {/* Footer row: Delta badge & subtext */}
            <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[#E5E5E5]">
              <div
                className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
                  card.isPositive
                    ? "bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]"
                    : "bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]"
                }`}
              >
                {card.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{card.change}</span>
              </div>
              <span className="text-xs text-[#626262]">
                {card.timeframe}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
