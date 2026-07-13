import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureCouponsTable } from "@graycup/db";
import { desc } from "drizzle-orm";

export async function GET() {
  await ensureCouponsTable();
  const coupons = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  await ensureCouponsTable();

  const body = await req.json();
  const { code, discountPercent, maxDiscountAmount, minOrderAmount, usageLimit, expiresAt } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }
  const percent = Number(discountPercent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return NextResponse.json({ error: "Discount percent must be between 1 and 100" }, { status: 400 });
  }

  const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!normalizedCode) {
    return NextResponse.json({ error: "Coupon code must contain alphanumeric characters" }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(schema.coupons)
      .values({
        code: normalizedCode,
        discountPercent: Math.round(percent * 100) / 100,
        maxDiscountAmount: maxDiscountAmount != null && maxDiscountAmount !== "" ? Math.round(Number(maxDiscountAmount)) : null,
        minOrderAmount: minOrderAmount != null && minOrderAmount !== "" ? Math.round(Number(minOrderAmount)) : null,
        usageLimit: usageLimit != null && usageLimit !== "" ? Math.round(Number(usageLimit)) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();
    return NextResponse.json(created);
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
    }
    console.error("create coupon:", err);
    return NextResponse.json(
      {
        error: "Failed to create coupon",
        _debug: {
          message: err?.message ?? String(err),
          code: err?.code,
          detail: err?.detail,
          hint: err?.hint,
          column: err?.column,
          table: err?.table,
        },
      },
      { status: 500 }
    );
  }
}
