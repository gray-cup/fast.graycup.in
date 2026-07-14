import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { eq } from "drizzle-orm";
import { createShipment, getPincodeDetails, cancelShipment } from "@/lib/delhivery";
import { createShadowfaxOrder, cancelShadowfaxOrder } from "@/lib/shadowfax";
import { delhiveryWeightKg } from "@/lib/orderWeight";
import { sendTrackingEmail } from "@/lib/email";

/**
 * POST /api/orders/[orderRef]/switch-carrier
 * Body: { to: "delhivery" | "shadowfax" }
 *
 * Switches the delivery partner for a PAID_DISPATCH_PENDING order.
 * - Delhivery → Shadowfax: cancels Delhivery waybill, creates Shadowfax order
 * - Shadowfax → Delhivery: cancels Shadowfax order, creates Delhivery waybill
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderRef: string }> }
) {
  const { orderRef } = await params;
  const body = await req.json().catch(() => ({}));
  const { to } = body as { to?: "delhivery" | "shadowfax" };

  if (!to || !["delhivery", "shadowfax"].includes(to)) {
    return NextResponse.json({ error: "Body must include { to: 'delhivery' | 'shadowfax' }" }, { status: 400 });
  }

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderRef, orderRef));
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const currentCarrier = order.carrier ?? (order.delhiveryWaybill ? "delhivery" : null);

  if (currentCarrier === to) {
    return NextResponse.json({ error: `Order is already using ${to}` }, { status: 400 });
  }

  if (!["PAID", "PAID_DISPATCH_PENDING"].includes(order.status)) {
    return NextResponse.json({ error: "Order must be in PAID or PAID_DISPATCH_PENDING status" }, { status: 400 });
  }

  // ── Switch to Shadowfax ────────────────────────────────────────────────────
  if (to === "shadowfax") {
    // Step 1: Try to cancel Delhivery waybill if one exists (best-effort)
    if (order.delhiveryWaybill) {
      const cancelResult = await cancelShipment(order.delhiveryWaybill).catch(() => ({ success: false, error: "cancel failed" }));
      if (!cancelResult.success) {
        // Log but don't block — admin may cancel manually
        console.warn(`[switch-carrier] Delhivery cancel failed for ${order.delhiveryWaybill}:`, cancelResult.error);
      }
    }

    // Step 2: Clear old carrier data
    await db.update(schema.orders)
      .set({ delhiveryWaybill: null, delhiveryPickupDate: null, carrier: null, status: "PAID" })
      .where(eq(schema.orders.orderRef, orderRef));

    // Step 3: Create Shadowfax order
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
      // Restore previous Delhivery state if Shadowfax fails
      await db.update(schema.orders)
        .set({
          delhiveryWaybill: order.delhiveryWaybill,
          delhiveryPickupDate: order.delhiveryPickupDate,
          carrier: order.carrier,
          status: order.status,
        })
        .where(eq(schema.orders.orderRef, orderRef));
      return NextResponse.json({ success: false, error: result.error || "Failed to create Shadowfax order" }, { status: 502 });
    }

    await db.update(schema.orders)
      .set({ shadowfaxRequestId: result.requestId, carrier: "shadowfax", status: "PAID_DISPATCH_PENDING" })
      .where(eq(schema.orders.orderRef, orderRef));

    try {
      await sendTrackingEmail(order, result.requestId, "Shadowfax");
    } catch (err) {
      console.error("tracking email error:", err);
    }

    return NextResponse.json({ success: true, carrier: "shadowfax", requestId: result.requestId });
  }

  // ── Switch to Delhivery ────────────────────────────────────────────────────
  if (to === "delhivery") {
    // Step 1: Try to cancel Shadowfax order if one exists (best-effort)
    if (order.shadowfaxRequestId) {
      const cancelResult = await cancelShadowfaxOrder(order.shadowfaxRequestId).catch(() => ({ success: false, error: "cancel failed" }));
      if (!cancelResult.success) {
        console.warn(`[switch-carrier] Shadowfax cancel failed for ${order.shadowfaxRequestId}:`, cancelResult.error);
      }
    }

    // Step 2: Clear old carrier data
    await db.update(schema.orders)
      .set({ shadowfaxRequestId: null, carrier: null, status: "PAID" })
      .where(eq(schema.orders.orderRef, orderRef));

    // Step 3: Create Delhivery waybill
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
      weightKg: delhiveryWeightKg(order),
    });

    if (!result.success || !result.waybill) {
      // Restore Shadowfax state if Delhivery fails
      await db.update(schema.orders)
        .set({
          shadowfaxRequestId: order.shadowfaxRequestId,
          carrier: order.carrier,
          status: order.status,
        })
        .where(eq(schema.orders.orderRef, orderRef));
      return NextResponse.json({ success: false, error: result.error || "Failed to create Delhivery waybill" }, { status: 502 });
    }

    await db.update(schema.orders)
      .set({ delhiveryWaybill: result.waybill, carrier: "delhivery", status: "PAID_DISPATCH_PENDING" })
      .where(eq(schema.orders.orderRef, orderRef));

    try {
      await sendTrackingEmail(order, result.waybill, "Delhivery");
    } catch (err) {
      console.error("tracking email error:", err);
    }

    return NextResponse.json({ success: true, carrier: "delhivery", waybill: result.waybill });
  }
}
