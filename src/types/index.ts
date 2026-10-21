// ─── PayPal Transaction Types ───────────────────────────────────────────────

export interface Transaction {
  id: string;
  date: string; // ISO 8601 string (UTC)
  amount: number; // Gross amount
  fee?: number; // Provider fee
  net?: number; // Net = amount - fee
  currency: string; // ISO 4217
  status: "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED" | "DENIED";
  customerName: string;
  customerEmail: string;
  productName: string;
  productSku?: string;
  paymentMethod: "paypal" | "card" | "paylater" | "venmo";
  invoiceId?: string;
  note?: string;
  source?: "paypal_sandbox" | "demo_sample";
}

export interface MerchantKPIs {
  totalRevenue30d: number; // Gross completed volume for primary currency
  totalRevenue30dChange: number;
  transactionCount30d: number;
  transactionCount30dChange: number;
  averageOrderValue: number;
  averageOrderValueChange: number;
  disputeRate: number;
  disputeRateChange: number;
  currency: string;
  // Advanced granular analytics
  grossVolume30d: number;
  netVolume30d: number;
  totalFees30d: number;
  refundCount30d: number;
  refundAmount30d: number;
  reportingTimezone: string;
  source: "paypal_sandbox" | "demo_sample";
  lastUpdated: string;
  currencyTotals: Record<string, { gross: number; net: number; count: number }>;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
  refunds?: number;
}

export interface ProductRevenue {
  productName: string;
  revenue: number;
  units: number;
  averagePrice: number;
}

// ─── Invoice Types ───────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  invoiceNumber: string;
  recipientName: string;
  recipientEmail: string;
  amount: number;
  currency: string;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED" | "REFUNDED";
  dueDate: string;
  createdDate: string;
  items: InvoiceItem[];
  paymentUrl?: string;
  source?: "paypal_sandbox" | "demo_sample";
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitAmount: number;
  description?: string;
}

export interface CreateInvoiceInput {
  recipientName: string;
  recipientEmail: string;
  items: InvoiceItem[];
  currency?: string;
  note?: string;
  dueDate?: string;
  autoSend?: boolean; // Must be false unless explicitly authorized
  confirmationToken?: string; // Token bound to exact proposal details
}

export interface InvoiceProposal {
  id: string;
  recipientName: string;
  recipientEmail: string;
  items: InvoiceItem[];
  totalAmount: number;
  currency: string;
  dueDate: string;
  note?: string;
  missingFields: string[];
  isValid: boolean;
  confirmationToken: string;
  status: "PROPOSAL_PENDING_CONFIRMATION";
}

// ─── Dispute Types ───────────────────────────────────────────────────────────

export interface Dispute {
  id: string;
  transactionId: string;
  reason: string;
  status: "OPEN" | "WAITING_FOR_SELLER" | "WAITING_FOR_BUYER" | "RESOLVED" | "UNDER_REVIEW";
  amount: number;
  currency: string;
  openedDate: string;
  updatedDate: string;
  buyerName: string;
  isLiveVerified?: boolean;
  source?: "paypal_sandbox" | "demo_sample";
}

// ─── Payment Link Types ──────────────────────────────────────────────────────

export interface PaymentLink {
  id: string;
  url: string;
  name: string;
  amount?: number;
  currency: string;
  createdDate: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface CreatePaymentLinkInput {
  name: string;
  amount?: number;
  currency?: string;
  description?: string;
  allowCustomAmount?: boolean;
}

// ─── Channel3 / Competitor Pricing Types ────────────────────────────────────

export interface CompetitorProduct {
  productName: string;
  retailer: string;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  imageUrl?: string;
  brand?: string;
  model?: string;
  condition?: "new" | "refurbished" | "used";
  retrievalTime?: string;
  isExactMatch?: boolean;
}

export interface PricingComparison {
  yourProductName: string;
  yourPrice: number;
  yourSku?: string;
  marketMinPrice: number;
  marketMaxPrice: number;
  marketAvgPrice: number;
  competitorCount: number;
  pricePosition: "competitive" | "high" | "low" | "unknown";
  competitors: CompetitorProduct[];
  exactMatchesCount?: number;
  approximateMatchesCount?: number;
  comparisonTimestamp?: string;
  disclaimer?: string;
}

// ─── AI Chat Types ───────────────────────────────────────────────────────────

export interface ChartDataResponse {
  chartType: "line" | "bar" | "pie" | "none";
  data: unknown;
  title?: string;
}

// ─── Dashboard State ─────────────────────────────────────────────────────────

export type DateRangeOption = "7d" | "30d" | "90d";

export interface DashboardFilters {
  dateRange: DateRangeOption;
  status?: Transaction["status"];
  paymentMethod?: Transaction["paymentMethod"];
}
