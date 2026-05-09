import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { eq, inArray } from "drizzle-orm";
import { createShipment, getPincodeDetails } from "@/lib/delhivery";

export async function POST(req: NextRequest) {
  const { orderRefs } = await req.json();

  if (!Array.isArray(orderRefs) || orderRefs.length === 0) {
    return NextResponse.json({ error: "No orderRefs provided" }, { status: 400 });
  }

  const orders = await db
    .select()
    .from(schema.orders)
    .where(inArray(schema.orders.orderRef, orderRefs));

  const eligible = orders.filter((o) => ["PAID", "PAID_DISPATCH_PENDING"].includes(o.status));

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible orders (must be PAID)" }, { status: 400 });
  }

  const results: { orderRef: string; waybill?: string; error?: string }[] = [];

  for (const order of eligible) {
    const pincodeInfo = await getPincodeDetails(order.customerPincode).catch(() => null);

    const result = await createShipment({
      orderRef: order.orderRef,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.customerAddress,
      pincode: order.customerPincode,
      city: pincodeInfo?.city || "",
      state: pincodeInfo?.state || "",
      productDesc: `${order.productName} ${order.variantLabel} x${order.quantity}`,
      totalAmount: order.amount,
      weightKg: 0.5,
    });

    if (result.success && result.waybill) {
      await db
        .update(schema.orders)
        .set({ delhiveryWaybill: result.waybill, status: "PAID_DISPATCH_PENDING" })
        .where(eq(schema.orders.orderRef, order.orderRef));
      results.push({ orderRef: order.orderRef, waybill: result.waybill });
    } else {
      results.push({ orderRef: order.orderRef, error: result.error });
    }
  }

  const succeeded = results.filter((r) => r.waybill).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({
    success: succeeded > 0,
    message: `${succeeded} waybill(s) created${failed > 0 ? `, ${failed} failed` : ""}`,
    results,
  });
}
