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
    })();
  }
  return ensureOrdersColumnsPromise;
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