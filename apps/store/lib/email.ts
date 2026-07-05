import { Resend } from "resend";
import type { Order, Subscription } from "@/lib/db/schema";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Gray Cup <orders@fast.graycup.in>";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://fast.graycup.in";
const LOGO_URL = `${BASE_URL}/graycup.svg`;

function emailShell(bodyHtml: string): string {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:#1c1917;padding:28px 32px;">
                <img src="${LOGO_URL}" alt="Gray Cup" height="28" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                  Gray Cup Enterprises &middot; GSTIN: 06AAMCG4985H1Z4<br/>
                  Questions? Write to <a href="mailto:arjun@graycup.in" style="color:#d97706;text-decoration:none;">arjun@graycup.in</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  if (!resend || !order.customerEmail) return;

  const orderDate = order.createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Order confirmed!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${order.customerName}, thanks for your order. Here's a summary of what you bought.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Order ID</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:900;color:#111827;padding-bottom:16px;">${order.orderRef}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Item</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#111827;padding-bottom:16px;line-height:1.5;">${order.productName} &mdash; ${order.variantLabel} &times; ${order.quantity}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Order Date</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#111827;">${orderDate}</td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-size:14px;color:#6b7280;padding:8px 0;border-bottom:1px solid #f3f4f6;">Subtotal (incl. GST)</td>
        <td align="right" style="font-size:14px;color:#111827;padding:8px 0;border-bottom:1px solid #f3f4f6;">₹${order.amount}</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:900;color:#111827;padding:12px 0 0;">Total Paid</td>
        <td align="right" style="font-size:16px;font-weight:900;color:#111827;padding:12px 0 0;">₹${order.amount}</td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Shipping to: ${order.customerAddress}, ${order.customerPincode}
    </p>

    <div style="background:#fffbeb;border-radius:16px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        We'll send you another email with your tracking code as soon as your order is dispatched.
      </p>
    </div>
  `;

  await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: [order.customerEmail],
      subject: `Order Confirmed — ${order.orderRef}`,
      html: emailShell(body),
    },
    { idempotencyKey: `order-confirmation/${order.orderRef}` }
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export async function sendSubscriptionConfirmationEmail(sub: Subscription): Promise<void> {
  if (!resend || !sub.customerEmail) return;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Subscription activated!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${sub.customerName}, your monthly subscription is now active. You'll be charged automatically every month.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Subscription ID</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:900;color:#111827;padding-bottom:16px;">${sub.subscriptionRef}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Item</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#111827;padding-bottom:16px;line-height:1.5;">${sub.productName} &mdash; ${sub.variantLabel} &times; ${sub.quantity}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Monthly Amount</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:900;color:#111827;padding-bottom:16px;">₹${sub.amount} / month</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Next Charge Date</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#111827;">${formatDate(sub.nextChargeDate)}</td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
      Shipping to: ${sub.customerAddress}, ${sub.customerPincode}
    </p>

    <div style="background:#fffbeb;border-radius:16px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        Want to cancel or change your subscription? Write to <a href="mailto:arjun@graycup.in" style="color:#92400e;">arjun@graycup.in</a> any time.
      </p>
    </div>
  `;

  await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: [sub.customerEmail],
      subject: `Subscription Activated — ${sub.subscriptionRef}`,
      html: emailShell(body),
    },
    { idempotencyKey: `subscription-activated/${sub.subscriptionRef}` }
  );
}

export async function sendSubscriptionChargeEmail(
  sub: Subscription,
  paymentAmount: number,
  cfPaymentId: string | null
): Promise<void> {
  if (!resend || !sub.customerEmail) return;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Payment received</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${sub.customerName}, your monthly payment for ${sub.productName} was processed successfully.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Subscription ID</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:900;color:#111827;padding-bottom:16px;">${sub.subscriptionRef}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Amount Charged</td>
      </tr>
      <tr>
        <td style="font-size:16px;font-weight:900;color:#111827;padding-bottom:16px;">₹${paymentAmount}</td>
      </tr>
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Next Charge Date</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#111827;">${formatDate(sub.nextChargeDate)}</td>
      </tr>
      ${cfPaymentId ? `
      <tr>
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-top:16px;padding-bottom:6px;">Payment Ref</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#111827;font-family:monospace;">${cfPaymentId}</td>
      </tr>` : ""}
    </table>

    <div style="background:#fffbeb;border-radius:16px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        Want to cancel or change your subscription? Write to <a href="mailto:arjun@graycup.in" style="color:#92400e;">arjun@graycup.in</a> any time.
      </p>
    </div>
  `;

  await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: [sub.customerEmail],
      subject: `Payment Received — ${sub.subscriptionRef}`,
      html: emailShell(body),
    },
    { idempotencyKey: `subscription-charge/${sub.subscriptionRef}/${cfPaymentId ?? sub.nextChargeDate ?? Date.now()}` }
  );
}

export async function sendSubscriptionPaymentFailedEmail(sub: Subscription): Promise<void> {
  if (!resend || !sub.customerEmail) return;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Payment failed</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${sub.customerName}, we couldn't process this month's payment of ₹${sub.amount} for your ${sub.productName} subscription.
      Please make sure your payment method has sufficient balance — we'll retry automatically.
    </p>

    <div style="background:#fef2f2;border-radius:16px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
        Subscription ID: ${sub.subscriptionRef}<br/>
        Need help? Write to <a href="mailto:arjun@graycup.in" style="color:#991b1b;">arjun@graycup.in</a>.
      </p>
    </div>
  `;

  await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: [sub.customerEmail],
      subject: `Payment Failed — ${sub.subscriptionRef}`,
      html: emailShell(body),
    },
    { idempotencyKey: `subscription-payment-failed/${sub.subscriptionRef}/${Date.now()}` }
  );
}
