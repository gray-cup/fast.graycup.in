import { NextRequest, NextResponse } from "next/server";
import { db, schema, ensureOrdersColumns } from "@graycup/db";
import { eq, inArray } from "drizzle-orm";
import { createShadowfaxOrder } from "@/lib/shadowfax";

export async function POST(req: NextRequest) {
  await ensureOrdersColumns();
  const { orderRefs } = await req.json();

  if (!Array.isArray(orderRefs) || orderRefs.length === 0) {
    return NextResponse.json({ error: "No orderRefs provided" }, { status: 400 });
  }

  const orders = await db.select().from(schema.orders).where(inArray(schema.orders.orderRef, orderRefs));
  const eligible = orders.filter((o) => ["PAID", "PAID_DISPATCH_PENDING"].includes(o.status));

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible orders (must be PAID)" }, { status: 400 });
  }

  const results: { orderRef: string; requestId?: string; error?: string }[] = [];

  for (const order of eligible) {
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

    if (result.success && result.requestId) {
      await db.update(schema.orders)
        .set({ shadowfaxRequestId: result.requestId, carrier: "shadowfax", status: "PAID_DISPATCH_PENDING" })
        .where(eq(schema.orders.orderRef, order.orderRef));
      results.push({ orderRef: order.orderRef, requestId: result.requestId });
    } else {
      results.push({ orderRef: order.orderRef, error: result.error });
    }
  }

  const succeeded = results.filter((r) => r.requestId).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({
    success: succeeded > 0,
    message: `${succeeded} Shadowfax order(s) created${failed > 0 ? `, ${failed} failed` : ""}`,
    results,
  });
}
