"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenueDataPoint, DateRangeOption } from "@/types";
import { format, parseISO } from "date-fns";
import { TrendingUp, Calendar } from "lucide-react";

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading: boolean;
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
}

const RANGES: { label: string; value: DateRangeOption }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
];

function formatTick(date: string): string {
  try {
    return format(parseISO(date), "MMM d");
  } catch {
    return date;
  }
}

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function RevenueChart({
  data,
  loading,
  dateRange,
  onDateRangeChange,
}: RevenueChartProps) {
  const tickInterval = dateRange === "90d" ? 6 : dateRange === "30d" ? 4 : 0;

  const totalPeriodRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0);

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Settlement Velocity
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" />
              +14.8% trend
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-sans">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(totalPeriodRevenue)}
            </span>
            <span className="text-xs text-slate-500">volume processed in interval</span>
          </div>
        </div>

        {/* Range Buttons (Purrweb segmented style) */}
        <div className="inline-flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onDateRangeChange(r.value)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                dateRange === r.value
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      {loading ? (
        <div className="h-56 bg-slate-800/40 rounded-xl animate-pulse" />
      ) : (
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="volumeGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatTick}
                tick={{ fill: "#64748b", fontSize: 11 }}
                interval={tickInterval}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  color: "#f8fafc",
                  fontSize: 12,
                }}
                formatter={(value: any, name: any) => [
                  name === "revenue" && typeof value === "number"
                    ? `$${value.toFixed(2)} USD`
                    : String(value ?? 0),
                  name === "revenue" ? "Daily Revenue" : "Transactions",
                ]}
                labelFormatter={(label) => `Date: ${formatTick(label as string)}`}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
