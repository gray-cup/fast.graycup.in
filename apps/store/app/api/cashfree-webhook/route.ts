import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { orders, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { s3, BUCKET } from "@/lib/s3";
import { generateInvoicePdf } from "@/lib/invoice";
import { generateInvoiceRef } from "@graycup/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { incrementCouponUsage } from "@/lib/coupons";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!secretKey) {
      console.error("cashfree-webhook: CASHFREE_SECRET_KEY not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    if (!signature || !timestamp) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const expectedSig = createHmac("sha256", secretKey)
      .update(timestamp + rawBody)
      .digest("base64");
    if (expectedSig !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    if (type !== "PAYMENT_SUCCESS_WEBHOOK") {
      return NextResponse.json({ ok: true });
    }

    const orderRef: string = data?.order?.order_id;
    if (!orderRef) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const rows = await db.select().from(orders).where(eq(orders.orderRef, orderRef)).limit(1);
    if (!rows.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const order = rows[0];

    if (order.status === "PAID") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const invoiceNumber = await generateInvoiceRef();

    await db.update(orders).set({ status: "PAID", invoiceNumber }).where(eq(orders.orderRef, orderRef));

    if (order.couponCode) {
      try {
        await incrementCouponUsage(order.couponCode);
      } catch (err) {
        console.error("coupon usage increment error:", err);
      }
    }

    const invoicePdf = await generateInvoicePdf({
      invoiceNumber,
      orderRef,
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
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
    });

    const invoiceKey = `invoices/${orderRef}.pdf`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: invoiceKey,
      Body: new Uint8Array(invoicePdf),
      ContentType: "application/pdf",
    }));

    await db.update(orders).set({ invoiceKey }).where(eq(orders.orderRef, orderRef));

    await db.insert(documents).values({
      type: "INVOICE",
      source: "STORE",
      key: invoiceKey,
      orderRef,
      filename: `Invoice-${orderRef}.pdf`,
    });

    try {
      await sendOrderConfirmationEmail(order);
    } catch (err) {
      console.error("order confirmation email error:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
