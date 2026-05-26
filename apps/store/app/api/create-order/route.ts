import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ensureOrdersColumns } from "@graycup/db";
import { db, generateOrderRef } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getPincodeDetails } from "@/lib/delhivery";
import { products, FREE_DELIVERY_THRESHOLD } from "@/lib/products";

export function orderToken(orderRef: string): string {
  const secret = process.env.CASHFREE_SECRET_KEY ?? "fallback";
  return createHmac("sha256", secret).update(orderRef).digest("hex").slice(0, 24);
}

const GST_RATE = 0.05;

interface OrderLine {
  productId: string;
  productName: string;
  variantLabel: string;
  weightGrams: number;
  quantity: number;
  price: number;
  batchId?: string | null;
}

interface OrderPayload {
  productId?: string;
  productName?: string;
  variantLabel?: string;
  weightGrams?: number;
  quantity?: number;
  amount?: number;
  batchId?: string | null;
  items?: OrderLine[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    pincode: string;
  };
}

function computeOrderWeights(body: OrderPayload): {
  weightCategory: string;
  unitWeightGrams: number;
  totalWeightGrams: number;
} | null {
  if (body.items && body.items.length > 0) {
    let totalGrams = 0;
    const labels = new Set<string>();
    for (const item of body.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.label === item.variantLabel);
      if (!variant) return null;
      totalGrams += variant.weightGrams * item.quantity;
      labels.add(variant.label);
    }
    const weightCategory =
      labels.size === 1 ? [...labels][0] : [...labels].sort().join("+");
    const totalQty = body.items.reduce((s, i) => s + i.quantity, 0);
    const first = body.items[0];
    const unitWeightGrams =
      body.items.length === 1
        ? products.find((p) => p.id === first.productId)!.variants.find(
            (v) => v.label === first.variantLabel
          )!.weightGrams
        : Math.round(totalGrams / totalQty) || 150;
    return { weightCategory, unitWeightGrams, totalWeightGrams: totalGrams };
  }
  if (body.productId && body.variantLabel && body.quantity) {
    const product = products.find((p) => p.id === body.productId);
    if (!product) return null;
    const variant = product.variants.find((v) => v.label === body.variantLabel);
    if (!variant) return null;
    return {
      weightCategory: variant.label,
      unitWeightGrams: variant.weightGrams,
      totalWeightGrams: variant.weightGrams * body.quantity,
    };
  }
  return null;
}

function computeAmount(payload: OrderPayload): number | null {
  if (payload.items && payload.items.length > 0) {
    let subtotal = 0;
    let deliveryIfCharged = 0;
    for (const item of payload.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.label === item.variantLabel);
      if (!variant) return null;
      subtotal += variant.price * item.quantity;
      deliveryIfCharged += (variant.deliveryCharge ?? 0) * item.quantity;
    }
    return subtotal + (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryIfCharged);
  }
  if (payload.productId && payload.variantLabel && payload.quantity) {
    const product = products.find((p) => p.id === payload.productId);
    if (!product) return null;
    const variant = product.variants.find((v) => v.label === payload.variantLabel);
    if (!variant) return null;
    const subtotal = variant.price * payload.quantity;
    const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (variant.deliveryCharge ?? 0);
    return subtotal + delivery;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body: OrderPayload = await req.json();
    const { customer, items } = body;
    const productId = body.productId ?? items?.[0]?.productId ?? "";
    const productName = items
      ? items.map((i) => `${i.productName} ${i.variantLabel} ×${i.quantity}`).join(", ")
      : `${body.productName} ${body.variantLabel} ×${body.quantity}`;
    const variantLabel = body.variantLabel ?? items?.map((i) => i.variantLabel).join(", ") ?? "";
    const quantity = body.quantity ?? items?.reduce((s, i) => s + i.quantity, 0) ?? 1;
    const batchId = body.batchId ?? items?.[0]?.batchId ?? null;

    const amount = computeAmount(body);
    const weights = computeOrderWeights(body);
    if (!amount || !weights) {
      return NextResponse.json({ error: "Invalid product or variant" }, { status: 400 });
    }

    const allProductIds = body.items ? body.items.map((i) => i.productId) : [productId];
    const outOfStockProduct = products.find((p) => p.outOfStock && allProductIds.includes(p.id));
    if (outOfStockProduct) {
      return NextResponse.json({ error: "This product is currently out of stock" }, { status: 400 });
    }

    if (!customer?.name || !customer?.phone || !customer?.address || !customer?.pincode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const cashfreeEnv = process.env.CASHFREE_ENV || "sandbox";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    if (!appId || !secretKey) {
      return NextResponse.json(
        { error: "Cashfree credentials not configured" },
        { status: 500 }
      );
    }

    const orderRef = await generateOrderRef();
    const gstAmt = Math.round(amount * GST_RATE);

    const apiBase =
      cashfreeEnv === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const pincodeInfo = await getPincodeDetails(customer.pincode).catch(() => null);

    const cfRes = await fetch(`${apiBase}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify({
        order_id: orderRef,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customer.phone,
          customer_phone: customer.phone,
          customer_name: customer.name,
          ...(customer.email ? { customer_email: customer.email } : {}),
        },
        order_meta: {
          return_url: `${baseUrl}/success?order_id=${orderRef}&token=${orderToken(orderRef)}&product=${encodeURIComponent(productName)}&variant=${encodeURIComponent(variantLabel)}&qty=${quantity}&amount=${amount}`,
          notify_url: `${baseUrl}/api/cashfree-webhook`,
        },
        order_note: `${productName} | ${customer.address}, ${customer.pincode}`,
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

    try {
      await ensureOrdersColumns();
      await db.insert(orders).values({
        orderRef,
        cashfreeOrderId: cfData.cf_order_id || orderRef,
        productId,
        productName,
        variantLabel,
        weightCategory: weights.weightCategory,
        unitWeightGrams: weights.unitWeightGrams,
        totalWeightGrams: weights.totalWeightGrams,
        quantity,
        amount,
        gstAmount: gstAmt,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || null,
        customerAddress: customer.address + (pincodeInfo ? `, ${pincodeInfo.city}` : ""),
        customerPincode: customer.pincode,
        batchId,
        status: "PENDING",
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        return NextResponse.json(
          { error: "Something went wrong. Please try again in a moment." },
          { status: 500 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      orderRef,
      paymentSessionId: cfData.payment_session_id,
      _debug: { cashfreeEnv, apiBase, cfOrderId: cfData.cf_order_id, appIdPrefix: appId.slice(0, 8) },
    });
  } catch (err) {
    console.error("create-order:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
