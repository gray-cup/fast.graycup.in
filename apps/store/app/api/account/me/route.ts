import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, desc } from "drizzle-orm";
import { ensureSubscriptionsTable, ensureSubscriptionPaymentsTable } from "@graycup/db";
import { db } from "@/lib/db";
import { subscriptions, subscriptionPayments } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const email = session?.user.email;
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  await ensureSubscriptionsTable();
  await ensureSubscriptionPaymentsTable();

  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.customerEmail, email))
    .orderBy(desc(subscriptions.createdAt));

  const refs = subs.map((s) => s.subscriptionRef);
  const payments = refs.length
    ? await db
        .select()
        .from(subscriptionPayments)
        .where(inArray(subscriptionPayments.subscriptionRef, refs))
        .orderBy(desc(subscriptionPayments.createdAt))
    : [];

  return NextResponse.json({ email, subscriptions: subs, payments });
}
