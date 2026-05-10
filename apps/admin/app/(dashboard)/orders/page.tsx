"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { zipSync } from "fflate";

type Order = {
  id: number;
  orderNumber: number;
  orderRef: string;
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
  delhiveryWaybill: string | null;
  invoiceKey: string | null;
  invoiceNumber: string | null;
  createdAt: string;
};

type Filter = "all" | "unfulfilled" | "pickup-awaiting" | "in-transit" | "delivered";
type SortKey = "newest" | "oldest" | "amount-desc" | "amount-asc";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  EXPIRED: "bg-gray-100 text-gray-500",
  PAID: "bg-blue-100 text-blue-800",
  PAID_DISPATCH_PENDING: "bg-orange-100 text-orange-800",
  DISPATCHED: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
  REFUNDED: "bg-purple-100 text-purple-800",
};

function normalizeStatus(status: string) {
  return status?.trim().toUpperCase();
}

function displayStatus(status: string, createdAt: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "PENDING" && Date.now() - new Date(createdAt).getTime() > 15 * 60 * 1000) {
    return "EXPIRED";
  }
  return normalized || status;
}

function StatusBadge({ status, createdAt }: { status: string; createdAt: string }) {
  const ds = displayStatus(status, createdAt);
  const colorClass = STATUS_COLORS[ds] || "bg-gray-100 text-gray-600";

  if (ds === "PAID_DISPATCH_PENDING") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${colorClass}`}>
        Pickup Pending
      </span>
    );
  }

  if (ds === "DISPATCHED") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${colorClass}`}>
        Transit
      </span>
    );
  }

  if (ds === "EXPIRED") {
    return (
      <span 
        className={`text-xs font-semibold px-2 py-1 rounded-full cursor-help ${colorClass}`}
        title="An order with no conversion: no payment"
      >
        {ds}
      </span>
    );
  }

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorClass}`}>
      {ds}
    </span>
  );
}

// ─── Order Detail Modal ──────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Order Details</h2>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{order.orderRef}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition-colors"
          >✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} createdAt={order.createdAt} />
            <span className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("en-IN")}</span>
          </div>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer</h3>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-semibold text-gray-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-semibold text-gray-900">{order.customerPhone}</span>
              </div>
              {order.customerEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-semibold text-gray-900">{order.customerEmail}</span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Delivery Address</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p className="text-gray-900 leading-relaxed whitespace-pre-line">{order.customerAddress}</p>
              <p className="text-gray-500 mt-1">Pincode: <span className="font-semibold text-gray-900">{order.customerPincode}</span></p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Items</h3>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">{order.productName} · {order.variantLabel} ×{order.quantity}</span>
                <span className="font-bold text-gray-900">₹{order.amount}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 border-t border-gray-200 pt-2 mt-1">
                <span>GST (incl.)</span>
                <span>₹{order.gstAmount}</span>
              </div>
            </div>
          </section>

          {order.delhiveryWaybill && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Shipping</h3>
              <div className="bg-gray-50 rounded-xl p-4 text-sm flex justify-between">
                <span className="text-gray-500">Waybill</span>
                <span className="font-mono font-bold text-gray-900">{order.delhiveryWaybill}</span>
              </div>
            </section>
          )}

          <a
            href={`/invoice/${order.orderRef}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Download Invoice
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Row Actions Dropdown ────────────────────────────────────────────────────

function RowActions({
  order, busy,
  onView, onCreateWaybill, onTriggerPickup, onSyncStatus, onVerifyPayment, onCancel, onRefund, onDelete,
}: {
  order: Order; busy: boolean;
  onView: () => void;
  onCreateWaybill: () => void;
  onTriggerPickup: () => void;
  onSyncStatus: () => void;
  onVerifyPayment: () => void;
  onCancel: () => void;
  onRefund: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const normalizedStatus = normalizeStatus(order.status);
  const canCreateWaybill = ["PAID"].includes(normalizedStatus);
  const hasWaybill = !!order.delhiveryWaybill;
  const isPickupAwaiting = normalizedStatus === "PAID_DISPATCH_PENDING";
  const canRefund = ["PAID", "PAID_DISPATCH_PENDING", "DISPATCHED"].includes(normalizedStatus);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
      >
        Actions ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[190px] py-1">
          <button
            onClick={() => { onView(); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
          >
            View Details
          </button>

          {canCreateWaybill && (
            <button
              onClick={() => { onCreateWaybill(); setOpen(false); }}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-700 disabled:opacity-40"
            >
              Create Waybill
            </button>
          )}

          {isPickupAwaiting && hasWaybill && (
            <button
              onClick={() => { onTriggerPickup(); setOpen(false); }}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 text-amber-700 disabled:opacity-40"
            >
              Trigger Pickup
            </button>
          )}

          {hasWaybill && (
            <button
              onClick={() => { onSyncStatus(); setOpen(false); }}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 text-purple-700 disabled:opacity-40"
            >
              Sync Tracking
            </button>
          )}

          {order.status === "PENDING" && displayStatus(order.status, order.createdAt) !== "EXPIRED" && (
            <button
              onClick={() => { onVerifyPayment(); setOpen(false); }}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-green-700 disabled:opacity-40"
            >
              Verify Payment
            </button>
          )}

          {isPickupAwaiting && hasWaybill && (
            <button
              onClick={() => { onCancel(); setOpen(false); }}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 disabled:opacity-40"
            >
              Cancel Shipment
            </button>
          )}

          {canRefund && (
            <button
              onClick={() => { onRefund(); setOpen(false); }}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 text-purple-700 disabled:opacity-40"
            >
              Initiate Refund
            </button>
          )}

          <div className="border-t border-gray-100 my-1" />

          <a
            href={`/invoice/${order.orderRef}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-gray-50 text-gray-600"
          >
            Download Invoice
          </a>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => { onDelete(); setOpen(false); }}
            disabled={busy}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 disabled:opacity-40"
          >
            Delete Order
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Label Download Progress ─────────────────────────────────────────────────

type LabelProgress =
  | { phase: "downloading"; done: number; total: number }
  | { phase: "zipping" }
  | { phase: "done" }
  | { phase: "error"; message: string };

function LabelDownloadModal({ progress }: { progress: LabelProgress }) {
  const pct =
    progress.phase === "downloading"
      ? Math.round((progress.done / progress.total) * 100)
      : progress.phase === "zipping"
      ? 100
      : progress.phase === "done"
      ? 100
      : 0;

  const label =
    progress.phase === "downloading"
      ? `Downloading ${progress.done}/${progress.total}`
      : progress.phase === "zipping"
      ? "Zipping…"
      : progress.phase === "done"
      ? "Done!"
      : `Error: ${progress.message}`;

  const isError = progress.phase === "error";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-black text-gray-900">Delhivery Labels</h2>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm font-semibold text-gray-700">
            <span>{label}</span>
            {!isError && <span className="tabular-nums">{pct}%</span>}
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isError ? "bg-red-500" : progress.phase === "done" ? "bg-green-500" : "bg-stone-800"
              }`}
              style={{ width: `${isError ? 100 : pct}%` }}
            />
          </div>
        </div>

        {progress.phase === "downloading" && (
          <p className="text-xs text-gray-400 text-center">
            Fetching label {progress.done} of {progress.total} from Delhivery…
          </p>
        )}
        {progress.phase === "zipping" && (
          <p className="text-xs text-gray-400 text-center">Packaging into zip file…</p>
        )}
        {progress.phase === "done" && (
          <p className="text-xs text-green-600 text-center font-semibold">Labels downloaded successfully.</p>
        )}
        {isError && (
          <p className="text-xs text-red-600 text-center">{progress.message}</p>
        )}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {msg}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unfulfilled", label: "Unfulfilled" },
  { key: "pickup-awaiting", label: "Pickup Awaiting" },
  { key: "in-transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [hideExpired, setHideExpired] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [labelProgress, setLabelProgress] = useState<LabelProgress | null>(null);

  const loadOrders = useCallback(() => {
    setLoading(true);
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOrders();
    // Silently sync tracking in background so delivered statuses are always fresh
    fetch("/api/orders/sync-tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => r.json())
      .then((data) => { if (data.updated > 0) loadOrders(); })
      .catch(() => {});
  }, [loadOrders]);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const filteredOrders = orders
    .filter((o) => {
      const status = normalizeStatus(o.status);
      if (filter === "unfulfilled") return ["PAID", "PAID_DISPATCH_PENDING"].includes(status);
      if (filter === "pickup-awaiting") return status === "PAID_DISPATCH_PENDING";
      if (filter === "in-transit") return status === "DISPATCHED";
      if (filter === "delivered") return status === "DELIVERED";
      return true;
    })
    .filter((o) => {
      if (hideExpired) return displayStatus(o.status, o.createdAt) !== "EXPIRED";
      return true;
    })
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "amount-desc") return b.amount - a.amount;
      if (sort === "amount-asc") return a.amount - b.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
    });

  const unfulfilledCount = orders.filter((o) => ["PAID", "PAID_DISPATCH_PENDING"].includes(normalizeStatus(o.status))).length;
  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selected.has(o.orderRef));
  const someSelected = filteredOrders.some((o) => selected.has(o.orderRef));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); filteredOrders.forEach((o) => n.delete(o.orderRef)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); filteredOrders.forEach((o) => n.add(o.orderRef)); return n; });
    }
  };

  const selectedRefs = [...selected];
  const selectedUnfulfilled = selectedRefs.filter((ref) => {
    const o = orders.find((x) => x.orderRef === ref);
    return o && ["PAID", "PAID_DISPATCH_PENDING"].includes(normalizeStatus(o.status));
  });
  const selectedWithWaybill = selectedRefs.filter((ref) =>
    orders.find((o) => o.orderRef === ref && o.delhiveryWaybill)
  );

  // ── Bulk actions ──

  const bulkGenerateWaybills = async () => {
    if (selectedUnfulfilled.length === 0) { showToast("error", "Select PAID orders first"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/bulk-waybill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRefs: selectedUnfulfilled }),
      });
      const data = await res.json();
      showToast(data.success ? "success" : "error", data.message || data.error || "Done");
      loadOrders();
      setSelected(new Set());
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  const syncTracking = async (refs?: string[]) => {
    setBusy(true);
    try {
      const res = await fetch("/api/orders/sync-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRefs: refs }),
      });
      const data = await res.json();
      showToast("success", data.message || "Synced");
      loadOrders();
    } catch { showToast("error", "Sync failed"); }
    setBusy(false);
  };

  const triggerPickup = async (refs?: string[]) => {
    const orderRefs = refs ?? selectedWithWaybill;
    if (orderRefs.length === 0) { showToast("error", "Select orders with waybills first"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/trigger-pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRefs }),
      });
      const data = await res.json();
      showToast(data.success ? "success" : "error", data.message || data.error || "Done");
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  const downloadLabels = async () => {
    if (selectedWithWaybill.length === 0) { showToast("error", "Select orders with waybills first"); return; }

    const waybills = selectedWithWaybill
      .map((ref) => orders.find((o) => o.orderRef === ref)?.delhiveryWaybill)
      .filter((w): w is string => !!w);

    if (waybills.length === 0) { showToast("error", "No waybills found for selected orders"); return; }

    setBusy(true);
    setLabelProgress({ phase: "downloading", done: 0, total: waybills.length });

    try {
      const files: Record<string, Uint8Array> = {};

      for (let i = 0; i < waybills.length; i++) {
        const waybill = waybills[i];
        setLabelProgress({ phase: "downloading", done: i, total: waybills.length });

        const res = await fetch("/api/shipping-labels/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waybill }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setLabelProgress({ phase: "error", message: errData.error || `Failed for waybill ${waybill}` });
          setTimeout(() => setLabelProgress(null), 3000);
          setBusy(false);
          return;
        }

        const buf = await res.arrayBuffer();
        files[`${waybill}.pdf`] = new Uint8Array(buf);
      }

      setLabelProgress({ phase: "zipping" });
      await new Promise((r) => setTimeout(r, 100)); // let UI update

      const zipped = zipSync(files, { level: 0 }); // level 0 = store only, PDFs don't compress
      const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `delhivery-labels-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setLabelProgress({ phase: "done" });
      setTimeout(() => setLabelProgress(null), 2000);
    } catch (err) {
      setLabelProgress({ phase: "error", message: String(err) });
      setTimeout(() => setLabelProgress(null), 3000);
    }

    setBusy(false);
  };

  // ── Per-row actions ──

  const createWaybill = async (orderRef: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderRef}/generate-waybill`, { method: "POST" });
      const data = await res.json();
      if (data.waybill) {
        showToast("success", `Waybill ${data.waybill} created`);
        loadOrders();
      } else {
        showToast("error", data.error || "Failed to create waybill");
      }
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  const cancelShipment = async (orderRef: string) => {
    if (!confirm(`Cancel shipment for ${orderRef}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderRef}/cancel`, { method: "POST" });
      const data = await res.json();
      showToast(data.success ? "success" : "error", data.message || data.error || "Done");
      loadOrders();
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  const verifyPayment = async (orderRef: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderRef}/verify-payment`, { method: "POST" });
      const data = await res.json();
      if (data.verified) {
        showToast("success", data.transactionId ? `Payment verified. Transaction ID: ${data.transactionId}` : "Payment verified successfully");
        loadOrders();
      } else {
        showToast("error", data.message || "Payment verification failed");
      }
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  const refundOrder = async (orderRef: string) => {
    if (!confirm(`Initiate full refund of ₹${orders.find((o) => o.orderRef === orderRef)?.amount} for ${orderRef}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderRef}/refund`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Refund initiated for ${orderRef}`);
        loadOrders();
      } else {
        showToast("error", data.error || "Refund failed");
      }
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  const deleteOrder = async (orderRef: string) => {
    if (!confirm(`Permanently delete order ${orderRef} and its invoice? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderRef}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("success", `Order ${orderRef} deleted`);
        loadOrders();
      } else {
        showToast("error", data.error || "Failed to delete");
      }
    } catch { showToast("error", "Request failed"); }
    setBusy(false);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {toast && <Toast type={toast.type} msg={toast.msg} />}
      {labelProgress && <LabelDownloadModal progress={labelProgress} />}

      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelected(new Set()); }}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === f.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
              {f.key === "unfulfilled" && unfulfilledCount > 0 && (
                <span className="bg-orange-200 text-orange-800 text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {unfulfilledCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk action buttons — show when something is selected */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-400">{selected.size} selected</span>

            {selectedUnfulfilled.length > 0 && (
              <button
                onClick={bulkGenerateWaybills}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                Generate Waybills ({selectedUnfulfilled.length})
              </button>
            )}

            {selectedWithWaybill.length > 0 && (
              <button
                onClick={downloadLabels}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                Shipping Labels ({selectedWithWaybill.length})
              </button>
            )}

            {selectedWithWaybill.length > 0 && (
              <button
                onClick={() => triggerPickup()}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                Trigger Pickup ({selectedWithWaybill.length})
              </button>
            )}

            {selectedWithWaybill.length > 0 && (
              <button
                onClick={() => syncTracking(selectedWithWaybill)}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                Sync Tracking
              </button>
            )}

            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Sort buttons */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([
              { key: "newest", label: "Newest" },
              { key: "oldest", label: "Oldest" },
              { key: "amount-desc", label: "₹ High" },
              { key: "amount-asc", label: "₹ Low" },
            ] as { key: SortKey; label: string }[]).map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  sort === s.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sync all (when nothing selected) */}
          {selected.size === 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => syncTracking()}
                disabled={busy}
                className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg disabled:opacity-50 transition-colors"
              >
                {busy ? "Syncing…" : "Sync All Tracking"}
              </button>
              <button
                onClick={() => setHideExpired(!hideExpired)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                  hideExpired
                    ? "bg-gray-200 text-gray-900 border-gray-300"
                    : "text-gray-600 border-gray-200 hover:text-gray-900"
                }`}
              >
                {hideExpired ? "Show Expired" : "Hide Expired"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">#</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Waybill</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  className={`border-b border-gray-100 hover:bg-gray-50/70 transition-colors ${
                    selected.has(o.orderRef) ? "bg-blue-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(o.orderRef)}
                      onChange={() => {
                        setSelected((prev) => {
                          const n = new Set(prev);
                          n.has(o.orderRef) ? n.delete(o.orderRef) : n.add(o.orderRef);
                          return n;
                        });
                      }}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-gray-400 tabular-nums">#{o.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customerName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{o.productName}</div>
                    <div className="text-xs text-gray-400">{o.variantLabel} ×{o.quantity}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">₹{o.amount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} createdAt={o.createdAt} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.delhiveryWaybill || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    <div>{new Date(o.createdAt).toLocaleDateString("en-IN")}</div>
                    <div className="font-mono tabular-nums">{new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      order={o}
                      busy={busy}
                      onView={() => setSelectedOrder(o)}
                      onCreateWaybill={() => createWaybill(o.orderRef)}
                      onTriggerPickup={() => triggerPickup([o.orderRef])}
                      onSyncStatus={() => syncTracking([o.orderRef])}
                      onVerifyPayment={() => verifyPayment(o.orderRef)}
                      onCancel={() => cancelShipment(o.orderRef)}
                      onRefund={() => refundOrder(o.orderRef)}
                      onDelete={() => deleteOrder(o.orderRef)}
                    />
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
