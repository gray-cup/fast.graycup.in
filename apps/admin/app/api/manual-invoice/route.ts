import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { s3, BUCKET } from "@/lib/s3";
import { ManualInvoicePdf } from "@/lib/pdf/ManualInvoicePdf";
import { db, manualInvoices, ensureManualInvoicesTable } from "@graycup/db";

function generateManualInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `GCMINV-${ts}${rand}`;
}

export async function POST(req: NextRequest) {
  await ensureManualInvoicesTable();
  try {
    const body = await req.json();
    const {
      buyerName, buyerPhone, buyerEmail, buyerAddress, buyerPincode,
      itemDescription, itemVariant, quantity, amount, gstAmount,
      upiTransactionId, upiScreenshotDataUri, date,
    } = body;

    if (!buyerName || !buyerPhone || !buyerAddress || !buyerPincode || !itemDescription || !amount || !upiTransactionId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const invoiceNumber = generateManualInvoiceNumber();

    const pdf = await renderToBuffer(
      React.createElement(ManualInvoicePdf, {
        data: {
          invoiceNumber,
          date,
          buyerName,
          buyerPhone,
          buyerEmail: buyerEmail || null,
          buyerAddress,
          buyerPincode,
          itemDescription,
          itemVariant: itemVariant || null,
          quantity: Number(quantity) || 1,
          amount: Number(amount),
          gstAmount: Number(gstAmount) || 0,
          upiTransactionId,
          upiScreenshotDataUri: upiScreenshotDataUri || null,
        },
      }) as React.ReactElement<any>
    );

    const filename = `${invoiceNumber}.pdf`;
    const key = `manual-invoices/${filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: new Uint8Array(pdf),
        ContentType: "application/pdf",
        Metadata: {
          "invoice-number": invoiceNumber,
          "buyer-name": encodeURIComponent(buyerName),
          "upi-transaction-id": encodeURIComponent(upiTransactionId),
          "date": date,
        },
      })
    );

    try {
      await db.insert(manualInvoices).values({
        invoiceNumber,
        buyerName,
        buyerPhone,
        buyerEmail: buyerEmail || null,
        buyerAddress,
        buyerPincode,
        itemDescription,
        itemVariant: itemVariant || null,
        quantity: Number(quantity) || 1,
        amount: Number(amount),
        gstAmount: Number(gstAmount) || 0,
        upiTransactionId,
        invoiceDate: date,
      });
    } catch (insertError) {
      console.error("manual invoice DB insert failed:", insertError);
    }

    return NextResponse.json({ invoiceNumber, key, filename });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
