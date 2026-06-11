import { NextResponse } from "next/server";
import { db, sql, ensureManualInvoicesTable } from "@graycup/db";
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
  try {
  await ensureManualInvoicesTable();
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const orderWhere = [];
  if (startDate) orderWhere.push(sql`created_at >= ${startDate}::date`);
  if (endDate) orderWhere.push(sql`created_at < (${endDate}::date + interval '1 day')`);

  const manualWhere = [];
  if (startDate) manualWhere.push(sql`invoice_date::date >= ${startDate}::date`);
  if (endDate) manualWhere.push(sql`invoice_date::date <= ${endDate}::date`);

  const ordersResult = await db.execute(sql`
    SELECT customer_pincode, amount, total_weight_grams
    FROM orders
    WHERE status IN ('PAID', 'PAID_DISPATCH_PENDING', 'DISPATCHED', 'DELIVERED')
    ${orderWhere.length ? sql`AND ${sql.join(orderWhere, sql` AND `)}` : sql``}
  `);

  let manualsResult: { rows: { buyer_pincode: string; amount: number; total_weight_grams: number }[] } = { rows: [] };
  try {
    manualsResult = await db.execute(sql`
      SELECT buyer_pincode, amount, 0 as total_weight_grams
      FROM manual_invoices
      ${manualWhere.length ? sql`WHERE ${sql.join(manualWhere, sql` AND `)}` : sql``}
    `);
  } catch (e) {
    console.error("manual_invoices query failed (table may not exist yet):", e);
  }

  const orders = ordersResult;
  const manuals = manualsResult;

  const stateMap = new Map<string, { orders: number; revenue: number; weightGrams: number }>();

  for (const row of orders.rows as { customer_pincode: string; amount: number; total_weight_grams: number }[]) {
    const state = pincodeToState(row.customer_pincode);
    if (!state) continue;
    let e = stateMap.get(state);
    if (!e) { e = { orders: 0, revenue: 0, weightGrams: 0 }; stateMap.set(state, e); }
    e.orders += 1;
    e.revenue += row.amount ?? 0;
    e.weightGrams += row.total_weight_grams ?? 0;
  }

  for (const row of manuals.rows as { buyer_pincode: string; amount: number; total_weight_grams: number }[]) {
    const state = pincodeToState(row.buyer_pincode);
    if (!state) continue;
    let e = stateMap.get(state);
    if (!e) { e = { orders: 0, revenue: 0, weightGrams: 0 }; stateMap.set(state, e); }
    e.orders += 1;
    e.revenue += row.amount ?? 0;
    e.weightGrams += row.total_weight_grams ?? 0;
  }

  const result = Array.from(stateMap.entries())
    .map(([state, e]) => ({ state, orders: e.orders, revenue: e.revenue, weightGrams: e.weightGrams }))
    .sort((a, b) => b.orders - a.orders);

  return NextResponse.json(result);
  } catch (err) {
    console.error("state-orders error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
