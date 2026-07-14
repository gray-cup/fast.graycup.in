import { eq } from "drizzle-orm";
import { ensureCouponsTable } from "@graycup/db";
import { db } from "@/lib/db";
import { coupons, type Coupon } from "@/lib/db/schema";

export interface CouponValidation {
  valid: boolean;
  error?: string;
  discountAmount: number;
  coupon?: Coupon;
}

/**
 * Server is the sole authority on coupon validity and discount amount.
 * Callers pass only a code + the server-computed subtotal; the discount
 * returned here is what must be trusted — never accept a discount value
 * from the client.
 */
export async function validateCoupon(rawCode: string | undefined | null, subtotal: number): Promise<CouponValidation> {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, error: "No coupon code provided", discountAmount: 0 };
  }
  const code = rawCode.trim().toUpperCase();

  await ensureCouponsTable();

  const rows = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!rows.length) {
    return { valid: false, error: "Invalid coupon code", discountAmount: 0 };
  }
  const c = rows[0];

  if (!c.active) {
    return { valid: false, error: "This coupon is no longer active", discountAmount: 0 };
  }
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) {
    return { valid: false, error: "This coupon has expired", discountAmount: 0 };
  }
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) {
    return { valid: false, error: "This coupon has reached its usage limit", discountAmount: 0 };
  }
  if (c.minOrderAmount !== null && subtotal < c.minOrderAmount) {
    return { valid: false, error: `Minimum order amount for this coupon is ₹${c.minOrderAmount}`, discountAmount: 0 };
  }

  let discountAmount = 0;
  if (c.discountType === "FIXED" && c.discountAmount != null) {
    discountAmount = c.discountAmount;
  } else if (c.discountPercent != null) {
    discountAmount = Math.round((subtotal * c.discountPercent) / 100);
  }
  if (c.maxDiscountAmount !== null) {
    discountAmount = Math.min(discountAmount, c.maxDiscountAmount);
  }
  discountAmount = Math.min(discountAmount, subtotal);

  return { valid: true, discountAmount, coupon: c };
}

export async function incrementCouponUsage(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  await ensureCouponsTable();
  const rows = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  if (!rows.length) return;
  await db
    .update(coupons)
    .set({ usedCount: rows[0].usedCount + 1 })
    .where(eq(coupons.code, normalized));
}
