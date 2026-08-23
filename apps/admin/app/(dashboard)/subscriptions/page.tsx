"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Subscription = {
  id: number;
  subscriptionRef: string;
  cfSubscriptionId: string | null;
  productId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  amount: number;
  gstAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string;
  customerPincode: string;
  status: string;
  nextChargeDate: string | null;
  billingIntervalMonths: number;
  durationMonths: number;
  createdAt: string;
  paymentsCount: number;
  totalCollected: number;
};

type Filter = "all" | "active" | "pending" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INITIALIZED: "bg-yellow-100 text-yellow-800",
  ON_HOLD: "bg-orange-100 text-orange-800",
  AUTH_FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
  CUSTOMER_CANCELLED: "bg-gray-200 text-gray-600",
  EXPIRED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-blue-100 text-blue-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function Toast({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {msg}
    </div>
  );
}

function CancelDialog({
  subscriptionRef,
  busy,
  onConfirm,
  onClose,
}: {
  subscriptionRef: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const confirmed = text.trim().toLowerCase() === "cancel";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-black text-gray-900 mb-2">Cancel subscription?</h3>
        <p className="text-sm text-gray-500 mb-4">
          This can&apos;t be undone. Type <span className="font-mono font-bold text-gray-700">cancel</span> below to confirm
          cancelling <span className="font-mono">{subscriptionRef}</span>.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Type cancel to confirm"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-semibold text-gray-700 border border-gray-300 rounded-xl py-2.5 hover:bg-gray-50"
          >
            Don&apos;t Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || busy}
            className="flex-1 text-sm font-semibold text-white bg-red-600 rounded-xl py-2.5 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Cancelling…" : "Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<{ ref: string; action: "sync" | "cancel" } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [menuOpenRef, setMenuOpenRef] = useState<string | null>(null);
  const [cancelDialogRef, setCancelDialogRef] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpenRef) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenRef(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenRef]);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((data) => { setSubs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const cancelSubscription = async (subscriptionRef: string) => {
    setBusy({ ref: subscriptionRef, action: "cancel" });
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionRef}/cancel`, { method: "POST" });
      const data = await res.json();
      showToast(res.ok ? "success" : "error", data.error || `Status: ${data.status}`);
      load();
    } catch {
      showToast("error", "Request failed");
    }
    setBusy(null);
    setCancelDialogRef(null);
  };

  const syncSubscription = async (subscriptionRef: string) => {
    setBusy({ ref: subscriptionRef, action: "sync" });
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionRef}/sync`, { method: "POST" });
      const data = await res.json();
      const debug = data._debug ? ` [env=${data._debug.cashfreeEnv} cfStatus=${data._debug.cfStatus} cfMsg=${JSON.stringify(data._debug.cfError)}]` : "";
      showToast(res.ok ? "success" : "error", (res.ok ? `Status: ${data.status}` : data.error) + debug);
      load();
    } catch {
      showToast("error", "Request failed");
    }
    setBusy(null);
  };

  const filtered = subs.filter((s) => {
    if (filter === "active") return s.status === "ACTIVE";
    if (filter === "pending") return ["INITIALIZED", "ON_HOLD", "AUTH_FAILED"].includes(s.status);
    if (filter === "cancelled") return ["CANCELLED", "CUSTOMER_CANCELLED", "EXPIRED", "COMPLETED"].includes(s.status);
    return true;
  });

  const activeCount = subs.filter((s) => s.status === "ACTIVE").length;
  const mrr = subs.filter((s) => s.status === "ACTIVE").reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="flex flex-col h-full gap-3">
      {toast && <Toast type={toast.type} msg={toast.msg} />}
      {cancelDialogRef && (
        <CancelDialog
          subscriptionRef={cancelDialogRef}
          busy={busy?.ref === cancelDialogRef && busy.action === "cancel"}
          onConfirm={() => cancelSubscription(cancelDialogRef)}
          onClose={() => setCancelDialogRef(null)}
        />
      )}

      <div className="shrink-0 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                filter === f.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
              {f.key === "active" && activeCount > 0 && (
                <span className="ml-1.5 bg-green-200 text-green-800 text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wider">MRR</div>
            <div className="font-black text-gray-900">₹{mrr.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Billing</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Next Charge</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Payments</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Collected</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const cancelled = ["CANCELLED", "CUSTOMER_CANCELLED", "EXPIRED", "COMPLETED"].includes(s.status);
                return (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.customerName}</div>
                      <div className="text-xs text-gray-400">{s.customerEmail || s.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{s.productName}</div>
                      <div className="text-xs text-gray-400">{s.variantLabel} ×{s.quantity}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      ₹{s.amount}{s.billingIntervalMonths === 2 ? " / 2mo" : "/mo"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {s.billingIntervalMonths === 2 ? "Every 2 months" : "Monthly"}
                      <div className="text-gray-400">{s.durationMonths >= 120 ? "Ongoing" : `${s.durationMonths}mo term`}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {s.nextChargeDate ? new Date(s.nextChargeDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{s.paymentsCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{s.totalCollected.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!cancelled && (
                          <button
                            onClick={() => syncSubscription(s.subscriptionRef)}
                            disabled={busy?.ref === s.subscriptionRef}
                            className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                            title="Pull the live status from Cashfree"
                          >
                            {busy?.ref === s.subscriptionRef && busy.action === "sync" ? "Syncing…" : "Sync"}
                          </button>
                        )}
                        {!cancelled && (
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpenRef(menuOpenRef === s.subscriptionRef ? null : s.subscriptionRef)}
                              disabled={busy?.ref === s.subscriptionRef}
                              className="text-xs font-semibold text-gray-500 border border-gray-300 rounded-lg w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                              aria-label="More actions"
                            >
                              ⋮
                            </button>
                            {menuOpenRef === s.subscriptionRef && (
                              <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-40 z-20">
                                <button
                                  onClick={() => { setMenuOpenRef(null); setCancelDialogRef(s.subscriptionRef); }}
                                  className="w-full text-left text-xs font-semibold text-red-600 px-3 py-2 hover:bg-red-50"
                                >
                                  Cancel subscription
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">No subscriptions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
