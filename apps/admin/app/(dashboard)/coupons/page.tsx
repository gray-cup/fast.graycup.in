"use client";

import { useState, useEffect, useCallback } from "react";

type Coupon = {
  id: number;
  code: string;
  discountPercent: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
};

function Toast({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {msg}
    </div>
  );
}

const emptyForm = {
  code: "",
  discountPercent: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  usageLimit: "",
  expiresAt: "",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((data) => { setCoupons(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create coupon");
      showToast("success", `Coupon ${data.code} created`);
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to create coupon");
    }
    setCreating(false);
  };

  const toggleActive = async (c: Coupon) => {
    setBusyCode(c.code);
    try {
      const res = await fetch(`/api/coupons/${c.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      if (!res.ok) throw new Error("Failed to update coupon");
      load();
    } catch {
      showToast("error", "Failed to update coupon");
    }
    setBusyCode(null);
  };

  const deleteCoupon = async (code: string) => {
    if (!confirm(`Delete coupon ${code}? This can't be undone.`)) return;
    setBusyCode(code);
    try {
      const res = await fetch(`/api/coupons/${code}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete coupon");
      load();
    } catch {
      showToast("error", "Failed to delete coupon");
    }
    setBusyCode(null);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50";

  return (
    <div className="flex flex-col h-full gap-4">
      {toast && <Toast type={toast.type} msg={toast.msg} />}

      <form onSubmit={handleCreate} className="shrink-0 bg-white rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Create Coupon</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Code *</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="WELCOME10" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Discount % *</label>
            <input required type="number" min={0.01} max={100} step={0.01} value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
              placeholder="10 or 27.45" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Max Discount (₹)</label>
            <input type="number" min={0} value={form.maxDiscountAmount}
              onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
              placeholder="Optional" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Min Order (₹)</label>
            <input type="number" min={0} value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              placeholder="Optional" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Usage Limit</label>
            <input type="number" min={1} value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              placeholder="Unlimited" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Expires</label>
            <input type="date" value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className={inputClass} />
          </div>
        </div>
        <button type="submit" disabled={creating}
          className="mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer">
          {creating ? "Creating…" : "Create Coupon"}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Discount</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Min Order</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Usage</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Expires</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 text-right">
                    {c.discountPercent}%{c.maxDiscountAmount ? ` (max ₹${c.maxDiscountAmount})` : ""}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.minOrderAmount ? `₹${c.minOrderAmount}` : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                      {c.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3 justify-end">
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={busyCode === c.code}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 cursor-pointer"
                    >
                      {c.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteCoupon(c.code)}
                      disabled={busyCode === c.code}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40 cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No coupons yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
