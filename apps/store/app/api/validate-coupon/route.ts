import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
import { validateCoupon } from "@/lib/coupons";

interface OrderLine {
  productId: string;
  variantLabel: string;
  quantity: number;
}

interface ValidateCouponPayload {
  code: string;
  items?: OrderLine[];
  productId?: string;
  variantLabel?: string;
  quantity?: number;
}

function computeSubtotal(payload: ValidateCouponPayload): number | null {
  if (payload.items && payload.items.length > 0) {
    let subtotal = 0;
    for (const item of payload.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const variant = product.variants.find((v) => v.label === item.variantLabel);
      if (!variant) return null;
      subtotal += variant.price * item.quantity;
    }
    return subtotal;
  }
  if (payload.productId && payload.variantLabel && payload.quantity) {
    const product = products.find((p) => p.id === payload.productId);
    if (!product) return null;
    const variant = product.variants.find((v) => v.label === payload.variantLabel);
    if (!variant) return null;
    return variant.price * payload.quantity;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidateCouponPayload = await req.json();
    const subtotal = computeSubtotal(body);
    if (subtotal === null) {
      return NextResponse.json({ error: "Invalid product or variant" }, { status: 400 });
    }

    const result = await validateCoupon(body.code, subtotal);
    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: result.coupon!.code,
      discountAmount: result.discountAmount,
    });
  } catch (err) {
    console.error("validate-coupon:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
