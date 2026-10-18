import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import {
  listTransactions,
  getMerchantKPIs,
  getRevenueTimeSeries,
  createInvoice,
  createPaymentLink,
  listInvoices,
  listDisputes,
} from "@/lib/paypal/api";
import { getPricingComparison } from "@/lib/channel3/client";

// ─── APIMatic Context: inject accurate PayPal API knowledge into the prompt ──
// This is where APIMatic's Context Plugin value is demonstrated:
// rather than the LLM guessing from stale training data, we provide
// exact current PayPal SDK context directly in the system prompt.

const APIMATIC_PAYPAL_CONTEXT = `
## PayPal API Context (via APIMatic Context Plugin)

You are connected to the PayPal Sandbox environment. All actions use test credentials.

### Available PayPal capabilities:
- Transaction Search API v1: search transactions by date range, status, amount
- Orders API v2: create and capture orders
- Invoicing API v2: create, send, and manage invoices (POST /v2/invoicing/invoices)
- Disputes API v1: list and manage disputes (GET /v1/customer/disputes)
- Payment Links: create shareable payment links

### Key constraints:
- All monetary amounts are strings in the API (e.g., "149.99"), not numbers
- Dates must be ISO 8601 format with timezone (e.g., "2026-10-01T00:00:00.000Z")
- Currency codes are ISO 4217 (e.g., "USD", "EUR", "GBP")
- Sandbox base URL: https://api-m.sandbox.paypal.com
- Authentication: OAuth 2.0 client credentials (client_id + client_secret → Bearer token)
`;

const SYSTEM_PROMPT = `You are PaySight, an AI business intelligence assistant for PayPal merchants.

${APIMATIC_PAYPAL_CONTEXT}

You have access to the merchant's real PayPal sandbox data and live market pricing via Channel3.

## Your capabilities:
1. **Analytics**: Answer questions about transactions, revenue trends, and KPIs
2. **Market Intelligence**: Compare merchant product prices against competitor market data
3. **Agentic Actions**: Create invoices, payment links, and manage orders
4. **Insights**: Flag anomalies, dispute patterns, and business opportunities

## Response guidelines:
- Be concise and actionable
- When showing financial data, always include currency
- For chart data, return structured JSON the dashboard can render
- For agentic actions, confirm what you did and show the result
- If asked about specific numbers, use the tools to fetch real data — never guess
- Format large numbers with commas (e.g., $12,345.67)

## Tool usage:
- Always use tools to fetch data rather than making up numbers
- Chain tools when needed (e.g., get transactions then analyze them)
- For pricing comparisons, first list the merchant's products from transactions, then search Channel3
`;

// ─── PayPal Agent Toolkit (handles invoices + orders agenically) ──────────────

const paypalToolkit = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  configuration: {
    actions: {
      invoices: { create: true, send: true, list: true },
      orders: { create: true },
      paymentLinks: { create: true },
    },
  },
});

// ─── Custom tools (data fetching + channel3) ──────────────────────────────────

const customTools = {
  getTransactions: tool({
    description: "Fetch the merchant's PayPal transaction history. Returns list of transactions with amounts, statuses, products, and customer info.",
    parameters: z.object({
      days: z.number().optional().describe("Number of days to look back (default: 30)"),
    }),
    execute: async ({ days = 30 }) => {
      const txns = await listTransactions(days);
      return { transactions: txns, count: txns.length, days };
    },
  }),

  getKPIs: tool({
    description: "Get merchant KPI summary: total revenue, transaction count, average order value, and dispute rate for the last 30 days with period-over-period changes.",
    parameters: z.object({}),
    execute: async () => getMerchantKPIs(),
  }),

  getRevenueTrend: tool({
    description: "Get daily revenue time series data for charting. Returns date, revenue, and transaction count per day.",
    parameters: z.object({
      days: z.number().optional().describe("Number of days (7, 30, or 90)"),
    }),
    execute: async ({ days = 30 }) => getRevenueTimeSeries(days),
  }),

  getDisputes: tool({
    description: "List all open and recent disputes from PayPal.",
    parameters: z.object({}),
    execute: async () => listDisputes(),
  }),

  getInvoices: tool({
    description: "List the merchant's recent PayPal invoices.",
    parameters: z.object({}),
    execute: async () => listInvoices(),
  }),

  searchCompetitorPrices: tool({
    description: "Search Channel3 for competitor pricing data on a product. Returns market min, max, avg prices and a list of competitors.",
    parameters: z.object({
      productName: z.string().describe("Product name to search for"),
      yourPrice: z.number().describe("The merchant's current price for comparison"),
    }),
    execute: async ({ productName, yourPrice }) =>
      getPricingComparison(productName, yourPrice),
  }),

  createInvoiceTool: tool({
    description: "Create and send a PayPal invoice to a customer.",
    parameters: z.object({
      recipientName: z.string(),
      recipientEmail: z.string().email(),
      items: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        unitAmount: z.number(),
        description: z.string().optional(),
      })),
      currency: z.string().optional().default("USD"),
      note: z.string().optional(),
    }),
    execute: async (input) => createInvoice(input),
  }),

  createPaymentLinkTool: tool({
    description: "Create a PayPal payment link that can be shared with customers.",
    parameters: z.object({
      name: z.string().describe("Name/title for the payment link"),
      amount: z.number().optional().describe("Fixed amount (omit for custom amount)"),
      currency: z.string().optional().default("USD"),
      description: z.string().optional(),
      allowCustomAmount: z.boolean().optional().default(false),
    }),
    execute: async (input) => createPaymentLink(input),
  }),
};

// ─── Streaming chat handler ───────────────────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function createChatStream(messages: ChatMessage[]) {
  const agentKitTools = paypalToolkit.getTools();

  return streamText({
    model: google("gemini-2.0-flash") as any,
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      ...agentKitTools,
      ...customTools,
    },
    maxSteps: 8,
    temperature: 0.2,
  });
}
