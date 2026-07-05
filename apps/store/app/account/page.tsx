"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Subscription {
  subscriptionRef: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  amount: number;
  status: string;
  nextChargeDate: string | null;
  createdAt: string;
}

interface Payment {
  id: number;
  subscriptionRef: string;
  amount: number;
  status: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INITIALIZED: "bg-amber-100 text-amber-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  AUTH_FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  CUSTOMER_CANCELLED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-gray-100 text-gray-600",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/account/me");
    if (res.status === 401) {
      router.replace("/account/login");
      return;
    }
    const data = await res.json();
    setEmail(data.email);
    setSubscriptions(data.subscriptions ?? []);
    setPayments(data.payments ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (subscriptionRef: string) => {
    if (!confirm("Cancel this subscription? This can't be undone.")) return;
    setCancellingRef(subscriptionRef);
    try {
      const res = await fetch("/api/account/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionRef }),
      });
      if (res.ok) await load();
      else alert("Couldn't cancel this subscription. Please try again or email us.");
    } finally {
      setCancellingRef(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/account/logout", { method: "POST" });
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900">My Account</h1>
          <p className="text-gray-500 mt-1">{email}</p>
        </div>
        <button onClick={handleLogout} className="text-sm font-bold text-gray-500 hover:text-gray-900">
          Sign Out
        </button>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-black text-gray-900 mb-4">Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl px-6 py-8 text-center">
            <p className="text-gray-500 mb-4">You don&apos;t have any subscriptions yet.</p>
            <Link href="/" className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {subscriptions.map((s) => {
              const cancelled = ["CANCELLED", "CUSTOMER_CANCELLED", "EXPIRED", "COMPLETED"].includes(s.status);
              return (
                <div key={s.subscriptionRef} className="border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-gray-900">{s.productName}</p>
                      <p className="text-sm text-gray-500">{s.variantLabel} × {s.quantity}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-lg font-black text-gray-900">₹{s.amount}/mo</p>
                      {!cancelled && <p className="text-xs text-gray-400">Next charge: {formatDate(s.nextChargeDate)}</p>}
                    </div>
                    {!cancelled && (
                      <button
                        onClick={() => handleCancel(s.subscriptionRef)}
                        disabled={cancellingRef === s.subscriptionRef}
                        className="text-sm font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {cancellingRef === s.subscriptionRef ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {payments.length > 0 && (
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4">Billing History</h2>
          <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">₹{p.amount}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
