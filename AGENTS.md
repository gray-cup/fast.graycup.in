# Storefront ↔ Admin data parity

`apps/store` is the customer-facing site; `apps/admin` is where staff fulfill orders. Staff never see the storefront — the admin panel is their only view into what a customer picked. Treat any gap here as a shipping-error bug, not a cosmetic one.

**Rule: every buyer-selectable field on a product page must reach the admin order view.**

This applies to product options defined in `apps/store/lib/products.ts` (grind size, pack size/variant, quantity, and any future option like roast level, weight, or add-ons) and to both checkout paths — "Buy Now" (`CheckoutModal.tsx`) and cart checkout (`CartCheckoutModal.tsx` via `lib/cart.tsx`). If either path can produce an order missing a selection the buyer made, that's a bug.

When adding a new selectable field to a product or the product page:
1. Add it to the relevant type in `apps/store/lib/cart.tsx` (`CartItem`) so "Add to Cart" carries it, not just "Buy Now".
2. Thread it through both `CheckoutModal.tsx` and `CartCheckoutModal.tsx` into the payload sent to `/api/create-order`.
3. Make sure it lands somewhere visible in `apps/admin/app/(dashboard)/orders/page.tsx` (table row and/or the order detail modal) — either its own `orders` column (requires a Drizzle migration in `drizzle/`) or embedded into an existing text field like `productName`, matching the existing "(Grind: X)" convention. Don't add a field to checkout and leave admin to guess from `variantLabel` or `productName` alone unless you've verified it actually appears there.
4. If it needs a dedicated DB column rather than being embedded in existing text, write the migration — don't skip it and hope the text-embedding trick covers it.

Before shipping any change to product options or checkout, place a test order for each affected path and confirm every selection is visible in the admin orders list/detail view. Don't declare it done until it's actually visible in the admin UI, not just present in the request payload or database row.
