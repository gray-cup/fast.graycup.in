import { pgTable, serial, text, integer, timestamp, pgEnum, real } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderRef: text("order_ref").unique().notNull(),
  cashfreeOrderId: text("cashfree_order_id"),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  variantLabel: text("variant_label").notNull(),
  weightCategory: text("weight_category").notNull().default("150gm"),
  unitWeightGrams: integer("unit_weight_grams").notNull().default(150),
  totalWeightGrams: integer("total_weight_grams").notNull().default(150),
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
  shadowfaxRequestId: text("shadowfax_request_id"),
  carrier: text("carrier").default("delhivery"),
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

export const manualInvoices = pgTable("manual_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  buyerEmail: text("buyer_email"),
  buyerAddress: text("buyer_address").notNull(),
  buyerPincode: text("buyer_pincode").notNull(),
  itemDescription: text("item_description").notNull(),
  itemVariant: text("item_variant"),
  quantity: integer("quantity").notNull().default(1),
  amount: integer("amount").notNull(),
  gstAmount: integer("gst_amount").notNull().default(0),
  upiTransactionId: text("upi_transaction_id").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ManualInvoice = typeof manualInvoices.$inferSelect;
export type NewManualInvoice = typeof manualInvoices.$inferInsert;

export const pincodes = pgTable("pincodes", {
  pincode: text("pincode").primaryKey(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  city: text("city"),
  state: text("state"),
  district: text("district"),
});

export type Pincode = typeof pincodes.$inferSelect;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;