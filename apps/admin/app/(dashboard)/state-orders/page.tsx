"use client";

import { useEffect, useState } from "react";

type StateRow = {
  state: string;
  orders: number;
  revenue: number;
  weightGrams: number;
};

type OrderDetail = {
  customerName: string;
  productName: string;
  quantity: number;
  source: "online" | "manual";
};

const today = new Date().toISOString().slice(0, 10);
const defaultStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString().slice(0, 10);

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatWeight(grams: number) {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

export default function StateOrdersPage() {
  const [rows, setRows] = useState<StateRow[]>([]);
  const [revalidateKey, setRevalidateKey] = useState(0);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [applied, setApplied] = useState({ start: defaultStart, end: today });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateDetails, setStateDetails] = useState<OrderDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams({ startDate: applied.start, endDate: applied.end });
    fetch(`/api/state-orders?${p}`, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: StateRow[]) => setRows(data))
      .catch(() => { setError("Failed to load"); setRows([]); })
      .finally(() => setLoading(false));
  }, [applied, revalidateKey]);

  const handleStateClick = (state: string) => {
    setSelectedState(state);
    setDetailsLoading(true);
    const p = new URLSearchParams({ startDate: applied.start, endDate: applied.end });
    fetch(`/api/state-orders/${encodeURIComponent(state)}?${p}`, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: OrderDetail[]) => setStateDetails(data))
      .catch(() => setStateDetails([]))
      .finally(() => setDetailsLoading(false));
  };

  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalWeight = rows.reduce((s, r) => s + r.weightGrams, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Orders by State</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {applied.start} → {applied.end}
              {!loading && rows.length > 0 && (
                <> &nbsp;·&nbsp; {totalOrders} orders across {rows.length} states &nbsp;·&nbsp; {fmt(totalRevenue)} total</>
              )}
            </p>
          </div>
          <button
            onClick={() => setRevalidateKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shrink-0"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Resync
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setApplied({ start: startDate, end: endDate })}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">State</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Orders</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total weight</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-red-400">{error}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No orders found for this date range.</td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.state} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td 
                      className="px-4 py-3 font-medium text-blue-600 cursor-pointer hover:underline"
                      onClick={() => handleStateClick(row.state)}
                    >
                      {row.state}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.orders}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatWeight(row.weightGrams)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-700">{fmt(row.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{totalOrders}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{formatWeight(totalWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-700">{fmt(totalRevenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {selectedState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Orders in {selectedState}</h2>
              <button
                onClick={() => setSelectedState(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-auto flex-1">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400">Loading details…</div>
                </div>
              ) : stateDetails.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400">No orders found</div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stateDetails.map((detail, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{detail.customerName}</td>
                        <td className="px-4 py-3 text-gray-700">{detail.productName}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{detail.quantity}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`px-2 py-1 rounded-full font-semibold ${detail.source === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {detail.source === 'online' ? 'Online' : 'Manual'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
