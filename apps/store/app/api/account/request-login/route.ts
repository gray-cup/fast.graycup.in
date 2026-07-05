import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, orders } from "@/lib/db/schema";
import { generateMagicLinkToken } from "@/lib/authToken";
import { sendMagicLinkEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const normalized = email.trim().toLowerCase();

    // Always return a generic response to avoid leaking whether an email has an account.
    const [subRow] = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.customerEmail, normalized)).limit(1);
    const [orderRow] = subRow ? [null] : await db.select({ id: orders.id }).from(orders).where(eq(orders.customerEmail, normalized)).limit(1);

    if (subRow || orderRow) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const token = generateMagicLinkToken(normalized);
      const magicLink = `${baseUrl}/api/account/verify?token=${encodeURIComponent(token)}`;
      try {
        await sendMagicLinkEmail(normalized, magicLink);
      } catch (err) {
        console.error("magic link email error:", err);
      }
    }

    return NextResponse.json({ ok: true, message: "If an account exists for this email, a sign-in link has been sent." });
  } catch (err) {
    console.error("request-login:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
