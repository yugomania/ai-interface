// ─── PayPal Transaction Types ───────────────────────────────────────────────

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: "COMPLETED" | "PENDING" | "FAILED" | "REFUNDED" | "DENIED";
  customerName: string;
  customerEmail: string;
  productName: string;
  productSku?: string;
  paymentMethod: "paypal" | "card" | "paylater" | "venmo";
  invoiceId?: string;
  note?: string;
}

export interface MerchantKPIs {
  totalRevenue30d: number;
  totalRevenue30dChange: number;
  transactionCount30d: number;
  transactionCount30dChange: number;
  averageOrderValue: number;
  averageOrderValueChange: number;
  disputeRate: number;
  disputeRateChange: number;
  currency: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions: number;
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
}

// ─── Dispute Types ───────────────────────────────────────────────────────────

export interface Dispute {
  id: string;
  transactionId: string;
  reason: string;
  status: "OPEN" | "WAITING_FOR_SELLER" | "WAITING_FOR_BUYER" | "RESOLVED" | "CANCELLED";
  amount: number;
  currency: string;
  openedDate: string;
  updatedDate: string;
  buyerName: string;
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
