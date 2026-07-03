import { Resend } from "resend";
import type { schema } from "@graycup/db";

type Order = typeof schema.orders.$inferSelect;

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

export async function sendTrackingEmail(
  order: Order,
  trackingCode: string,
  carrierLabel: "Delhivery" | "Shadowfax"
): Promise<void> {
  if (!resend || !order.customerEmail) return;

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111827;">Your order is on its way!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${order.customerName}, your order has been dispatched via ${carrierLabel}.
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
        <td style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:6px;">Tracking Code (${carrierLabel})</td>
      </tr>
      <tr>
        <td style="font-size:18px;font-weight:900;color:#d97706;">${trackingCode}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
      Shipping to: ${order.customerAddress}, ${order.customerPincode}
    </p>
  `;

  await resend.emails.send(
    {
      from: FROM_EMAIL,
      to: [order.customerEmail],
      subject: `Order Dispatched — Tracking Code ${trackingCode}`,
      html: emailShell(body),
    },
    { idempotencyKey: `tracking/${order.orderRef}/${trackingCode}` }
  );
}
