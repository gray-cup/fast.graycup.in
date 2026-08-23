import { NextRequest, NextResponse } from "next/server";
import { ensureSubscriptionsTable } from "@graycup/db";
import { db, generateSubscriptionRef } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { products } from "@/lib/products";

const GST_RATE = 0.05;

interface SubscriptionPayload {
  productId: string;
  variantLabel: string;
  quantity?: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    pincode: string;
  };
  durationMonths?: number;
  billingIntervalMonths?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: SubscriptionPayload = await req.json();
    const { productId, variantLabel, customer } = body;
    const quantity = body.quantity ?? 1;

    if (!customer?.name || !customer?.phone || !customer?.email || !customer?.address || !customer?.pincode) {
      return NextResponse.json({ error: "Missing required fields (email is required for subscriptions)" }, { status: 400 });
    }

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }
    const variant = product.variants.find((v) => v.label === variantLabel);
    if (!variant) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }
    if (product.outOfStock) {
      return NextResponse.json({ error: "This product is currently out of stock" }, { status: 400 });
    }

    const amount = variant.price * quantity;
    const gstAmt = Math.round((amount * GST_RATE / (1 + GST_RATE)) * 100) / 100;

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || "sandbox";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    if (!appId || !secretKey) {
      return NextResponse.json({ error: "Cashfree credentials not configured" }, { status: 500 });
    }

    const subscriptionRef = await generateSubscriptionRef();

    const apiBase =
      cashfreeEnv === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const cfHeaders = {
      "Content-Type": "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": "2025-01-01",
    };

    // Plans must exist before a subscription can reference them. Reuse one plan
    // per product+variant+price+duration+interval combo — create it if missing, ignore if it already exists.
    const duration = body.durationMonths || 120; // Default 120 months (Ongoing)
    const billingIntervalMonths = body.billingIntervalMonths === 2 ? 2 : 1;
    const durationLabel = duration === 120 ? "ongoing" : `${duration}m`;
    const cycles = Math.max(1, Math.round(duration / billingIntervalMonths));

    const planId = `plan-${product.id}-${variant.label}-${amount}-${durationLabel}-i${billingIntervalMonths}`
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]/g, "-")
      .slice(0, 40);

    const cadenceLabel = billingIntervalMonths === 2 ? "Bimonthly" : "Monthly";
    const planName = `${product.name} ${cadenceLabel} (${duration === 120 ? 'Ongoing' : `${duration} Months`})`
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);

    const planRes = await fetch(`${apiBase}/plans`, {
      method: "POST",
      headers: cfHeaders,
      body: JSON.stringify({
        plan_id: planId,
        plan_name: planName,
        plan_type: "PERIODIC",
        plan_currency: "INR",
        plan_recurring_amount: amount,
        plan_max_amount: amount,
        plan_max_cycles: cycles,
        plan_intervals: billingIntervalMonths,
        plan_interval_type: "MONTH",
      }),
    });

    if (!planRes.ok) {
      const planData = await planRes.json();
      if (planData.code !== "plan_already_exists") {
        return NextResponse.json(
          {
            error: "Something went wrong. Please try again in a moment.",
            _debug: { cashfreeEnv, apiBase, planId, planStatus: planRes.status, planError: planData },
          },
          { status: 502 }
        );
      }
    }

    const cfRes = await fetch(`${apiBase}/subscriptions`, {
      method: "POST",
      headers: cfHeaders,
      body: JSON.stringify({
        subscription_id: subscriptionRef,
        customer_details: {
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email,
        },
        plan_details: {
          plan_id: planId,
        },
        subscription_meta: {
          return_url: `${baseUrl}/subscription-success?ref=${subscriptionRef}`,
        },
      }),
    });

    const cfData = await cfRes.json();

    if (!cfRes.ok) {
      return NextResponse.json(
        {
          error: "Something went wrong. Please try again in a moment.",
          _debug: { cashfreeEnv, apiBase, cfStatus: cfRes.status, cfError: cfData },
        },
        { status: 502 }
      );
    }

    await ensureSubscriptionsTable();
    await db.insert(subscriptions).values({
      subscriptionRef,
      cfSubscriptionId: cfData.cf_subscription_id ? String(cfData.cf_subscription_id) : null,
      productId: product.id,
      productName: product.name,
      variantLabel: variant.label,
      quantity,
      amount,
      gstAmount: gstAmt,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerAddress: customer.address,
      customerPincode: customer.pincode,
      status: cfData.subscription_status || "INITIALIZED",
      nextChargeDate: cfData.next_schedule_date ?? null,
      billingIntervalMonths,
    });

    return NextResponse.json({
      subscriptionRef,
      subscriptionSessionId: cfData.subscription_session_id,
      environment: cashfreeEnv,
    });
  } catch (err) {
    console.error("create-subscription:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
