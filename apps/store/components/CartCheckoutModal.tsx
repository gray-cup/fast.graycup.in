"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/products";
import StateSelect from "@/components/StateSelect";


interface FormData {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
}

type Step = "form" | "loading" | "error";

export default function CartCheckoutModal({ onClose }: { onClose: () => void }) {
  const { items, clearCart } = useCart();
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState<FormData>({ name: "", phone: "", address: "", city: "", state: "", pincode: "", email: "" });
  const overlayRef = useRef<HTMLDivElement>(null);

  const subtotal = items.reduce((s, i) => s + i.product.variants[i.variantIndex].price * i.quantity, 0);
  const totalDelivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : items.reduce((s, i) => s + (i.product.variants[i.variantIndex].deliveryCharge ?? 0) * i.quantity, 0);
  const total = subtotal + totalDelivery;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep("loading");
    setErrorMsg("");

    try {
      const orderItems = items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        variantLabel: i.product.variants[i.variantIndex].label,
        weightGrams: i.product.variants[i.variantIndex].weightGrams,
        quantity: i.quantity,
        price: i.product.variants[i.variantIndex].price,
        batchId: i.product.variants[i.variantIndex].batchId ?? null,
      }));

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          amount: total,
          customer: {
            ...form,
            address: `${form.address}, ${form.city}, ${form.state}`,
          },
        }),
      });

      const data = await res.json();
      const cfMode = (process.env.NEXT_PUBLIC_CASHFREE_MODE as "sandbox" | "production") || "sandbox";
      console.log("[cart-checkout] server debug:", data._debug);
      console.log("[cart-checkout] client SDK mode:", cfMode);
      console.log("[cart-checkout] sessionId prefix:", data.paymentSessionId?.slice(0, 16));
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      clearCart();

      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({ mode: cfMode });
      cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const inputClass =
    "w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-gray-400 bg-gray-50";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-stretch sm:items-center justify-center"
    >
      <div className="bg-white w-full sm:max-w-xl sm:rounded-3xl sm:m-4 sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900">Complete Order</h2>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} in cart</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-bold cursor-pointer"
            aria-label="Close"
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Order summary */}
          <div className="mx-6 mt-4 mb-2 bg-stone-50 rounded-2xl p-4 flex flex-col gap-1.5">
            {items.map((item) => {
              const v = item.product.variants[item.variantIndex];
              return (
                <div key={`${item.product.id}-${item.variantIndex}`} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.product.name} {v.label} ×{item.quantity}</span>
                  <span className="font-bold text-gray-900">₹{v.price * item.quantity}</span>
                </div>
              );
            })}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              {totalDelivery > 0
                ? <span className="text-gray-700">₹{totalDelivery}</span>
                : <span className="text-green-600 font-semibold">Free</span>
              }
            </div>
            <div className="border-t border-gray-200 mt-1 pt-2 flex justify-between">
              <span className="font-black text-gray-900">Total</span>
              <span className="font-black text-2xl text-gray-900">₹{total}</span>
            </div>
            <p className="text-xs text-gray-400">Product prices inclusive of GST</p>
          </div>

          {/* Form */}
          {step === "form" && (
            <form id="cart-checkout-form" onSubmit={handleSubmit} className="px-6 pt-2 pb-4 flex flex-col gap-4">
              {/* Row 1: Name + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                  <input name="name" type="text" value={form.name} onChange={handleChange}
                    required placeholder="Rahul Sharma" className={inputClass} autoComplete="name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                    required pattern="[0-9]{10}" placeholder="10-digit number"
                    className={inputClass} inputMode="numeric" maxLength={10} autoComplete="tel" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" className={inputClass} autoComplete="email" />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Delivery Address</label>
                <textarea name="address" value={form.address} onChange={handleChange}
                  required rows={2} placeholder="House no., street, area"
                  className={`${inputClass} resize-none overflow-y-auto`} autoComplete="street-address" />
              </div>

              {/* Row 2: City + State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">City</label>
                  <input name="city" type="text" value={form.city} onChange={handleChange}
                    required placeholder="e.g. Panchkula"
                    className={inputClass} autoComplete="address-level2" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">State</label>
                  <StateSelect
                    value={form.state}
                    onChange={(v) => setForm((prev) => ({ ...prev, state: v }))}
                    required
                  />
                </div>
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Pincode</label>
                <input name="pincode" type="text" value={form.pincode} onChange={handleChange}
                  required pattern="[0-9]{6}" placeholder="6-digit pincode"
                  className={inputClass} inputMode="numeric" maxLength={6} />
              </div>
            </form>
          )}

          {step === "loading" && (
            <div className="px-6 py-16 flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xl font-bold text-gray-800">Creating your order…</p>
              <p className="text-sm text-gray-500 text-center">Redirecting to Cashfree. Do not close this window.</p>
            </div>
          )}

          {step === "error" && (
            <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
              <div className="text-5xl">⚠️</div>
              <p className="text-xl font-bold text-gray-800">Something went wrong</p>
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{errorMsg}</p>
              <button onClick={() => setStep("form")} className="mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-xl cursor-pointer">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Sticky footer — only shown on form step */}
        {step === "form" && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
            <button type="submit" form="cart-checkout-form" className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-lg py-4 rounded-2xl transition-all duration-200 cursor-pointer">
              Pay ₹{total} Securely
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Secured by Cashfree · Shipped via Delhivery</p>
          </div>
        )}
      </div>
    </div>
  );
}
