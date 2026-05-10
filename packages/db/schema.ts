import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderRef: text("order_ref").unique().notNull(),
  cashfreeOrderId: text("cashfree_order_id"),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  variantLabel: text("variant_label").notNull(),
  quantity: integer("quantity").notNull(),
  amount: integer("amount").notNull(),
  gstAmount: integer("gst_amount").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address").notNull(),
  customerPincode: text("customer_pincode").notNull(),
  status: text("status").notNull().default("PENDING"),
  batchId: text("batch_id"),
  delhiveryWaybill: text("delhivery_waybill"),
  delhiveryPickupDate: text("delhivery_pickup_date"),
  invoiceKey: text("invoice_key"),
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const documentTypeEnum = pgEnum("document_type", ["INVOICE", "GST_SUMMARY", "LABEL", "PACKING_SLIP"]);
export const documentSourceEnum = pgEnum("document_source", ["ADMIN", "STORE"]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  type: documentTypeEnum("type").notNull(),
  source: documentSourceEnum("source").notNull(),
  key: text("key").notNull(),
  orderRef: text("order_ref"),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;