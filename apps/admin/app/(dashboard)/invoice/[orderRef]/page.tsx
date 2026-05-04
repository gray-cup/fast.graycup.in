import { db, schema } from "@graycup/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DownloadButton from "./PrintButton";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderRef: string }>;
}) {
  const { orderRef } = await params;

  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.orderRef, orderRef))
    .limit(1);

  if (!rows.length) notFound();

  const o = rows[0];
  const subtotal = o.amount - o.gstAmount;
  const cgst = Math.round(o.gstAmount / 2);
  const sgst = o.gstAmount - cgst;
  const date = o.createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <a
          href="/orders"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to Orders
        </a>
        <DownloadButton orderRef={orderRef} />
      </div>

      {/* Invoice */}
      <div className="bg-white max-w-3xl mx-auto rounded-2xl border border-gray-200 print:border-0 print:rounded-none print:max-w-none print:mx-0 overflow-hidden">

        {/* Header band */}
        <div className="bg-stone-900 text-white px-8 py-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">Tax Invoice</p>
            <h1 className="text-2xl font-black tracking-tight">Gray Cup Enterprises</h1>
            <p className="text-stone-300 text-xs mt-1.5 leading-relaxed">
              FF122, Rodeo Drive Mall, GT Road, TDI City<br />
              Kundli, Sonipat, Haryana — 131030<br />
              GSTIN: 06AAMCG4985H1Z4 &nbsp;·&nbsp; office@graycup.org
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Invoice</p>
            <p className="text-white font-black text-lg font-mono">{o.invoiceNumber ?? "—"}</p>
            <p className="text-stone-400 text-xs mt-1">{date}</p>
            <p className="text-stone-500 text-xs mt-0.5 font-mono">{o.orderRef}</p>
          </div>
        </div>

        <div className="px-8 py-6 flex flex-col gap-6">

          {/* Bill To */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bill To</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-base font-black text-gray-900">{o.customerName}</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                {o.customerAddress}<br />
                Pincode: {o.customerPincode}
              </p>
              <p className="text-sm text-gray-500 mt-1">{o.customerPhone}</p>
              {o.customerEmail && <p className="text-sm text-gray-500">{o.customerEmail}</p>}
            </div>
          </section>

          {/* Items table */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Items</p>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-center px-4 py-3 font-semibold">Pack</th>
                  <th className="text-center px-4 py-3 font-semibold">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold">Rate</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {o.productName}
                    {o.batchId && <span className="ml-2 text-xs text-gray-400 font-normal">Batch {o.batchId}</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{o.variantLabel}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{o.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{subtotal}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{subtotal}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal (excl. GST)</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>CGST @ 2.5%</span>
                <span>₹{cgst}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>SGST @ 2.5%</span>
                <span>₹{sgst}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-black text-base text-gray-900">
                <span>Total</span>
                <span>₹{o.amount}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
            This is a computer-generated invoice and does not require a signature.
          </div>
        </div>
      </div>
    </>
  );
}
