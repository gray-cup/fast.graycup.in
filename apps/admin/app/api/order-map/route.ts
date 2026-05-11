import { NextResponse } from "next/server";
import { db, sql, ensureManualInvoicesTable } from "@graycup/db";
import ranges from "../../../lib/pincode-ranges.json";

// ranges is sorted by start — binary search for O(log n) lookup
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

export async function GET() {
  await ensureManualInvoicesTable();

  const [orderRows, manualRows] = await Promise.all([
    db.execute(sql`SELECT customer_pincode, status FROM orders`),
    db.execute(sql`SELECT buyer_pincode FROM manual_invoices`).catch(() => ({ rows: [] })),
  ]);

  const stateMap = new Map<string, { total: number; successful: number; expired: number; manual: number }>();

  for (const row of orderRows.rows as { customer_pincode: string; status: string }[]) {
    const state = pincodeToState(row.customer_pincode);
    if (!state) continue;
    let e = stateMap.get(state);
    if (!e) { e = { total: 0, successful: 0, expired: 0, manual: 0 }; stateMap.set(state, e); }
    e.total += 1;
    if (["PAID", "PAID_DISPATCH_PENDING", "DISPATCHED", "DELIVERED"].includes(row.status)) e.successful += 1;
    if (row.status === "EXPIRED") e.expired += 1;
  }

  for (const row of manualRows.rows as { buyer_pincode: string }[]) {
    const state = pincodeToState(row.buyer_pincode);
    if (!state) continue;
    let e = stateMap.get(state);
    if (!e) { e = { total: 0, successful: 0, expired: 0, manual: 0 }; stateMap.set(state, e); }
    e.total += 1;
    e.manual += 1;
  }

  const result = Array.from(stateMap.entries())
    .map(([state, c]) => ({
      state,
      total_count: c.total,
      successful_count: c.successful,
      expired_count: c.expired,
      manual_count: c.manual,
    }))
    .sort((a, b) => b.total_count - a.total_count);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=60" },
  });
}
