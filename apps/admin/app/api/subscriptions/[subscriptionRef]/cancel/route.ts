import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { eq } from "drizzle-orm";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ subscriptionRef: string }> }
) {
  const { subscriptionRef } = await params;

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.subscriptionRef, subscriptionRef))
    .limit(1);

  if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  if (["CANCELLED", "CUSTOMER_CANCELLED"].includes(sub.status)) {
    return NextResponse.json({ ok: true, status: sub.status });
  }

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const cashfreeEnv = process.env.CASHFREE_ENV || "sandbox";

  if (!appId || !secretKey) {
    return NextResponse.json({ error: "Cashfree credentials not configured" }, { status: 500 });
  }

  const apiBase = cashfreeEnv === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

  const cfRes = await fetch(`${apiBase}/subscriptions/${subscriptionRef}/manage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": "2025-01-01",
    },
    body: JSON.stringify({ subscription_id: subscriptionRef, action: "CANCEL" }),
  });

  const cfData = await cfRes.json();
  if (!cfRes.ok) {
    return NextResponse.json({ error: cfData.message || "Failed to cancel subscription" }, { status: 502 });
  }

  const newStatus = cfData.subscription_status || "CANCELLED";
  await db.update(schema.subscriptions).set({ status: newStatus }).where(eq(schema.subscriptions.subscriptionRef, subscriptionRef));

  return NextResponse.json({ ok: true, status: newStatus });
}
