import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/authToken";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const email = token ? verifySessionToken(token) : null;
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { subscriptionRef } = await req.json();
  if (!subscriptionRef) {
    return NextResponse.json({ error: "subscriptionRef required" }, { status: 400 });
  }

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.subscriptionRef, subscriptionRef)).limit(1);
  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  if (sub.customerEmail !== email) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (sub.status === "CANCELLED" || sub.status === "CUSTOMER_CANCELLED") {
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
  await db.update(subscriptions).set({ status: newStatus }).where(eq(subscriptions.subscriptionRef, subscriptionRef));

  return NextResponse.json({ ok: true, status: newStatus });
}
