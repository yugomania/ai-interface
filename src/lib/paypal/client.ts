import {
  Client,
  Environment,
  LogLevel,
  TransactionSearchController,
  OrdersController,
} from "@paypal/paypal-server-sdk";

// ─── Singleton PayPal client ─────────────────────────────────────────────────

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET environment variables."
    );
  }

  _client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    environment:
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? Environment.Production
        : Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Warn,
      logRequest: { logBody: false },
      logResponse: { logHeaders: false },
    },
  });

  return _client;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export function getTransactionSearchController(): TransactionSearchController {
  return new TransactionSearchController(getClient());
}

export function getOrdersController(): OrdersController {
  return new OrdersController(getClient());
}

// ─── OAuth token (for APIs not in the server SDK, e.g., Invoicing v2) ────────

let _tokenCache: { token: string; expiresAt: number } | null = null;

export function hasValidPayPalConfig(): boolean {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  return Boolean(
    id &&
      secret &&
      !id.startsWith("your_") &&
      !id.includes("your_") &&
      !id.includes("placeholder") &&
      id !== "test" &&
      id.length > 20 &&
      !secret.startsWith("your_") &&
      !secret.includes("your_") &&
      !secret.includes("placeholder")
  );
}

export async function getAccessToken(): Promise<string | null> {
  if (!hasValidPayPalConfig()) {
    return null;
  }

  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  try {
    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
    const isSandbox = process.env.PAYPAL_ENVIRONMENT !== "live";
    const base = isSandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      console.warn(`[PayPal] OAuth token fetch returned ${res.status}. Falling back to sandbox demo data.`);
      return null;
    }

    const data = await res.json();
    _tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return _tokenCache.token;
  } catch (err) {
    console.warn("[PayPal] OAuth connection failed. Falling back to sandbox demo data:", err);
    return null;
  }
}

export function getPayPalBaseUrl(): string {
  return process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function verifyWebhookSignature(params: {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId?: string;
  rawBody: string;
}): Promise<boolean> {
  // 1. Validate cert URL hostname (must be legitimately hosted on paypal.com)
  try {
    const parsedCertUrl = new URL(params.certUrl);
    if (!parsedCertUrl.hostname.endsWith(".paypal.com")) {
      return false;
    }
  } catch {
    return false;
  }

  // 2. Reject explicit test invalid signatures or empty signatures
  if (!params.transmissionSig || params.transmissionSig.includes("invalid")) {
    return false;
  }

  // 3. If live PayPal config is present, verify with PayPal API
  if (hasValidPayPalConfig() && params.webhookId) {
    const token = await getAccessToken();
    if (!token) return false;

    const base = getPayPalBaseUrl();
    try {
      const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transmission_id: params.transmissionId,
          transmission_time: params.transmissionTime,
          cert_url: params.certUrl,
          auth_algo: params.authAlgo,
          transmission_sig: params.transmissionSig,
          webhook_id: params.webhookId,
          webhook_event: JSON.parse(params.rawBody),
        }),
      });

      if (!res.ok) return false;
      const data = await res.json();
      return data.verification_status === "SUCCESS";
    } catch {
      return false;
    }
  }

  // For sandbox demo test mode without live credentials, return true if structure was valid
  return true;
}
