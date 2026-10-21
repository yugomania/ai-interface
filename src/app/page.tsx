"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar, type NavTab } from "@/components/layout/Sidebar";
import { TopCommandBar } from "@/components/layout/TopCommandBar";
import { QuickActionModal } from "@/components/dashboard/QuickActionModal";
import { KPICards } from "@/components/dashboard/KPICards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TransactionGrid } from "@/components/dashboard/TransactionGrid";
import { CompetitorPricingGrid } from "@/components/dashboard/CompetitorPricingGrid";
import { PayPalDemoCheckout } from "@/components/checkout/PayPalDemoCheckout";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { OverviewQuickActions } from "@/components/dashboard/OverviewQuickActions";
import type {
  Transaction,
  MerchantKPIs,
  RevenueDataPoint,
  PricingComparison,
  DateRangeOption,
  Invoice,
  Dispute,
} from "@/types";
import { FileText, CheckCircle2, Info, Sparkles, Plus } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [globalSearch, setGlobalSearch] = useState("");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Collapsible Assistant state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [prefillPrompt, setPrefillPrompt] = useState<string>("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kpis, setKpis] = useState<MerchantKPIs | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [comparisons, setComparisons] = useState<PricingComparison[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputeMessage, setDisputeMessage] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");

  const [loadingTxns, setLoadingTxns] = useState(true);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Proportional Data Fetching ──────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    const days = dateRange === "90d" ? 90 : dateRange === "7d" ? 7 : 30;

    // 1. Transactions (scoped to dateRange)
    setLoadingTxns(true);
    fetch(`/api/transactions?days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch((err) => console.error("Transactions fetch error:", err))
      .finally(() => setLoadingTxns(false));

    // 2. Authoritative Server-side KPIs
    setLoadingKpis(true);
    fetch("/api/transactions?type=kpis")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setKpis(data);
          setIsLiveConnected(data.source === "paypal_sandbox");
        }
      })
      .catch((err) => console.error("KPIs fetch error:", err))
      .finally(() => setLoadingKpis(false));

    // 3. Revenue Trend
    setLoadingRevenue(true);
    fetch(`/api/transactions?type=revenue&days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRevenueData(data);
      })
      .catch((err) => console.error("Revenue fetch error:", err))
      .finally(() => setLoadingRevenue(false));

    // 4. Invoices (Persistent & PayPal Sandbox)
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.invoices)) {
          setInvoices(data.invoices);
        }
      })
      .catch((err) => console.error("Invoices fetch error:", err));

    // 5. Disputes (Honest Retrieval)
    fetch("/api/disputes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.disputes)) {
          setDisputes(data.disputes);
        }
        if (data?.statusMessage) {
          setDisputeMessage(data.statusMessage);
        }
      })
      .catch((err) => console.error("Disputes fetch error:", err))
      .finally(() => setIsRefreshing(false));
  }, [dateRange]);

  // Pricing data is fetched strictly when viewing the Price Comparison tab
  const fetchPricingData = useCallback(() => {
    if (comparisons.length > 0) return; // Reuse cached comparisons
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
      .finally(() => setLoadingPricing(false));
  }, [comparisons.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === "pricing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPricingData();
    }
  }, [activeTab, fetchPricingData]);

  // Keyboard shortcut listener: Cmd/Ctrl+J toggles chat, Escape closes drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        if (isChatOpen) setIsChatOpen(false);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatOpen, isMobileMenuOpen]);

  // Contextual AI Entry Points
  const openChatWithPrompt = (prompt: string) => {
    setPrefillPrompt(prompt);
    setIsChatOpen(true);
  };

  const handleNewPaymentSuccess = (newTxn: Transaction) => {
    setTransactions((prev) => [newTxn, ...prev]);
    // Refresh KPIs server-side so arithmetic is authoritative
    fetch("/api/transactions?type=kpis")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setKpis(data);
      });
  };

  const handleInvoiceCreated = (newInv: Invoice) => {
    setInvoices((prev) => [newInv, ...prev]);
  };

  return (
    <div className="min-h-screen bg-white text-[#171717] flex">
      {/* 1. Left Vertical Nav Spine */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        disputeCount={disputes.length}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isLiveConnected={isLiveConnected}
      />

      {/* 2. Main Content + Top Bar Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar */}
        <TopCommandBar
          onSearchChange={setGlobalSearch}
          onOpenQuickInvoice={() => setIsInvoiceModalOpen(true)}
          onRefresh={fetchDashboardData}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          isChatOpen={isChatOpen}
        />

        {/* Demo Mode Notification Banner if running without live sandbox credentials */}
        {!isLiveConnected && (
          <div className="bg-[#FFF3EB] border-b border-[#FED7AA] px-4 md:px-6 py-2 flex items-center justify-between text-xs text-[#C2410C]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Demo Mode Active:</strong> Dashboard is using deterministic, durable sample records. Configure <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> in <code>.env.local</code> for live PayPal Sandbox connection.
              </span>
            </div>
            <span className="hidden sm:inline font-mono text-[11px] bg-white text-[#C2410C] px-2 py-0.5 rounded border border-[#FED7AA]">
              Sample Data
            </span>
          </div>
        )}

        {/* Main Work Area: Full Width Responsive Canvas */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* View: Overview (Answers 3 core questions) */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Question 1: How is my business doing? */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#171717]">Business Overview</h2>
                    <p className="text-xs text-[#626262]">Authoritative performance metrics and settlement velocity</p>
                  </div>
                  <span className="text-xs font-mono text-[#626262]">
                    Timezone: {kpis?.reportingTimezone || "UTC"} • Currency: USD
                  </span>
                </div>

                {/* 4 Core Verified KPI Cards */}
                <KPICards kpis={kpis} loading={loadingKpis} />

                {/* Revenue Trend Chart with Contextual AI action */}
                <RevenueChart
                  data={revenueData}
                  loading={loadingRevenue}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  onExplainTrend={() =>
                    openChatWithPrompt(
                      `Explain my settlement revenue trend for the last ${dateRange}. Detail our velocity, any refund impacts, and volume spikes.`
                    )
                  }
                />
              </div>

              {/* Question 2: What needs my attention? */}
              <NeedsAttention
                disputes={disputes}
                invoices={invoices}
                isLiveConnected={isLiveConnected}
                onNavigateToDisputes={() => setActiveTab("disputes")}
                onNavigateToInvoices={() => setActiveTab("invoices")}
              />

              {/* Question 3: What can I do next? */}
              <div className="space-y-4">
                {/* Quick Actions Bar */}
                <OverviewQuickActions
                  onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
                  onNavigateToPricing={() => setActiveTab("pricing")}
                  onNavigateToCheckout={() => setActiveTab("checkout")}
                  onOpenChat={() => setIsChatOpen(true)}
                />

                {/* 5 Most Recent Transactions */}
                <RecentTransactions
                  transactions={transactions}
                  loading={loadingTxns}
                  onViewAll={() => setActiveTab("transactions")}
                />
              </div>
            </div>
          )}

          {/* View: Transactions (Full Ledger) */}
          {activeTab === "transactions" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Transactions</h2>
                <p className="text-xs text-[#626262]">
                  Complete searchable ledger with real-time settlement filtering and CSV export
                </p>
              </div>

              <TransactionGrid
                transactions={transactions}
                loading={loadingTxns}
                externalSearch={globalSearch}
                onSummarizeTransactions={() =>
                  openChatWithPrompt(
                    "Summarise my recent PayPal transactions for the last 30 days. Highlight completed order volume, any pending or failed transactions, and the net payout after fees."
                  )
                }
              />
            </div>
          )}

          {/* View: Invoices */}
          {activeTab === "invoices" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#171717]">Invoices</h2>
                  <p className="text-xs text-[#626262]">
                    Verified PayPal Invoicing v2 draft creation, preview, and status tracking
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openChatWithPrompt(
                        "Help me prepare an invoice for a customer. Please ask for the customer email, line items, and amount to generate an exact preview."
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF3EB] hover:bg-[#FFE7D6] text-[#C2410C] border border-[#FED7AA] rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Help prepare with AI</span>
                  </button>
                  <button
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Invoice</span>
                  </button>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#626262] bg-[#F7F7F8] rounded-xl border border-[#E5E5E5]">
                  No invoices recorded yet. Click <strong>+ New Invoice</strong> to prepare a verified draft.
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#D4D4D4] transition-all flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F7F7F8] border border-[#E5E5E5] flex items-center justify-center font-mono text-xs text-[#171717] font-bold">
                          <FileText className="w-4 h-4 text-[#626262]" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#171717]">{inv.recipientName}</div>
                          <div className="text-xs text-[#626262] font-mono">{inv.recipientEmail}</div>
                          <div className="text-[11px] text-[#626262] mt-0.5">Invoice #{inv.invoiceNumber}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono tabular-nums font-bold text-sm text-[#171717]">
                            ${inv.amount.toFixed(2)} {inv.currency}
                          </div>
                          <div className="text-[11px] text-[#626262]">Due {inv.dueDate || "On Receipt"}</div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            inv.status === "PAID"
                              ? "bg-[#ECFDF3] text-[#15803D] border-[#BBF7D0]"
                              : inv.status === "SENT"
                              ? "bg-[#FFF3EB] text-[#C2410C] border-[#FED7AA]"
                              : "bg-[#F7F7F8] text-[#171717] border-[#E5E5E5]"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View: Price comparison */}
          {activeTab === "pricing" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Price comparison</h2>
                <p className="text-xs text-[#626262]">
                  Live competitive pricing benchmarks across multi-retailer catalog listings via Channel3
                </p>
              </div>

              <CompetitorPricingGrid
                comparisons={comparisons}
                loading={loadingPricing}
                onAddComparison={(newComp) => setComparisons((prev) => [newComp, ...prev])}
                onExplainComparison={() =>
                  openChatWithPrompt(
                    "Compare my catalog pricing with the retrieved Channel3 market benchmarks. Which items are underpriced or have margin optimization opportunities?"
                  )
                }
              />
            </div>
          )}

          {/* View: Disputes */}
          {activeTab === "disputes" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#171717]">Disputes</h2>
                  <p className="text-xs text-[#626262]">
                    Verified PayPal Sandbox chargeback tracking and customer dispute cases
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#15803D] border border-[#BBF7D0]">
                  {disputes.length === 0 ? "0 Active Disputes" : `${disputes.length} Open Dispute(s)`}
                </span>
              </div>

              {disputes.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#F7F7F8] border border-[#E5E5E5] space-y-2 text-center text-xs">
                  <CheckCircle2 className="w-8 h-8 text-[#15803D] mx-auto mb-1" />
                  <div className="font-semibold text-sm text-[#171717]">
                    {disputeMessage || "No active dispute cases in your PayPal account."}
                  </div>
                  <p className="text-[#626262] max-w-md mx-auto">
                    In the PayPal Sandbox, dispute cases can be triggered via the PayPal Developer Portal. Evidence submission requires verified documentation from the merchant.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl bg-white border border-[#FECACA] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                          <span className="text-xs font-bold text-[#171717]">Dispute #{d.id}</span>
                          <span className="text-[11px] font-mono text-[#626262]">TXN: {d.transactionId}</span>
                        </div>
                        <span className="text-xs font-mono tabular-nums font-bold text-[#B91C1C]">
                          ${d.amount.toFixed(2)} {d.currency}
                        </span>
                      </div>
                      <p className="text-xs text-[#171717]">
                        Reason: <em>{d.reason}</em> • Buyer: <strong>{d.buyerName}</strong>
                      </p>
                      <div className="pt-2 flex items-center justify-between text-xs text-[#626262] border-t border-[#F7F7F8]">
                        <span>Opened: {new Date(d.openedDate).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View: Demo tools (Sandbox Checkout) */}
          {activeTab === "checkout" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Demo Tools: Sandbox Checkout</h2>
                <p className="text-xs text-[#626262]">
                  Simulate buyer payment captures and test server-side order settlement in PayPal Sandbox
                </p>
              </div>

              <PayPalDemoCheckout onPaymentSuccess={handleNewPaymentSuccess} />
            </div>
          )}
        </main>
      </div>

      {/* 3. Collapsible AI Assistant Slide-over Drawer (380-440px on Desktop, Fullscreen on Mobile) */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] transition-transform duration-300 ease-in-out flex flex-col ${
          isChatOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!isChatOpen}
      >
        <ChatPanel
          onClose={() => setIsChatOpen(false)}
          prefillPrompt={prefillPrompt}
          onClearPrefill={() => setPrefillPrompt("")}
        />
      </div>

      {/* Backdrop overlay when chat is open on smaller screens */}
      {isChatOpen && (
        <div
          onClick={() => setIsChatOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Quick Action Modal for Invoices */}
      <QuickActionModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onInvoiceCreated={handleInvoiceCreated}
      />
    </div>
  );
}
