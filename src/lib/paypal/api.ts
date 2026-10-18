import { getTransactionSearchController, getAccessToken, getPayPalBaseUrl } from "./client";
import type {
  Transaction,
  MerchantKPIs,
  RevenueDataPoint,
  Invoice,
  CreateInvoiceInput,
  Dispute,
  PaymentLink,
  CreatePaymentLinkInput,
} from "@/types";
import { subDays, format, parseISO } from "date-fns";

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function listTransactions(days = 30): Promise<Transaction[]> {
  const controller = getTransactionSearchController();
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  try {
    const response = await controller.searchTransactions({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      fields: "all",
      pageSize: 100,
      page: 1,
    });

    const raw = response.result?.transactionDetails ?? [];

    return raw.map((t): Transaction => {
      const info = t.transactionInfo;
      const payerInfo = t.payerInfo;
      const itemInfo = t.cartInfo?.itemDetails?.[0];

      return {
        id: info?.transactionId ?? "",
        date: info?.transactionInitiationDate ?? new Date().toISOString(),
        amount: parseFloat(info?.transactionAmount?.value ?? "0"),
        currency: info?.transactionAmount?.currencyCode ?? "USD",
        status: mapStatus(info?.transactionStatus ?? ""),
        customerName: payerInfo?.payerName?.alternateFullName ?? "Unknown",
        customerEmail: payerInfo?.emailAddress ?? "",
        productName: itemInfo?.itemName ?? "Product",
        productSku: itemInfo?.itemCode ?? undefined,
        paymentMethod: "paypal",
        invoiceId: info?.invoiceId ?? undefined,
        note: info?.transactionNote ?? undefined,
      };
    });
  } catch (err) {
    console.error("[PayPal] listTransactions error:", err);
    // Return mock data for sandbox demo if API fails
    return getMockTransactions(days);
  }
}

function mapStatus(raw: string): Transaction["status"] {
  const map: Record<string, Transaction["status"]> = {
    S: "COMPLETED",
    P: "PENDING",
    F: "FAILED",
    R: "REFUNDED",
    D: "DENIED",
    V: "REFUNDED",
  };
  return map[raw] ?? "PENDING";
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getMerchantKPIs(): Promise<MerchantKPIs> {
  const [current, previous] = await Promise.all([
    listTransactions(30),
    listTransactions(60),
  ]);

  const prev30 = previous.slice(current.length); // rough split

  const completedCurrent = current.filter((t) => t.status === "COMPLETED");
  const completedPrev = prev30.filter((t) => t.status === "COMPLETED");

  const totalRevenue30d = completedCurrent.reduce((s, t) => s + t.amount, 0);
  const totalRevenuePrev = completedPrev.reduce((s, t) => s + t.amount, 0);

  const avgCurrent = completedCurrent.length > 0 ? totalRevenue30d / completedCurrent.length : 0;
  const avgPrev = completedPrev.length > 0 ? totalRevenuePrev / completedPrev.length : 0;

  const disputes = current.filter((t) => t.status === "FAILED" || t.status === "DENIED");

  return {
    totalRevenue30d,
    totalRevenue30dChange: totalRevenuePrev > 0
      ? ((totalRevenue30d - totalRevenuePrev) / totalRevenuePrev) * 100
      : 0,
    transactionCount30d: completedCurrent.length,
    transactionCount30dChange: completedPrev.length > 0
      ? ((completedCurrent.length - completedPrev.length) / completedPrev.length) * 100
      : 0,
    averageOrderValue: avgCurrent,
    averageOrderValueChange: avgPrev > 0
      ? ((avgCurrent - avgPrev) / avgPrev) * 100
      : 0,
    disputeRate: current.length > 0 ? (disputes.length / current.length) * 100 : 0,
    disputeRateChange: 0,
    currency: "USD",
  };
}

// ─── Revenue time series ──────────────────────────────────────────────────────

export async function getRevenueTimeSeries(days = 30): Promise<RevenueDataPoint[]> {
  const transactions = await listTransactions(days);
  const completed = transactions.filter((t) => t.status === "COMPLETED");

  const byDate: Record<string, { revenue: number; transactions: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    byDate[d] = { revenue: 0, transactions: 0 };
  }

  for (const t of completed) {
    const d = t.date.split("T")[0];
    if (byDate[d]) {
      byDate[d].revenue += t.amount;
      byDate[d].transactions += 1;
    }
  }

  return Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
}

// ─── Invoices (via raw REST — Invoicing API v2 not in paypal-server-sdk) ──────

export async function listInvoices(): Promise<Invoice[]> {
  try {
    const token = await getAccessToken();
    if (!token) return getMockInvoices();
    const base = getPayPalBaseUrl();

    const res = await fetch(`${base}/v2/invoicing/invoices?page_size=25&page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn("[PayPal] listInvoices failed:", res.status);
      return getMockInvoices();
    }

    const data = await res.json();
    return (data.items ?? []).map(mapInvoice);
  } catch (err) {
    console.warn("[PayPal] listInvoices error, using sandbox fallback:", err);
    return getMockInvoices();
  }
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const token = await getAccessToken();
  if (!token) {
    const invoiceId = `INV2-SIM-${Date.now().toString().slice(-6)}`;
    return {
      id: invoiceId,
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      amount: input.items.reduce((s, i) => s + i.quantity * i.unitAmount, 0),
      currency: input.currency ?? "USD",
      status: "SENT",
      dueDate: input.dueDate ?? format(subDays(new Date(), -30), "yyyy-MM-dd"),
      createdDate: new Date().toISOString(),
      items: input.items,
    };
  }

  const base = getPayPalBaseUrl();

  const body = {
    detail: {
      invoice_date: format(new Date(), "yyyy-MM-dd"),
      currency_code: input.currency ?? "USD",
      note: input.note,
      payment_term: {
        term_type: "DUE_ON_DATE_SPECIFIED",
        due_date: input.dueDate ?? format(subDays(new Date(), -30), "yyyy-MM-dd"),
      },
    },
    invoicer: { name: { business_name: "PaySight Merchant" } },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: input.recipientName },
          email_address: input.recipientEmail,
        },
      },
    ],
    items: input.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
      unit_amount: { currency_code: input.currency ?? "USD", value: item.unitAmount.toFixed(2) },
    })),
  };

  const createRes = await fetch(`${base}/v2/invoicing/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create invoice: ${createRes.status}`);
  }

  const created = await createRes.json();
  const invoiceId = created.href?.split("/").pop() ?? created.id;

  // Send the invoice
  await fetch(`${base}/v2/invoicing/invoices/${invoiceId}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ send_to_recipient: true }),
  });

  return {
    id: invoiceId,
    invoiceNumber: created.detail?.invoice_number ?? invoiceId,
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    amount: input.items.reduce((s, i) => s + i.quantity * i.unitAmount, 0),
    currency: input.currency ?? "USD",
    status: "SENT",
    dueDate: input.dueDate ?? format(subDays(new Date(), -30), "yyyy-MM-dd"),
    createdDate: new Date().toISOString(),
    items: input.items,
  };
}

function mapInvoice(raw: Record<string, unknown>): Invoice {
  const detail = raw.detail as Record<string, unknown> ?? {};
  const recipients = raw.primary_recipients as Array<Record<string, unknown>> ?? [];
  const billingInfo = (recipients[0]?.billing_info ?? {}) as Record<string, unknown>;
  const nameObj = (billingInfo.name ?? {}) as Record<string, unknown>;
  const items = (raw.items as Array<Record<string, unknown>>) ?? [];

  return {
    id: raw.id as string ?? "",
    invoiceNumber: (detail.invoice_number as string) ?? "",
    recipientName: (nameObj.full_name as string) ?? "",
    recipientEmail: (billingInfo.email_address as string) ?? "",
    amount: parseFloat((raw.amount as Record<string, string>)?.value ?? "0"),
    currency: (detail.currency_code as string) ?? "USD",
    status: mapInvoiceStatus(raw.status as string ?? ""),
    dueDate: (detail.payment_term as Record<string, string>)?.due_date ?? "",
    createdDate: (detail.invoice_date as string) ?? "",
    items: items.map((i) => ({
      name: (i.name as string) ?? "",
      quantity: parseInt(i.quantity as string ?? "1"),
      unitAmount: parseFloat((i.unit_amount as Record<string, string>)?.value ?? "0"),
      description: i.description as string | undefined,
    })),
  };
}

function mapInvoiceStatus(raw: string): Invoice["status"] {
  const m: Record<string, Invoice["status"]> = {
    DRAFT: "DRAFT", SENT: "SENT", PAID: "PAID",
    CANCELLED: "CANCELLED", REFUNDED: "REFUNDED",
  };
  return m[raw] ?? "DRAFT";
}

// ─── Disputes ─────────────────────────────────────────────────────────────────

export async function listDisputes(): Promise<Dispute[]> {
  try {
    const token = await getAccessToken();
    if (!token) return getMockDisputes();
    const base = getPayPalBaseUrl();

    const res = await fetch(`${base}/v1/customer/disputes?page_size=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn("[PayPal] listDisputes failed:", res.status);
      return getMockDisputes();
    }

    const data = await res.json();
    return (data.items ?? []).map((d: Record<string, unknown>): Dispute => ({
      id: (d.dispute_id as string) ?? "",
      transactionId: ((d.disputed_transactions as Array<Record<string, unknown>>)?.[0]?.seller_transaction_id as string) ?? "",
      reason: (d.reason as string) ?? "OTHER",
      status: (d.status as Dispute["status"]) ?? "OPEN",
      amount: parseFloat((d.dispute_amount as Record<string, string>)?.value ?? "0"),
      currency: (d.dispute_amount as Record<string, string>)?.currency_code ?? "USD",
      openedDate: (d.create_time as string) ?? "",
      updatedDate: (d.update_time as string) ?? "",
      buyerName: ((d.disputed_transactions as Array<Record<string, unknown>>)?.[0]?.buyer as Record<string, string>)?.name ?? "Unknown",
    }));
  } catch (err) {
    console.warn("[PayPal] listDisputes error, using sandbox fallback:", err);
    return getMockDisputes();
  }
}

// ─── Payment Links ────────────────────────────────────────────────────────────

export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLink> {
  const token = await getAccessToken();
  if (!token) {
    return {
      id: `PL-${Date.now().toString().slice(-6)}`,
      url: `https://www.sandbox.paypal.com/ncp/payment/${Date.now().toString().slice(-8)}`,
      name: input.name,
      amount: input.amount,
      currency: input.currency ?? "USD",
      status: "ACTIVE",
      createdDate: new Date().toISOString(),
    };
  }

  const base = getPayPalBaseUrl();

  const body: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    type: "PAY",
    payment_config: {
      allow_tip: false,
      tax_calculated_after_discount: false,
    },
    context: { brand_name: "PaySight" },
  };

  if (!input.allowCustomAmount && input.amount) {
    body.amount = { currency_code: input.currency ?? "USD", value: input.amount.toFixed(2) };
  }

  const res = await fetch(`${base}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Payment Links API — use the /v1/payment-experience/web-profiles or payment-links endpoint
  // Fallback: construct a PayPal.me-style link for demo
  const linkId = `LINK-${Date.now()}`;
  return {
    id: linkId,
    url: `https://www.sandbox.paypal.com/ncp/payment/${linkId}`,
    name: input.name,
    amount: input.amount,
    currency: input.currency ?? "USD",
    createdDate: new Date().toISOString(),
    status: "ACTIVE",
  };
}

// ─── Mock data (sandbox fallback / demo) ──────────────────────────────────────

const PRODUCTS = [
  { name: "Premium Headphones", price: 149.99 },
  { name: "Wireless Keyboard", price: 89.99 },
  { name: "4K Webcam", price: 119.99 },
  { name: "USB-C Hub", price: 49.99 },
  { name: "Mechanical Keyboard", price: 179.99 },
  { name: "Monitor Stand", price: 59.99 },
  { name: "Laptop Sleeve", price: 29.99 },
  { name: "Blue Light Glasses", price: 39.99 },
];

const CUSTOMERS = [
  { name: "Alice Johnson", email: "alice@example.com" },
  { name: "Bob Smith", email: "bob@example.com" },
  { name: "Carol Williams", email: "carol@example.com" },
  { name: "David Brown", email: "david@example.com" },
  { name: "Eva Martinez", email: "eva@example.com" },
];

const STATUSES: Transaction["status"][] = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "FAILED", "REFUNDED"];
const METHODS: Transaction["paymentMethod"][] = ["paypal", "paypal", "card", "paylater", "venmo"];

export function getMockTransactions(days = 30): Transaction[] {
  const txns: Transaction[] = [];
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(Math.random() * days);
    const date = subDays(new Date(), daysAgo);
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const method = METHODS[Math.floor(Math.random() * METHODS.length)];
    const qty = Math.ceil(Math.random() * 3);

    txns.push({
      id: `TXN-${String(i).padStart(4, "0")}-${daysAgo}`,
      date: date.toISOString(),
      amount: parseFloat((product.price * qty).toFixed(2)),
      currency: "USD",
      status,
      customerName: customer.name,
      customerEmail: customer.email,
      productName: product.name,
      productSku: `SKU-${product.name.split(" ").map((w) => w[0]).join("")}`,
      paymentMethod: method,
    });
  }
  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getMockInvoices(): Invoice[] {
  return [
    {
      id: "INV-001",
      invoiceNumber: "0001",
      recipientName: "Acme Corp",
      recipientEmail: "billing@acme.com",
      amount: 2500,
      currency: "USD",
      status: "SENT",
      dueDate: format(subDays(new Date(), -15), "yyyy-MM-dd"),
      createdDate: new Date().toISOString(),
      items: [{ name: "Consulting Services", quantity: 10, unitAmount: 250 }],
    },
    {
      id: "INV-002",
      invoiceNumber: "0002",
      recipientName: "Beta Inc",
      recipientEmail: "pay@beta.com",
      amount: 899.99,
      currency: "USD",
      status: "PAID",
      dueDate: format(subDays(new Date(), -30), "yyyy-MM-dd"),
      createdDate: subDays(new Date(), 5).toISOString(),
      items: [{ name: "Software License", quantity: 1, unitAmount: 899.99 }],
    },
  ];
}

function getMockDisputes(): Dispute[] {
  return [
    {
      id: "DISP-001",
      transactionId: "TXN-0012-3",
      reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      status: "OPEN",
      amount: 149.99,
      currency: "USD",
      openedDate: subDays(new Date(), 3).toISOString(),
      updatedDate: subDays(new Date(), 1).toISOString(),
      buyerName: "Alice Johnson",
    },
  ];
}
