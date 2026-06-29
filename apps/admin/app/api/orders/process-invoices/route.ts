import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db, schema, generateInvoiceRef, eq, inArray, sql } from "@graycup/db";
import { getTableColumns } from "drizzle-orm";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";
import { s3, BUCKET } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const { orderRefs } = await req.json();
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

    const results: { orderRef: string; invoiceNumber: string; key: string }[] = [];

    for (const o of rows) {
      // Assign invoice number if missing
      let invoiceNumber = o.invoiceNumber;
      if (!invoiceNumber) {
        invoiceNumber = await generateInvoiceRef();
        await db
          .update(schema.orders)
          .set({ invoiceNumber })
          .where(eq(schema.orders.id, o.id));
      }

      const date = o.createdAt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const pdf = await renderToBuffer(
        React.createElement(InvoicePdf, {
          data: {
            orderNumber: o.orderNumber,
            invoiceNumber,
            orderRef: o.orderRef,
            date,
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
          },
        }) as React.ReactElement<any>
      );

      const filename = `${invoiceNumber}.pdf`;
      const key = `invoices/${filename}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: new Uint8Array(pdf),
          ContentType: "application/pdf",
        })
      );

      // Update invoiceKey on the order
      await db
        .update(schema.orders)
        .set({ invoiceKey: key })
        .where(eq(schema.orders.id, o.id));

      // Upsert document record — skip if already exists for this orderRef
      const existing = await db
        .select({ id: schema.documents.id })
        .from(schema.documents)
        .where(eq(schema.documents.orderRef, o.orderRef))
        .limit(1);

      if (!existing.length) {
        await db.insert(schema.documents).values({
          type: "INVOICE",
          source: "ADMIN",
          key,
          orderRef: o.orderRef,
          filename,
        });
      }

      results.push({ orderRef: o.orderRef, invoiceNumber, key });
    }

    return NextResponse.json({ processed: results.length, results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process invoices" }, { status: 500 });
  }
}
