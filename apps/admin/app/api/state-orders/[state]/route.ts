import { NextResponse } from "next/server";
import { db, sql, ensureManualInvoicesTable } from "@graycup/db";
import ranges from "../../../../lib/pincode-ranges.json";

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

export async function GET(req: Request, { params }: { params: { state: string } }) {
  try {
    await ensureManualInvoicesTable();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const orderWhere = [sql`status IN ('PAID', 'PAID_DISPATCH_PENDING', 'DISPATCHED', 'DELIVERED')`];
    if (startDate) orderWhere.push(sql`created_at >= ${startDate}::date`);
    if (endDate) orderWhere.push(sql`created_at < (${endDate}::date + interval '1 day')`);

    const manualWhere = [];
    if (startDate) manualWhere.push(sql`invoice_date::date >= ${startDate}::date`);
    if (endDate) manualWhere.push(sql`invoice_date::date <= ${endDate}::date`);

    const ordersResult = await db.execute(sql`
      SELECT customer_name, product_name, quantity, customer_pincode
      FROM orders
      WHERE ${sql.join(orderWhere, sql` AND `)}
      ORDER BY created_at DESC
    `);

    let manualsResult: { rows: { buyer_name: string; item_description: string; quantity: number; buyer_pincode: string }[] } = { rows: [] };
    try {
      manualsResult = await db.execute(sql`
        SELECT buyer_name, item_description, quantity, buyer_pincode
        FROM manual_invoices
        ${manualWhere.length ? sql`WHERE ${sql.join(manualWhere, sql` AND `)}` : sql``}
        ORDER BY invoice_date DESC
      `);
    } catch (e) {
      console.error("manual_invoices query failed (table may not exist yet):", e);
    }

    const orders = ordersResult;
    const manuals = manualsResult;

    const targetState = params.state;

    // Filter orders by state
    const stateOrders = [];

    for (const row of orders.rows as { customer_name: string; product_name: string; quantity: number; customer_pincode: string }[]) {
      const state = pincodeToState(row.customer_pincode);
      if (state === targetState) {
        stateOrders.push({
          customerName: row.customer_name,
          productName: row.product_name,
          quantity: row.quantity,
          source: "online"
        });
      }
    }

    for (const row of manuals.rows as { buyer_name: string; item_description: string; quantity: number; buyer_pincode: string }[]) {
      const state = pincodeToState(row.buyer_pincode);
      if (state === targetState) {
        stateOrders.push({
          customerName: row.buyer_name,
          productName: row.item_description,
          quantity: row.quantity,
          source: "manual"
        });
      }
    }

    return NextResponse.json(stateOrders);
  } catch (err) {
    console.error("state-orders detail error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
