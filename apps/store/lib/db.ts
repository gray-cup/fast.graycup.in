import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as schema from "./db/schema";

export { sql } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.local.example to .env.local and add your Neon connection string."
      );
    }
    _db = drizzle(url, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export async function setupSchema() {
  const conn = getDb();
  await conn.execute(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id                SERIAL PRIMARY KEY,
      order_ref         TEXT UNIQUE NOT NULL,
      cashfree_order_id TEXT,
      product_id        TEXT NOT NULL,
      product_name      TEXT NOT NULL,
      variant_label     TEXT NOT NULL,
      quantity          INTEGER NOT NULL,
      amount            INTEGER NOT NULL,
      gst_amount        INTEGER NOT NULL,
      customer_name     TEXT NOT NULL,
      customer_phone    TEXT NOT NULL,
      customer_email    TEXT,
      customer_address  TEXT NOT NULL,
      customer_pincode  TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING',
      delhivery_waybill TEXT,
      invoice_key       TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function generateOrderRef(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `GCF-${timestamp}${randomPart}`;
}

export async function generateSubscriptionRef(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `GCS-${timestamp}${randomPart}`;
}