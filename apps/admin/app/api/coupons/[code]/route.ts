import { NextRequest, NextResponse } from "next/server";
import { db, schema, eq } from "@graycup/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
  }

  const [updated] = await db
    .update(schema.coupons)
    .set({ active: body.active })
    .where(eq(schema.coupons.code, code.toUpperCase()))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const [deleted] = await db
    .delete(schema.coupons)
    .where(eq(schema.coupons.code, code.toUpperCase()))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
