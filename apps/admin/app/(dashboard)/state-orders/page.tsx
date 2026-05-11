"use client";

import { useEffect, useState } from "react";

type StateRow = {
  state: string;
  orders: number;
  revenue: number;
};

const today = new Date().toISOString().slice(0, 10);
const defaultStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString().slice(0, 10);

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function StateOrdersPage() {
  const [rows, setRows] = useState<StateRow[]>([]);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [applied, setApplied] = useState({ start: defaultStart, end: today });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const p = new URLSearchParams({ startDate: applied.start, endDate: applied.end });
    fetch(`/api/state-orders?${p}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: StateRow[]) => setRows(data))
      .catch(() => { setError("Failed to load"); setRows([]); })
      .finally(() => setLoading(false));
  }, [applied]);

  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-4 px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Orders by State</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {applied.start} → {applied.end}
            {!loading && rows.length > 0 && (
              <> &nbsp;·&nbsp; {totalOrders} orders across {rows.length} states &nbsp;·&nbsp; {fmt(totalRevenue)} total</>
            )}
          </p>
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-red-400">{error}</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No orders found for this date range.</td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.state} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.state}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.orders}</td>
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
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-700">{fmt(totalRevenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
