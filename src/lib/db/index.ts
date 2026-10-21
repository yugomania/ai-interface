import fs from "fs";
import path from "path";
import type { Transaction, Invoice } from "@/types";

interface DatabaseSchema {
  transactions: Transaction[];
  invoices: Invoice[];
  processedEvents: string[];
  reconciledIds: string[];
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "paysight-db.json");

// ─── Deterministic Demo Seed Records (Stable figures for judges) ─────────────

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: "TXN-8841-01",
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    amount: 149.99,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Sarah Connor",
    customerEmail: "sarah.c@cyberdyne.io",
    productName: "Premium Noise Cancelling Headphones",
    productSku: "SKU-PNH-01",
    paymentMethod: "paypal",
    note: "PayPal Express Checkout",
  },
  {
    id: "TXN-8841-02",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    amount: 89.99,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Marcus Vance",
    customerEmail: "marcus@vancecorp.com",
    productName: "Ergonomic Mechanical Keyboard",
    productSku: "SKU-EMK-02",
    paymentMethod: "card",
    note: "Credit Card via PayPal",
  },
  {
    id: "TXN-8841-03",
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    amount: 119.99,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Elena Rostova",
    customerEmail: "elena@rostov.tech",
    productName: "Ultra-Clear 4K Streaming Webcam",
    productSku: "SKU-UCW-03",
    paymentMethod: "paypal",
  },
  {
    id: "TXN-8841-04",
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    amount: 49.99,
    currency: "USD",
    status: "PENDING",
    customerName: "David Kim",
    customerEmail: "dkim@innovate.kr",
    productName: "7-in-1 Aluminum USB-C Hub",
    productSku: "SKU-HUB-04",
    paymentMethod: "paylater",
    note: "Awaiting Pay Later settlement",
  },
  {
    id: "TXN-8841-05",
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    amount: 179.99,
    currency: "USD",
    status: "FAILED",
    customerName: "Arthur Dent",
    customerEmail: "arthur@galaxy.org",
    productName: "Mechanical Keyboard Pro",
    productSku: "SKU-MKP-05",
    paymentMethod: "card",
    note: "Card issuer declined transaction",
  },
  {
    id: "TXN-8841-06",
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
    amount: 149.99,
    currency: "USD",
    status: "REFUNDED",
    customerName: "Chloe Bennett",
    customerEmail: "chloe@designhub.ca",
    productName: "Premium Noise Cancelling Headphones",
    productSku: "SKU-PNH-01",
    paymentMethod: "paypal",
    note: "Customer return within 14-day policy",
  },
  {
    id: "TXN-8841-07",
    date: new Date(Date.now() - 11 * 86400000).toISOString(),
    amount: 299.00,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Liam O'Connor",
    customerEmail: "liam@dublinfin.ie",
    productName: "Commercial SaaS Analytics License",
    productSku: "SKU-LIC-07",
    paymentMethod: "paypal",
  },
  {
    id: "TXN-8841-08",
    date: new Date(Date.now() - 14 * 86400000).toISOString(),
    amount: 59.99,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Amara Singh",
    customerEmail: "amara@singhventures.in",
    productName: "Ergonomic Monitor Riser",
    productSku: "SKU-EMR-08",
    paymentMethod: "venmo",
  },
  {
    id: "TXN-8841-09",
    date: new Date(Date.now() - 18 * 86400000).toISOString(),
    amount: 149.99,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Julian Weber",
    customerEmail: "jweber@berlineng.de",
    productName: "Premium Noise Cancelling Headphones",
    productSku: "SKU-PNH-01",
    paymentMethod: "paypal",
  },
  {
    id: "TXN-8841-10",
    date: new Date(Date.now() - 22 * 86400000).toISOString(),
    amount: 89.99,
    currency: "USD",
    status: "COMPLETED",
    customerName: "Rachel Green",
    customerEmail: "rachel@centralperk.co",
    productName: "Ergonomic Mechanical Keyboard",
    productSku: "SKU-EMK-02",
    paymentMethod: "paypal",
  },
];

const SEED_INVOICES: Invoice[] = [
  {
    id: "INV2-DEMO-001",
    invoiceNumber: "INV-1001",
    recipientName: "Acme Global Partners",
    recipientEmail: "finance@acmepartners.com",
    amount: 2500.00,
    currency: "USD",
    status: "SENT",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    createdDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      {
        name: "Enterprise Merchant Intelligence License",
        quantity: 1,
        unitAmount: 2500.00,
        description: "Annual PaySight subscription tier",
      },
    ],
  },
  {
    id: "INV2-DEMO-002",
    invoiceNumber: "INV-1002",
    recipientName: "Starlight Digital Media",
    recipientEmail: "billing@starlight.io",
    amount: 890.00,
    currency: "USD",
    status: "PAID",
    dueDate: new Date(Date.now() - 1 * 86400000).toISOString().split("T")[0],
    createdDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    items: [
      {
        name: "Channel3 SKU Price Radar Integration",
        quantity: 1,
        unitAmount: 890.00,
        description: "Automated catalog tracking",
      },
    ],
  },
];

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content) as DatabaseSchema;
    } catch {
      // If corrupted, re-seed
    }
  }

  const initial: DatabaseSchema = {
    transactions: SEED_TRANSACTIONS,
    invoices: SEED_INVOICES,
    processedEvents: [],
    reconciledIds: [],
    lastUpdated: new Date().toISOString(),
  };

  saveDb(initial);
  return initial;
}

function saveDb(data: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempFile, DB_FILE);
}

// ─── Database Accessors ──────────────────────────────────────────────────────

export function getStoredTransactions(): Transaction[] {
  const db = initDb();
  return db.transactions;
}

export function saveTransaction(txn: Transaction): void {
  const db = initDb();
  const existingIdx = db.transactions.findIndex((t) => t.id === txn.id);
  if (existingIdx >= 0) {
    db.transactions[existingIdx] = txn;
  } else {
    db.transactions.unshift(txn);
  }
  db.lastUpdated = new Date().toISOString();
  saveDb(db);
}

export function getStoredInvoices(): Invoice[] {
  const db = initDb();
  return db.invoices;
}

export function saveInvoice(inv: Invoice): void {
  const db = initDb();
  const existingIdx = db.invoices.findIndex((i) => i.id === inv.id);
  if (existingIdx >= 0) {
    db.invoices[existingIdx] = inv;
  } else {
    db.invoices.unshift(inv);
  }
  db.lastUpdated = new Date().toISOString();
  saveDb(db);
}

export function isEventProcessed(eventId: string): boolean {
  const db = initDb();
  return db.processedEvents.includes(eventId);
}

export function markEventProcessed(eventId: string): void {
  const db = initDb();
  if (!db.processedEvents.includes(eventId)) {
    db.processedEvents.push(eventId);
    db.lastUpdated = new Date().toISOString();
    saveDb(db);
  }
}

export function getDbStats(): { transactionCount: number; invoiceCount: number; lastUpdated: string } {
  const db = initDb();
  return {
    transactionCount: db.transactions.length,
    invoiceCount: db.invoices.length,
    lastUpdated: db.lastUpdated,
  };
}
