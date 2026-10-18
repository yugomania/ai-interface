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
      value: kpis ? formatCurrency(kpis.totalRevenue30d, kpis.currency) : "$42,890",
      change: kpis?.totalRevenue30dChange ? `+${Math.abs(kpis.totalRevenue30dChange).toFixed(1)}%` : "+14.8%",
      isPositive: true,
      timeframe: "vs last month",
      icon: DollarSign,
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Settled Orders",
      value: kpis ? kpis.transactionCount30d.toLocaleString() : "1,248",
      change: kpis?.transactionCount30dChange ? `+${Math.abs(kpis.transactionCount30dChange).toFixed(1)}%` : "+8.2%",
      isPositive: true,
      timeframe: "vs last month",
      icon: ShoppingBag,
      iconColor: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      label: "Avg Transaction Size",
      value: kpis ? formatCurrency(kpis.averageOrderValue, kpis.currency) : "$34.37",
      change: kpis?.averageOrderValueChange ? `+${Math.abs(kpis.averageOrderValueChange).toFixed(1)}%` : "+3.5%",
      isPositive: true,
      timeframe: "vs last month",
      icon: Activity,
      iconColor: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
    },
    {
      label: "Risk / Dispute Score",
      value: kpis ? `${kpis.disputeRate.toFixed(2)}%` : "0.24%",
      change: "-0.12%",
      isPositive: true, // dispute reduction is positive
      timeframe: "low liability tier",
      icon: ShieldCheck,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4.5 transition-all duration-200 hover:shadow-xl hover:shadow-blue-950/20 backdrop-blur-md flex flex-col justify-between"
          >
            {/* Top row: Label & Icon badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl ${card.bgColor} ${card.borderColor} border flex items-center justify-center`}
              >
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>

            {/* Main Value */}
            <div className="mt-3">
              {loading ? (
                <div className="h-8 w-28 bg-slate-800 rounded-lg animate-pulse" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-white font-sans">
                  {card.value}
                </div>
              )}
            </div>

            {/* Footer row: Delta badge & subtext */}
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800/60">
              <div
                className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                  card.isPositive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {card.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{card.change}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {card.timeframe}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
