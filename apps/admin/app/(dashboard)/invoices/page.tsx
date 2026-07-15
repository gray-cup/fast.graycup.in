"use client";

import { useState, useEffect } from "react";

type Order = {
  id: number;
  orderRef: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  amount: number;
  gstAmount: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerPincode: string;
  status: string;
  invoiceNumber: string | null;
  invoiceKey: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-800",
  PAID_DISPATCH_PENDING: "bg-orange-100 text-orange-800",
  DISPATCHED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

export default function InvoicesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  async function processInvoices() {
    if (selected.size === 0) return;
    setProcessing(true);
    const selectedOrders = orders.filter((o) => selected.has(o.id));
    const orderRefs = selectedOrders.map((o) => o.orderRef);
    try {
      const res = await fetch("/api/orders/process-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRefs }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Processed ${data.processed} invoice(s) to Documents.`);
        // Refresh orders to show updated invoiceKey
        fetch("/api/orders").then((r) => r.json()).then(setOrders).catch(() => {});
      } else {
        alert(data.error || "Failed to process invoices");
      }
    } catch {
      alert("Request failed");
    } finally {
      setProcessing(false);
    }
  }

  async function generatePdf(type: "invoice" | "gst") {
    if (selected.size === 0) return;
    setGenerating(true);
    const selectedOrders = orders.filter((o) => selected.has(o.id));
    const orderRefs = selectedOrders.map((o) => o.orderRef);
    try {
      const res = await fetch(`/api/invoices?type=${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRefs }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "gst" ? `GST-Summary-${Date.now()}.pdf` : `Invoices-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Invoices</h1>
        {selected.size > 0 && (
          <div className="flex gap-3">
            <button
              onClick={processInvoices}
              disabled={processing || generating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {processing ? "Processing..." : `Process to Docs (${selected.size})`}
            </button>
            <button
              onClick={() => generatePdf("invoice")}
              disabled={generating || processing}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {generating ? "Generating..." : `Generate Invoice PDF (${selected.size})`}
            </button>
            <button
              onClick={() => generatePdf("gst")}
              disabled={generating || processing}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {generating ? "Generating..." : `Generate GST Summary (${selected.size})`}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === orders.length && orders.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600">Invoice No</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Order Ref</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-gray-600">GST</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">PDF</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(o.id) ? "bg-amber-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-500">
                    {o.invoiceNumber || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{o.orderRef}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customerName}</div>
                    <div className="text-xs text-gray-400">{o.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{o.productName}</div>
                    <div className="text-xs text-gray-400">{o.variantLabel} ×{o.quantity}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">₹{o.amount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">₹{(Math.round(o.amount * 5 / 105 * 100) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/invoice/${o.orderRef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                      >
                        View
                      </a>
                      <a
                        href={`/api/invoice/${o.orderRef}`}
                        download={`Invoice-${o.orderRef}.pdf`}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                      >
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}