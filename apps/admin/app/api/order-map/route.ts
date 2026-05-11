import { NextResponse } from "next/server";
import { db, sql } from "@graycup/db";
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
  const rows = await db.execute(sql`
    SELECT customer_pincode, status
    FROM orders
  `);

  const stateMap = new Map<string, { total: number; successful: number; expired: number }>();

  for (const row of rows.rows as { customer_pincode: string; status: string }[]) {
    const state = pincodeToState(row.customer_pincode);
    if (!state) continue;

    let entry = stateMap.get(state);
    if (!entry) { entry = { total: 0, successful: 0, expired: 0 }; stateMap.set(state, entry); }

    entry.total += 1;
    if (["PAID", "PAID_DISPATCH_PENDING", "DISPATCHED", "DELIVERED"].includes(row.status)) entry.successful += 1;
    if (row.status === "EXPIRED") entry.expired += 1;
  }

  const result = Array.from(stateMap.entries())
    .map(([state, c]) => ({ state, total_count: c.total, successful_count: c.successful, expired_count: c.expired }))
    .sort((a, b) => b.total_count - a.total_count);

  return NextResponse.json(result);
}
