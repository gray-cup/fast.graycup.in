ALTER TABLE "orders" ALTER COLUMN "gst_amount" TYPE real USING "gst_amount"::real;
--> statement-breakpoint
ALTER TABLE "manual_invoices" ALTER COLUMN "gst_amount" TYPE real USING "gst_amount"::real;
--> statement-breakpoint
-- Backfill existing orders with correct GST-inclusive calculation (amount * 5/105, rounded to 2dp)
UPDATE "orders" SET "gst_amount" = ROUND(("amount" * 5.0 / 105.0)::numeric, 2)::real WHERE "gst_amount" IS NOT NULL;
