import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureOrdersColumns } from "@graycup/db";
import { eq } from "drizzle-orm";
import { createShadowfaxOrder } from "@/lib/shadowfax";

export async function POST(req: NextRequest) {
  await ensureOrdersColumns();
  const { orderRef } = await req.json();

  if (!orderRef) return NextResponse.json({ error: "orderRef required" }, { status: 400 });

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderRef, orderRef));

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!["PAID", "PAID_DISPATCH_PENDING"].includes(order.status)) {
    return NextResponse.json({ error: "Order must be PAID" }, { status: 400 });
  }

  const result = await createShadowfaxOrder({
    orderRef: order.orderRef,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.customerAddress,
    pincode: order.customerPincode,
    productDesc: `${order.productName} ${order.variantLabel} x${order.quantity}`,
    totalAmount: order.amount,
    gstAmount: order.gstAmount,
    weightGrams: order.totalWeightGrams ?? undefined,
    quantity: order.quantity,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await db.update(schema.orders)
    .set({ shadowfaxRequestId: result.requestId, carrier: "shadowfax", status: "PAID_DISPATCH_PENDING" })
    .where(eq(schema.orders.orderRef, orderRef));

  return NextResponse.json({ success: true, requestId: result.requestId });
}
