import { NextRequest, NextResponse } from "next/server";
import { db, schema, sql } from "@graycup/db";
import type { PgTable } from "drizzle-orm/pg-core";

// Reference data (e.g. pincodes) is excluded — it's regenerated via `npm run seed:pincodes`
// and would otherwise bloat every backup with ~150k static rows.
const TABLES: Record<string, PgTable> = {
  orders: schema.orders,
  coupons: schema.coupons,
  documents: schema.documents,
  manualInvoices: schema.manualInvoices,
  reviews: schema.reviews,
  subscriptions: schema.subscriptions,
  subscriptionPayments: schema.subscriptionPayments,
};

export async function GET() {
  try {
    const tables: Record<string, unknown[]> = {};
    for (const [name, table] of Object.entries(TABLES)) {
      tables[name] = await db.select().from(table as never);
    }

    const backup = {
      version: 1,
      source: "graycup-admin",
      createdAt: new Date().toISOString(),
      tables,
    };

    const filename = `graycup-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}

const CHUNK_SIZE = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tables = body?.tables;
    if (!tables || typeof tables !== "object") {
      return NextResponse.json({ error: "Invalid backup file: missing 'tables'" }, { status: 400 });
    }

    const entries = Object.entries(TABLES).filter(([name]) => Array.isArray(tables[name]));
    if (entries.length === 0) {
      return NextResponse.json({ error: "Backup file contains no recognizable tables" }, { status: 400 });
    }

    const queries: unknown[] = [];
    for (const [name, table] of entries) {
      const rows = tables[name] as Record<string, unknown>[];
      queries.push(db.delete(table));
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        if (chunk.length > 0) queries.push(db.insert(table).values(chunk));
      }
    }

    // Atomic: neon-http's db.batch() runs all statements in a single server-side transaction.
    await db.batch(queries as unknown as Parameters<typeof db.batch>[0]);

    // Restored rows carry their original serial ids, so bump each sequence past the max
    // restored id or the next insert from the app would collide.
    for (const [name] of entries) {
      const tableName =
        name === "manualInvoices" ? "manual_invoices" : name === "subscriptionPayments" ? "subscription_payments" : name;
      await db.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 1))`
        )
      );
    }

    const restored = Object.fromEntries(entries.map(([name]) => [name, (tables[name] as unknown[]).length]));
    return NextResponse.json({ success: true, restored });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}
