import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql, eq, desc, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export { sql, eq, desc, inArray, schema };
export { manualInvoices } from "./schema";

/** Ensure orders table columns exist (batch, pickup date, weight). Safe on every admin/store request. */
let ensureOrdersColumnsPromise: Promise<void> | null = null;
export function ensureOrdersColumns(): Promise<void> {
  if (!ensureOrdersColumnsPromise) {
    ensureOrdersColumnsPromise = (async () => {
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id TEXT`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delhivery_pickup_date TEXT`);
      await db.execute(
        sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_category TEXT NOT NULL DEFAULT '150gm'`
      );
      await db.execute(
        sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit_weight_grams INTEGER NOT NULL DEFAULT 150`
      );
      await db.execute(
        sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight_grams INTEGER NOT NULL DEFAULT 150`
      );
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shadowfax_request_id TEXT`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT NOT NULL DEFAULT 'delhivery'`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`);
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0`);
    })();
  }
  return ensureOrdersColumnsPromise;
}

let ensureCouponsTablePromise: Promise<void> | null = null;
export function ensureCouponsTable(): Promise<void> {
  if (!ensureCouponsTablePromise) {
    ensureCouponsTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS coupons (
          id                  SERIAL PRIMARY KEY,
          code                TEXT UNIQUE NOT NULL,
          discount_percent    REAL NOT NULL,
          max_discount_amount INTEGER,
          min_order_amount    INTEGER,
          usage_limit         INTEGER,
          used_count          INTEGER NOT NULL DEFAULT 0,
          active              BOOLEAN NOT NULL DEFAULT true,
          expires_at          TIMESTAMP,
          created_at          TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }
  return ensureCouponsTablePromise;
}

let ensureManualInvoicesPromise: Promise<void> | null = null;
export function ensureManualInvoicesTable(): Promise<void> {
  if (!ensureManualInvoicesPromise) {
    ensureManualInvoicesPromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS manual_invoices (
          id SERIAL PRIMARY KEY,
          invoice_number TEXT UNIQUE NOT NULL,
          buyer_name TEXT NOT NULL,
          buyer_phone TEXT NOT NULL,
          buyer_email TEXT,
          buyer_address TEXT NOT NULL,
          buyer_pincode TEXT NOT NULL,
          item_description TEXT NOT NULL,
          item_variant TEXT,
          quantity INTEGER NOT NULL DEFAULT 1,
          amount INTEGER NOT NULL,
          gst_amount INTEGER NOT NULL DEFAULT 0,
          upi_transaction_id TEXT NOT NULL,
          invoice_date TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }
  return ensureManualInvoicesPromise;
}

export async function generateOrderRef(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `GCF-${timestamp}${randomPart}`;
}

export async function generateInvoiceRef(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `GCFINV-${timestamp}${randomPart}`;
}

export async function generateSubscriptionRef(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `GCS-${timestamp}${randomPart}`;
}

let ensureReviewsTablePromise: Promise<void> | null = null;
export function ensureReviewsTable(): Promise<void> {
  if (!ensureReviewsTablePromise) {
    ensureReviewsTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS reviews (
          id          SERIAL PRIMARY KEY,
          product_id  TEXT NOT NULL,
          author_name TEXT NOT NULL,
          body        TEXT NOT NULL,
          created_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }
  return ensureReviewsTablePromise;
}

let ensureSubscriptionsTablePromise: Promise<void> | null = null;
export function ensureSubscriptionsTable(): Promise<void> {
  if (!ensureSubscriptionsTablePromise) {
    ensureSubscriptionsTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id                SERIAL PRIMARY KEY,
          subscription_ref  TEXT UNIQUE NOT NULL,
          cf_subscription_id TEXT,
          product_id        TEXT NOT NULL,
          product_name      TEXT NOT NULL,
          variant_label     TEXT NOT NULL,
          quantity          INTEGER NOT NULL DEFAULT 1,
          amount            INTEGER NOT NULL,
          gst_amount        REAL NOT NULL,
          customer_name     TEXT NOT NULL,
          customer_phone    TEXT NOT NULL,
          customer_email    TEXT,
          customer_address  TEXT NOT NULL,
          customer_pincode  TEXT NOT NULL,
          status            TEXT NOT NULL DEFAULT 'INITIALIZED',
          next_charge_date  TEXT,
          created_at        TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }
  return ensureSubscriptionsTablePromise;
}

let ensureSubscriptionPaymentsTablePromise: Promise<void> | null = null;
export function ensureSubscriptionPaymentsTable(): Promise<void> {
  if (!ensureSubscriptionPaymentsTablePromise) {
    ensureSubscriptionPaymentsTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS subscription_payments (
          id               SERIAL PRIMARY KEY,
          subscription_ref TEXT NOT NULL,
          cf_payment_id    TEXT,
          amount           INTEGER NOT NULL,
          status           TEXT NOT NULL,
          created_at       TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    })();
  }
  return ensureSubscriptionPaymentsTablePromise;
}