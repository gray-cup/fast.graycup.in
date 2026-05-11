import { NextResponse } from "next/server";
import { db, sql } from "@graycup/db";

export async function GET() {
  const [pinsResult, statesResult] = await Promise.all([
    db.execute(sql`
      SELECT
        p.pincode,
        p.latitude,
        p.longitude,
        p.city,
        p.state,
        COUNT(o.id)::int AS order_count
      FROM pincodes p
      INNER JOIN orders o ON o.customer_pincode = p.pincode
      WHERE o.status NOT IN ('CANCELLED', 'EXPIRED')
      GROUP BY p.pincode, p.latitude, p.longitude, p.city, p.state
      ORDER BY order_count DESC
    `),
    db.execute(sql`
      SELECT
        p.state,
        COUNT(o.id)::int AS total_count,
        COUNT(o.id) FILTER (WHERE o.status = 'EXPIRED')::int AS expired_count,
        COUNT(o.id) FILTER (
          WHERE o.status IN ('PAID','PAID_DISPATCH_PENDING','DISPATCHED','DELIVERED')
        )::int AS successful_count
      FROM pincodes p
      INNER JOIN orders o ON o.customer_pincode = p.pincode
      WHERE p.state IS NOT NULL
      GROUP BY p.state
      ORDER BY total_count DESC
    `),
  ]);

  return NextResponse.json({
    pins: pinsResult.rows,
    states: statesResult.rows,
  });
}
