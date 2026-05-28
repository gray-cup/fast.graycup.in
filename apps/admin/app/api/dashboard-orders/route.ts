import { NextResponse } from "next/server";
import { db, schema, sql, ensureOrdersColumns, ensureManualInvoicesTable } from "@graycup/db";
import { desc, getTableColumns } from "drizzle-orm";

export async function GET() {
  try {
    await Promise.all([ensureOrdersColumns(), ensureManualInvoicesTable()]);

    const [websiteRows, manualRows] = await Promise.all([
      db
        .select({ ...getTableColumns(schema.orders) })
        .from(schema.orders)
        .orderBy(desc(schema.orders.createdAt)),
      db.execute(sql`
        SELECT id, invoice_number, buyer_name, buyer_phone, buyer_email,
               buyer_address, buyer_pincode, item_description, item_variant,
               quantity, amount, gst_amount, invoice_date, created_at
        FROM manual_invoices
        ORDER BY created_at DESC
      `).catch(() => ({ rows: [] })),
    ]);

    type CombinedOrder = {
      id: number;
      orderNumber: number;
      orderRef: string;
      status: string;
      amount: number;
      variantLabel: string;
      quantity: number;
      weightCategory: string;
      unitWeightGrams: number;
      totalWeightGrams: number;
      customerName: string;
      createdAt: string;
      source: "website" | "manual";
    };

    const website: CombinedOrder[] = websiteRows.map((o) => ({
      id: o.id,
      orderNumber: 0,
      orderRef: o.orderRef,
      status: o.status,
      amount: o.amount,
      variantLabel: o.variantLabel,
      quantity: o.quantity,
      weightCategory: o.weightCategory ?? "150gm",
      unitWeightGrams: o.unitWeightGrams ?? 150,
      totalWeightGrams: o.totalWeightGrams ?? 150,
      customerName: o.customerName ?? "",
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
      source: "website",
    }));

    const manual: CombinedOrder[] = (manualRows.rows as any[]).map((r) => ({
      id: -(r.id as number),
      orderNumber: 0,
      orderRef: r.invoice_number as string,
      status: "PAID",
      amount: r.amount as number,
      variantLabel: (r.item_variant as string) || (r.item_description as string) || "Manual",
      quantity: r.quantity as number,
      weightCategory: "manual",
      unitWeightGrams: 0,
      totalWeightGrams: 0,
      customerName: (r.buyer_name as string) ?? "",
      createdAt: r.created_at instanceof Date
        ? (r.created_at as Date).toISOString()
        : String(r.created_at),
      source: "manual",
    }));

    const combined = [...website, ...manual].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    combined.forEach((o, i) => { o.orderNumber = combined.length - i; });

    return NextResponse.json(combined);
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}
