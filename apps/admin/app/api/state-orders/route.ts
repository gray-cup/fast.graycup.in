import { NextResponse } from "next/server";
import { db, sql } from "@graycup/db";
import ranges from "../../../lib/pincode-ranges.json";

const RANGES = ranges as [number, number, string][];

function pincodeToState(pincode: string): string | null {
  const n = parseInt(pincode.trim(), 10);
  if (isNaN(n)) return null;
  let lo = 0, hi = RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = RANGES[mid];
    if (n < start) hi = mid - 1;
    else if (n > end) lo = mid + 1;
    else return RANGES[mid][2];
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const orderWhere = [];
  if (startDate) orderWhere.push(sql`created_at >= ${startDate}::date`);
  if (endDate) orderWhere.push(sql`created_at < (${endDate}::date + interval '1 day')`);

  const manualWhere = [];
  if (startDate) manualWhere.push(sql`invoice_date >= ${startDate}::date`);
  if (endDate) manualWhere.push(sql`invoice_date <= ${endDate}::date`);

  const [orders, manuals] = await Promise.all([
    db.execute(sql`
      SELECT customer_pincode, amount
      FROM orders
      WHERE status IN ('PAID', 'PAID_DISPATCH_PENDING', 'DISPATCHED', 'DELIVERED')
      ${orderWhere.length ? sql`AND ${sql.join(orderWhere, sql` AND `)}` : sql``}
    `),
    db.execute(sql`
      SELECT buyer_pincode, amount
      FROM manual_invoices
      ${manualWhere.length ? sql`WHERE ${sql.join(manualWhere, sql` AND `)}` : sql``}
    `),
  ]);

  const stateMap = new Map<string, { orders: number; revenue: number }>();

  for (const row of orders.rows as { customer_pincode: string; amount: number }[]) {
    const state = pincodeToState(row.customer_pincode);
    if (!state) continue;
    let e = stateMap.get(state);
    if (!e) { e = { orders: 0, revenue: 0 }; stateMap.set(state, e); }
    e.orders += 1;
    e.revenue += row.amount ?? 0;
  }

  for (const row of manuals.rows as { buyer_pincode: string; amount: number }[]) {
    const state = pincodeToState(row.buyer_pincode);
    if (!state) continue;
    let e = stateMap.get(state);
    if (!e) { e = { orders: 0, revenue: 0 }; stateMap.set(state, e); }
    e.orders += 1;
    e.revenue += row.amount ?? 0;
  }

  const result = Array.from(stateMap.entries())
    .map(([state, e]) => ({ state, orders: e.orders, revenue: e.revenue }))
    .sort((a, b) => b.orders - a.orders);

  return NextResponse.json(result);
}
