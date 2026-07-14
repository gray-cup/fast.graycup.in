declare module "@cashfreepayments/cashfree-js" {
  interface LoadOptions {
    mode: "sandbox" | "production";
  }

  interface CheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal" | "_top";
  }

  interface SubscriptionsCheckoutOptions {
    subsSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal" | "_top";
  }

  interface CashfreeInstance {
    checkout(options: CheckoutOptions): Promise<void>;
    subscriptionsCheckout(options: SubscriptionsCheckoutOptions): Promise<void>;
  }

  export function load(options: LoadOptions): Promise<CashfreeInstance>;
}
