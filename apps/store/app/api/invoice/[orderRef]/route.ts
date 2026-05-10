import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { s3, BUCKET } from "@/lib/s3";
import { generateInvoicePdf } from "@/lib/invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderRef: string }> }
) {
  const { orderRef } = await params;

  const rows = await db.select().from(orders).where(eq(orders.orderRef, orderRef)).limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = rows[0];

  if (order.status === "PENDING") {
    return NextResponse.json(
      { error: "Invoice not ready yet. Your payment is still being confirmed." },
      { status: 202 }
    );
  }

  // Serve from cache only if no AWB (AWB may have been set after caching)
  if (order.invoiceKey && !order.delhiveryWaybill) {
    try {
      const s3Res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: order.invoiceKey }));
      const bytes = await s3Res.Body!.transformToByteArray();
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Invoice-${orderRef}.pdf"`,
        },
      });
    } catch (err) {
      console.error("[invoice] S3 fetch failed, regenerating:", err);
    }
  }

  if (!order.invoiceNumber) {
    return NextResponse.json(
      { error: "Invoice not available for this order." },
      { status: 404 }
    );
  }

  // Generate, upload to bucket0, then serve
  const pdf = await generateInvoicePdf({
    orderNumber: order.id,
    invoiceNumber: order.invoiceNumber ?? "—",
    orderRef: order.orderRef,
    date: order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerAddress: order.customerAddress,
    customerPincode: order.customerPincode,
    productName: order.productName,
    variantLabel: order.variantLabel,
    quantity: order.quantity,
    amount: order.amount,
    gstAmount: order.gstAmount,
    awb: order.delhiveryWaybill,
  });

  const key = `invoices/${orderRef}.pdf`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: new Uint8Array(pdf),
    ContentType: "application/pdf",
  }));

  await db.update(orders).set({ invoiceKey: key }).where(eq(orders.orderRef, orderRef));

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${orderRef}.pdf"`,
    },
  });
}