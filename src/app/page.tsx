"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Sidebar, type NavTab } from "@/components/layout/Sidebar";
import { TopCommandBar } from "@/components/layout/TopCommandBar";
import { QuickActionModal } from "@/components/dashboard/QuickActionModal";
import { KPICards } from "@/components/dashboard/KPICards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TransactionGrid } from "@/components/dashboard/TransactionGrid";
import { CompetitorPricingGrid } from "@/components/dashboard/CompetitorPricingGrid";
import { PayPalDemoCheckout } from "@/components/checkout/PayPalDemoCheckout";
import { ChatPanel } from "@/components/ai/ChatPanel";
import type {
  Transaction,
  MerchantKPIs,
  RevenueDataPoint,
  PricingComparison,
  DateRangeOption,
  Invoice,
  Dispute,
} from "@/types";
import { ShieldCheck, ShieldAlert, Sparkles, FileText, CheckCircle2 } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kpis, setKpis] = useState<MerchantKPIs | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [comparisons, setComparisons] = useState<PricingComparison[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");

  const [loadingTxns, setLoadingTxns] = useState(true);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);

    // 1. Transactions
    setLoadingTxns(true);
    fetch("/api/transactions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch((err) => console.error("Transactions fetch error:", err))
      .finally(() => setLoadingTxns(false));

    // 2. KPIs
    setLoadingKpis(true);
    fetch("/api/transactions?type=kpis")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setKpis(data);
      })
      .catch((err) => console.error("KPIs fetch error:", err))
      .finally(() => setLoadingKpis(false));

    // 3. Revenue Trend
    setLoadingRevenue(true);
    const days = dateRange === "90d" ? 90 : dateRange === "7d" ? 7 : 30;
    fetch(`/api/transactions?type=revenue&days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRevenueData(data);
      })
      .catch((err) => console.error("Revenue fetch error:", err))
      .finally(() => setLoadingRevenue(false));

    // 4. Disputes
    fetch("/api/disputes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDisputes(data);
      })
      .catch((err) => console.error("Disputes fetch error:", err));

    // 5. Competitor Pricing (Channel3)
    setLoadingPricing(true);
    const sampleProducts = [
      { name: "Premium Noise Cancelling Headphones", price: 149.99 },
      { name: "Ergonomic Mechanical Keyboard", price: 89.99 },
      { name: "Ultra-Clear 4K Streaming Webcam", price: 119.99 },
      { name: "7-in-1 Aluminum USB-C Hub", price: 49.99 },
    ];

    Promise.all(
      sampleProducts.map((p) =>
        fetch(`/api/pricing?product=${encodeURIComponent(p.name)}&price=${p.price}`)
          .then((res) => res.json())
          .catch(() => null)
      )
    )
      .then((results) => {
        const valid = results.filter((r) => r && !r.error);
        setComparisons(valid);
      })
      .finally(() => {
        setLoadingPricing(false);
        setIsRefreshing(false);
      });
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleNewPaymentSuccess = (newTxn: Transaction) => {
    setTransactions((prev) => [newTxn, ...prev]);
    setKpis((prev) => {
      if (!prev) return null;
      const newTotal = prev.totalRevenue30d + newTxn.amount;
      const newCount = prev.transactionCount30d + 1;
      return {
        ...prev,
        totalRevenue30d: newTotal,
        transactionCount30d: newCount,
        averageOrderValue: newTotal / newCount,
      };
    });
  };

  const handleInvoiceCreated = (newInv: Invoice) => {
    setInvoices((prev) => [newInv, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* 1. Left Vertical Nav Spine */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        disputeCount={disputes.length || 1}
      />

      {/* 2. Main Content + Top Bar Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar */}
        <TopCommandBar
          onSearchChange={setGlobalSearch}
          onOpenQuickInvoice={() => setIsInvoiceModalOpen(true)}
          onRefresh={fetchDashboardData}
          isRefreshing={isRefreshing}
        />

        {/* Work Area + Copilot Split */}
        <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start max-w-[1780px] w-full mx-auto">
          {/* Main Workspace (8/12 on large screens) */}
          <div className="xl:col-span-8 2xl:col-span-8 space-y-6">
            {/* KPI Metric Blocks (Purrweb style) */}
            <KPICards kpis={kpis} loading={loadingKpis} />

            {/* Tab: Overview (All primary widgets) */}
            {activeTab === "overview" && (
              <>
                <RevenueChart
                  data={revenueData}
                  loading={loadingRevenue}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />

                <TransactionGrid
                  transactions={transactions}
                  loading={loadingTxns}
                  externalSearch={globalSearch}
                />

                <CompetitorPricingGrid
                  comparisons={comparisons}
                  loading={loadingPricing}
                />

                <PayPalDemoCheckout
                  onPaymentSuccess={handleNewPaymentSuccess}
                />
              </>
            )}

            {/* Tab: Live Ledger */}
            {activeTab === "transactions" && (
              <div className="space-y-6">
                <TransactionGrid
                  transactions={transactions}
                  loading={loadingTxns}
                  externalSearch={globalSearch}
                />
                <PayPalDemoCheckout
                  onPaymentSuccess={handleNewPaymentSuccess}
                />
              </div>
            )}

            {/* Tab: Invoicing */}
            {activeTab === "invoices" && (
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Active Invoices</h3>
                      <p className="text-xs text-slate-400">Created via PayPal Invoicing API v2</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    + New Invoice
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: "INV-00912",
                      client: "Acme Global Partners",
                      email: "billing@acmepartners.com",
                      amount: "$2,500.00",
                      status: "Sent",
                      due: "Nov 2, 2026",
                    },
                    {
                      id: "INV-00911",
                      client: "Starlight Digital Media",
                      email: "payments@starlight.io",
                      amount: "$890.00",
                      status: "Paid",
                      due: "Oct 24, 2026",
                    },
                    ...invoices.map((inv) => ({
                      id: inv.id,
                      client: inv.recipientName,
                      email: inv.recipientEmail,
                      amount: `$${inv.amount.toFixed(2)}`,
                      status: "Sent",
                      due: inv.dueDate,
                    })),
                  ].map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center font-mono text-[11px] text-slate-300 font-semibold">
                          #
                        </div>
                        <div>
                          <div className="font-semibold text-white">{inv.client}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{inv.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-200">{inv.amount}</div>
                          <div className="text-[10px] text-slate-500">Due {inv.due}</div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inv.status === "Paid"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Dispute Shield */}
            {activeTab === "disputes" && (
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">PayPal Dispute Shield</h3>
                      <p className="text-xs text-slate-400">
                        Chargeback protection &amp; automated seller evidence upload
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Low Liability Tier (0.24%)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                      <span className="text-xs font-semibold text-white">Dispute #DISP-0019</span>
                      <span className="text-[10px] font-mono text-slate-400">TXN-4910</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-300">$149.99 USD</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Reason: <em>Merchandise not as described</em> • Buyer: <strong>Alice Johnson</strong>
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Response window expires in 4 days
                    </span>
                    <button
                      onClick={() =>
                        alert(
                          "PaySight AI Evidence Generator has drafted delivery confirmation & tracking slip."
                        )
                      }
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      AI Draft Evidence
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Channel3 Market Radar */}
            {activeTab === "pricing" && (
              <div className="space-y-6">
                <CompetitorPricingGrid
                  comparisons={comparisons}
                  loading={loadingPricing}
                />
              </div>
            )}

            {/* Tab: Pay Terminal */}
            {activeTab === "checkout" && (
              <div className="space-y-6">
                <PayPalDemoCheckout
                  onPaymentSuccess={handleNewPaymentSuccess}
                />
              </div>
            )}
          </div>

          {/* Right AI Copilot Dock (4/12 on large screens, sticky) */}
          <div className="xl:col-span-4 2xl:col-span-4 xl:sticky xl:top-20 h-[calc(100vh-100px)] min-h-[580px]">
            <ChatPanel />
          </div>
        </main>
      </div>

      {/* Quick Action Modal for Invoices */}
      <QuickActionModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onInvoiceCreated={handleInvoiceCreated}
      />
    </div>
  );
}
