import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { eq } from "drizzle-orm";
import { createShadowfaxOrder } from "@/lib/shadowfax";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ orderRef: string }> }) {
  const { orderRef } = await params;

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderRef, orderRef));
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Clear old Shadowfax assignment first
  await db.update(schema.orders)
    .set({ shadowfaxRequestId: null, carrier: null, status: "PAID" })
    .where(eq(schema.orders.orderRef, orderRef));

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

  if (!result.success || !result.requestId) {
    // Restore previous state if new order creation fails
    await db.update(schema.orders)
      .set({ shadowfaxRequestId: order.shadowfaxRequestId, carrier: order.carrier, status: order.status })
      .where(eq(schema.orders.orderRef, orderRef));
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  await db.update(schema.orders)
    .set({ shadowfaxRequestId: result.requestId, carrier: "shadowfax", status: "PAID_DISPATCH_PENDING" })
    .where(eq(schema.orders.orderRef, orderRef));

  return NextResponse.json({ success: true, requestId: result.requestId });
}
