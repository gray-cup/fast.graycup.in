-- Reference / manual run (Neon SQL Editor, psql, etc.)
-- Safe to run multiple times where noted with IF NOT EXISTS.
--
-- After `ensureOrdersColumns()` alone, new columns exist but legacy rows may still
-- have default 150 g totals; run the UPDATE block below to backfill from variant_label.
--
-- If `npm run db:migrate` fails on "type document_source already exists", baseline 0000:
--   INSERT INTO drizzle.__drizzle_migrations ("hash", created_at)
--   SELECT 'f4698b83ba523eb62e040373ecf0506b682e6b315a08e5666fb356916b3cd1dc', 1777586406629
--   WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE "hash" = 'f4698b83ba523eb62e040373ecf0506b682e6b315a08e5666fb356916b3cd1dc');
-- (The migrate script does this automatically.)

-- ─── From 0001_order_shipping_extras ─────────────────────────────────────────
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "batch_id" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delhivery_pickup_date" text;

-- ─── From 0002_order_weight ────────────────────────────────────────────────
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "weight_category" text NOT NULL DEFAULT '150gm';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "unit_weight_grams" integer NOT NULL DEFAULT 150;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "total_weight_grams" integer NOT NULL DEFAULT 150;

-- Backfill weight from variant labels (legacy rows). Mixed / multi-line carts are approximated.
UPDATE "orders" SET
  "weight_category" = CASE
    WHEN "variant_label" ILIKE '%500gm%' AND "variant_label" NOT ILIKE '%150gm%' THEN '500gm'
    WHEN "variant_label" ILIKE '%,%' OR "variant_label" ILIKE '%+%' OR ("variant_label" LIKE '% %' AND "variant_label" NOT ILIKE '%500gm%') THEN 'mixed'
    ELSE '150gm'
  END;

UPDATE "orders" SET
  "unit_weight_grams" = CASE
    WHEN "weight_category" = '500gm' THEN 500
    WHEN "weight_category" = 'mixed' THEN 150
    ELSE 150
  END;

UPDATE "orders" SET
  "total_weight_grams" = "quantity" * CASE
    WHEN "weight_category" = '500gm' THEN 500
    ELSE 150
  END;

-- ─── From 0004_gst_amount_real ─────────────────────────────────────────────
ALTER TABLE "orders" ALTER COLUMN "gst_amount" TYPE real USING "gst_amount"::real;
ALTER TABLE "manual_invoices" ALTER COLUMN "gst_amount" TYPE real USING "gst_amount"::real;
-- Backfill with correct GST-inclusive formula (amount × 5/105, 2dp)
UPDATE "orders" SET "gst_amount" = ROUND(("amount" * 5.0 / 105.0)::numeric, 2)::real WHERE "gst_amount" IS NOT NULL;
