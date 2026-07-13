import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db, schema, sql } from "@graycup/db";
import { eq, getTableColumns } from "drizzle-orm";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderRef: string }> }
) {
  const { orderRef } = await params;

  const rows = await db
    .select({
      ...getTableColumns(schema.orders),
      orderNumber: sql<number>`(SELECT COUNT(*)::int FROM orders o2 WHERE o2.id <= ${schema.orders.id})`,
    })
    .from(schema.orders)
    .where(eq(schema.orders.orderRef, orderRef))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const o = rows[0];

  const pdf = await renderToBuffer(
    React.createElement(InvoicePdf, {
      data: {
        orderNumber: o.orderNumber,
        invoiceNumber: o.invoiceNumber ?? "—",
        orderRef: o.orderRef,
        date: o.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerAddress: o.customerAddress,
        customerPincode: o.customerPincode,
        productName: o.productName,
        variantLabel: o.variantLabel,
        quantity: o.quantity,
        amount: o.amount,
        gstAmount: Math.round(o.amount * 5 / 105 * 100) / 100,
        discountAmount: o.discountAmount,
        couponCode: o.couponCode,
        batchId: o.batchId,
        cashfreeOrderId: o.cashfreeOrderId,
      },
    }) as React.ReactElement<any>
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${orderRef}.pdf"`,
    },
  });
}
