import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { eq } from "drizzle-orm";

/** POST /api/subscriptions/[subscriptionRef]/sync — pull live status from Cashfree
 *  and reconcile our row. Escape hatch for subscriptions stuck on a status our
 *  webhook missed (e.g. rows created before the webhook field-path fix). */
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

  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const cashfreeEnv = process.env.CASHFREE_ENV || "sandbox";

  if (!appId || !secretKey) {
    return NextResponse.json({ error: "Cashfree credentials not configured" }, { status: 500 });
  }

  const apiBase = cashfreeEnv === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

  const cfRes = await fetch(`${apiBase}/subscriptions/${subscriptionRef}`, {
    headers: {
      accept: "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": "2025-01-01",
    },
  });

  const cfData = await cfRes.json();
  if (!cfRes.ok) {
    return NextResponse.json({ error: cfData.message || "Failed to fetch subscription from Cashfree" }, { status: 502 });
  }

  const newStatus: string = cfData.subscription_status || sub.status;
  const nextChargeDate: string | null = cfData.next_schedule_date ?? sub.nextChargeDate;

  await db.update(schema.subscriptions)
    .set({ status: newStatus, nextChargeDate })
    .where(eq(schema.subscriptions.subscriptionRef, subscriptionRef));

  return NextResponse.json({ ok: true, status: newStatus, nextChargeDate });
}
