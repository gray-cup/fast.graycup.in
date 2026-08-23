import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ensureSubscriptionPaymentsTable } from "@graycup/db";
import { db } from "@/lib/db";
import { subscriptions, subscriptionPayments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionChargeEmail,
  sendSubscriptionPaymentFailedEmail,
} from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!secretKey) {
      console.error("cashfree-subscription-webhook: CASHFREE_SECRET_KEY not configured");
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

    // SUBSCRIPTION_STATUS_CHANGED nests these fields under `subscription_details`;
    // SUBSCRIPTION_AUTH_STATUS / SUBSCRIPTION_PAYMENT_SUCCESS / SUBSCRIPTION_PAYMENT_FAILED
    // put them directly on `data` — Cashfree does not use a `data.subscription` object.
    const subscriptionRef: string | undefined =
      data?.subscription_details?.subscription_id ?? data?.subscription_id;
    if (!subscriptionRef) {
      console.error("subscription-webhook: missing subscription_id", JSON.stringify(event));
      return NextResponse.json({ ok: true });
    }

    const rows = await db.select().from(subscriptions).where(eq(subscriptions.subscriptionRef, subscriptionRef)).limit(1);
    if (!rows.length) {
      console.error("subscription-webhook: subscription not found", subscriptionRef);
      return NextResponse.json({ ok: true });
    }
    const sub = rows[0];
    const nextChargeDate: string | null = data?.subscription_details?.next_schedule_date ?? sub.nextChargeDate;

    switch (type) {
      case "SUBSCRIPTION_AUTH_STATUS": {
        const authSuccess = data?.payment_status === "SUCCESS";
        const newStatus = authSuccess ? "ACTIVE" : "AUTH_FAILED";
        await db.update(subscriptions)
          .set({ status: newStatus, nextChargeDate })
          .where(eq(subscriptions.subscriptionRef, subscriptionRef));

        if (authSuccess) {
          try {
            await sendSubscriptionConfirmationEmail({ ...sub, status: newStatus, nextChargeDate });
          } catch (err) {
            console.error("subscription confirmation email error:", err);
          }
        }
        break;
      }

      case "SUBSCRIPTION_PAYMENT_SUCCESS": {
        const paymentAmount = Number(data?.payment_amount ?? sub.amount);
        const cfPaymentId = data?.cf_payment_id ? String(data.cf_payment_id) : null;
        await db.update(subscriptions)
          .set({ status: "ACTIVE", nextChargeDate })
          .where(eq(subscriptions.subscriptionRef, subscriptionRef));

        await ensureSubscriptionPaymentsTable();
        await db.insert(subscriptionPayments).values({
          subscriptionRef,
          cfPaymentId,
          amount: Math.round(paymentAmount),
          status: "SUCCESS",
        });

        try {
          await sendSubscriptionChargeEmail({ ...sub, status: "ACTIVE", nextChargeDate }, paymentAmount, cfPaymentId);
        } catch (err) {
          console.error("subscription charge email error:", err);
        }
        break;
      }

      case "SUBSCRIPTION_PAYMENT_FAILED": {
        await ensureSubscriptionPaymentsTable();
        await db.insert(subscriptionPayments).values({
          subscriptionRef,
          cfPaymentId: data?.cf_payment_id ? String(data.cf_payment_id) : null,
          amount: Math.round(Number(data?.payment_amount ?? sub.amount)),
          status: "FAILED",
        });

        try {
          await sendSubscriptionPaymentFailedEmail(sub);
        } catch (err) {
          console.error("subscription payment-failed email error:", err);
        }
        break;
      }

      case "SUBSCRIPTION_STATUS_CHANGED": {
        const newStatus = data?.subscription_details?.subscription_status;
        if (newStatus) {
          await db.update(subscriptions)
            .set({ status: newStatus, nextChargeDate })
            .where(eq(subscriptions.subscriptionRef, subscriptionRef));
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("subscription-webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
