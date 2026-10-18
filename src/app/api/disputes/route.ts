import { listDisputes } from "@/lib/paypal/api";

export async function GET() {
  try {
    const disputes = await listDisputes();
    return Response.json(disputes);
  } catch (err) {
    console.error("[/api/disputes] error:", err);
    return Response.json({ error: "Failed to fetch disputes" }, { status: 500 });
  }
}
