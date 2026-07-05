import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken, generateSessionToken, SESSION_COOKIE } from "@/lib/authToken";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/account/login?error=missing_token`);
  }

  const email = verifyMagicLinkToken(token);
  if (!email) {
    return NextResponse.redirect(`${baseUrl}/account/login?error=invalid_token`);
  }

  const sessionToken = generateSessionToken(email);
  const res = NextResponse.redirect(`${baseUrl}/account`);
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
