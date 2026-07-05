import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET || process.env.CASHFREE_SECRET_KEY || "fallback-secret";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function issue(email: string, ttlMs: number): string {
  const expires = Date.now() + ttlMs;
  const payload = `${email}:${expires}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verify(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [email, expiresStr, sig] = parts;
    const expected = sign(`${email}:${expiresStr}`);
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
    if (Date.now() > Number(expiresStr)) return null;
    return email;
  } catch {
    return null;
  }
}

/** Short-lived token emailed as a magic sign-in link. */
export function generateMagicLinkToken(email: string): string {
  return issue(email, 15 * 60 * 1000);
}

export function verifyMagicLinkToken(token: string): string | null {
  return verify(token);
}

/** Long-lived token stored in the session cookie. */
export function generateSessionToken(email: string): string {
  return issue(email, 30 * 24 * 60 * 60 * 1000);
}

export function verifySessionToken(token: string): string | null {
  return verify(token);
}

export const SESSION_COOKIE = "gc_session";
