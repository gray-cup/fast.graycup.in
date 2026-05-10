import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@graycup/db";
import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { trackMultipleShipments, mapDelhiveryStatus } from "@/lib/delhivery";

const TERMINAL_STATUSES = ["DELIVERED", "RETURNED", "CANCELLED"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderRefs } = body as { orderRefs?: string[] };

  // Sync all orders with a waybill that haven't reached a terminal state.
  // This catches packages that Delhivery has delivered (DL) but are still
  // sitting at a pre-terminal status (e.g. DISPATCHED) in our system.
  const conditions = [
    notInArray(schema.orders.status, TERMINAL_STATUSES),
    isNotNull(schema.orders.delhiveryWaybill),
    ...(orderRefs?.length ? [inArray(schema.orders.orderRef, orderRefs)] : []),
  ];

  const orders = await db
    .select()
    .from(schema.orders)
    .where(and(...conditions));

  if (orders.length === 0) {
    return NextResponse.json({ message: "No in-transit orders to sync" });
  }

  const waybills = orders.map((o) => o.delhiveryWaybill!);
  const tracking = await trackMultipleShipments(waybills);

  let updated = 0;

  for (const order of orders) {
    const info = tracking[order.delhiveryWaybill!];
    if (!info) continue;

    const newStatus = mapDelhiveryStatus(info.statusType, info.mainStatus);
    let updateData: any = {};
    
    if (newStatus && newStatus !== order.status) {
      updateData.status = newStatus;
    }
    
    // Store pickup date if available
    if (info.pickupDate && !order.delhiveryPickupDate) {
      updateData.delhiveryPickupDate = info.pickupDate;
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(schema.orders)
        .set(updateData)
        .where(eq(schema.orders.orderRef, order.orderRef));
      updated++;
    }
  }

  return NextResponse.json({
    message: `${updated > 0 ? `${updated} updated` : "No changes"} — checked ${orders.length} in-transit order${orders.length !== 1 ? "s" : ""}`,
    checked: orders.length,
    updated,
  });
}
