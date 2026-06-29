import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db, schema, generateInvoiceRef, sql } from "@graycup/db";
import { eq, inArray, getTableColumns } from "drizzle-orm";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";
import { GstSummaryPdf } from "@/lib/pdf/GstSummaryPdf";
import { MultiInvoiceDoc } from "@/lib/pdf/MultiInvoicePdf";

export async function POST(req: NextRequest) {
  try {
    const { orderRefs, type } = await req.json();
    if (!orderRefs?.length) {
      return NextResponse.json({ error: "No orders selected" }, { status: 400 });
    }

    const rows = await db
      .select({
        ...getTableColumns(schema.orders),
        orderNumber: sql<number>`(SELECT COUNT(*)::int FROM orders o2 WHERE o2.id <= ${schema.orders.id})`,
      })
      .from(schema.orders)
      .where(inArray(schema.orders.orderRef, orderRefs));

    if (!rows.length) {
      return NextResponse.json({ error: "No orders found" }, { status: 404 });
    }

    // Assign invoice numbers to any order that doesn't have one yet
    const orders = await Promise.all(
      rows.map(async (o) => {
        if (!o.invoiceNumber) {
          const invoiceNumber = await generateInvoiceRef();
          await db
            .update(schema.orders)
            .set({ invoiceNumber })
            .where(eq(schema.orders.id, o.id));
          return { ...o, invoiceNumber };
        }
        return o;
      })
    );

    let pdf: Buffer;

    if (type === "gst") {
      const gstRows = orders.map((o) => ({
        invoiceNumber: o.invoiceNumber ?? "—",
        orderRef: o.orderRef,
        customerName: o.customerName,
        state: o.customerAddress.split(",").pop()?.trim() ?? o.customerAddress,
        pincode: o.customerPincode,
        phone: o.customerPhone,
        productName: `${o.productName} ${o.variantLabel}`,
        amount: o.amount,
        gstAmount: Math.round(o.amount * 5 / 105 * 100) / 100,
      }));

      const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

      pdf = await renderToBuffer(
        React.createElement(GstSummaryPdf, { rows: gstRows, date }) as React.ReactElement<any>
      );
    } else {
      const invoiceData = orders.map((o) => ({
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
        batchId: o.batchId,
        cashfreeOrderId: o.cashfreeOrderId,
      }));

      pdf = await renderToBuffer(
        React.createElement(MultiInvoiceDoc, { invoices: invoiceData }) as React.ReactElement<any>
      );
    }

    const filename = type === "gst"
      ? `GST-Summary-${Date.now()}.pdf`
      : `Invoices-${Date.now()}.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
