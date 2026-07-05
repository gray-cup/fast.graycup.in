import { NextResponse } from "next/server";
import { db, schema, ensureSubscriptionsTable, ensureSubscriptionPaymentsTable } from "@graycup/db";
import { desc, inArray, sql } from "drizzle-orm";

export async function GET() {
  await Promise.all([ensureSubscriptionsTable(), ensureSubscriptionPaymentsTable()]);

  const subs = await db
    .select()
    .from(schema.subscriptions)
    .orderBy(desc(schema.subscriptions.createdAt));

  const refs = subs.map((s) => s.subscriptionRef);

  const paymentCounts = refs.length
    ? await db
        .select({
          subscriptionRef: schema.subscriptionPayments.subscriptionRef,
          count: sql<number>`count(*)`.as("count"),
          totalSuccess: sql<number>`coalesce(sum(case when ${schema.subscriptionPayments.status} = 'SUCCESS' then ${schema.subscriptionPayments.amount} else 0 end), 0)`.as("total_success"),
        })
        .from(schema.subscriptionPayments)
        .where(inArray(schema.subscriptionPayments.subscriptionRef, refs))
        .groupBy(schema.subscriptionPayments.subscriptionRef)
    : [];

  const countsByRef = new Map(paymentCounts.map((p) => [p.subscriptionRef, p]));

  const result = subs.map((s) => ({
    ...s,
    paymentsCount: countsByRef.get(s.subscriptionRef)?.count ?? 0,
    totalCollected: countsByRef.get(s.subscriptionRef)?.totalSuccess ?? 0,
  }));

  return NextResponse.json(result);
}
