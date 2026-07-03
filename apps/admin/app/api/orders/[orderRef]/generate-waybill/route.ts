import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { eq } from "drizzle-orm";
import { createShipment, getPincodeDetails } from "@/lib/delhivery";
import { delhiveryWeightKg } from "@/lib/orderWeight";
import { sendTrackingEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderRef: string }> }
) {
  const { orderRef } = await params;

  const rows = await db.select().from(schema.orders).where(eq(schema.orders.orderRef, orderRef)).limit(1);
  if (!rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = rows[0];
  const pincodeInfo = await getPincodeDetails(order.customerPincode).catch(() => null);

  const result = await createShipment({
    orderRef,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: order.customerAddress,
    pincode: order.customerPincode,
    city: pincodeInfo?.city || "",
    state: pincodeInfo?.state || "",
    productDesc: `${order.productName} ${order.variantLabel} x${order.quantity}`,
    totalAmount: order.amount,
    weightKg: delhiveryWeightKg(order),
  });

  if (result.success && result.waybill) {
    await db.update(schema.orders)
      .set({ delhiveryWaybill: result.waybill, status: "PAID_DISPATCH_PENDING" })
      .where(eq(schema.orders.orderRef, orderRef));
    try {
      await sendTrackingEmail(order, result.waybill, "Delhivery");
    } catch (err) {
      console.error("tracking email error:", err);
    }
    return NextResponse.json({ success: true, waybill: result.waybill, status: "PAID_DISPATCH_PENDING" });
  }

  return NextResponse.json({ error: result.error || "Failed to create shipment" }, { status: 502 });
}