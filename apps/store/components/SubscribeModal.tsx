"use client";

import { useEffect, useRef, useState } from "react";
import { Product } from "@/lib/products";
import StateSelect from "@/components/StateSelect";
import { loadSavedCheckoutInfo, saveCheckoutInfo } from "@/lib/checkoutInfo";

interface SubscribeModalProps {
  product: Product;
  selectedVariantIndex: number;
  quantity: number;
  onClose: () => void;
}

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

export default function SubscribeModal({
  product,
  selectedVariantIndex,
  quantity: initialQuantity,
  onClose,
}: SubscribeModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState<FormData>(() => ({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    email: "",
    ...loadSavedCheckoutInfo(),
  }));
  const [quantity, setQuantity] = useState(initialQuantity);
  const [durationMonths, setDurationMonths] = useState(6);
  const [payUpfront, setPayUpfront] = useState(false);
  const [billingIntervalMonths, setBillingIntervalMonths] = useState<1 | 2>(1);

  const overlayRef = useRef<HTMLDivElement>(null);
  const isCoffee = product.category === "Coffee";
  const variant = product.variants[selectedVariantIndex];
  const monthlyTotal = variant.price * quantity;
  const cadenceLabel = billingIntervalMonths === 2 ? "Every 2 Months" : "Monthly";
  const cycles = Math.max(1, Math.round(durationMonths / billingIntervalMonths));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

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
      const endpoint = payUpfront ? "/api/create-order" : "/api/create-subscription";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantLabel: variant.label,
          quantity,
          durationMonths,
          billingIntervalMonths,
          isPrepaidSubscription: payUpfront,
          customer: {
            ...form,
            address: `${form.address}, ${form.city}, ${form.state}`,
          },
        }),
      });

      const data = await res.json();
      const cfMode = data.environment || "sandbox";
      if (!res.ok) throw new Error(data.error || `Failed to create ${payUpfront ? "order" : "subscription"}`);

      saveCheckoutInfo(form);

      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({ mode: cfMode });
      
      if (payUpfront) {
        cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
      } else {
        cashfree.subscriptionsCheckout({ subsSessionId: data.subscriptionSessionId, redirectTarget: "_self" });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const inputClass =
    "w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-gray-400 bg-gray-50";

  const btnClass = isCoffee
    ? "w-full bg-stone-900 hover:bg-stone-800 text-white font-black text-lg py-4 rounded-2xl transition-all duration-200 mt-2"
    : "w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-lg py-4 rounded-2xl transition-all duration-200 mt-2";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-stretch sm:items-center justify-center cursor-pointer"
    >
      <div className="bg-white w-full sm:max-w-xl sm:rounded-3xl sm:m-4 sm:max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-900">Set Up Monthly Subscription</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {product.name} · {variant.label} × {quantity}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-bold cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Order summary */}
          <div className="mx-6 mt-4 mb-2 bg-stone-50 rounded-2xl p-4 flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{product.name} {variant.label} ×{quantity}</span>
              <span className="font-bold text-gray-900">₹{monthlyTotal} / {billingIntervalMonths === 2 ? "2 months" : "month"}</span>
            </div>
            <div className="border-t border-gray-200 mt-1 pt-2 flex justify-between">
              <span className="font-black text-gray-900">Charged {cadenceLabel}</span>
              <span className="font-black text-2xl text-gray-900">₹{monthlyTotal}</span>
            </div>
            <p className="text-xs text-gray-400">Price inclusive of GST. Cancel any time by emailing us.</p>
          </div>

          {/* Form */}
          {step === "form" && (
            <form id="subscribe-form" onSubmit={handleSubmit} className="px-6 pt-2 pb-4 flex flex-col gap-4">
              
              {/* Pay Upfront Switch */}
              <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">Pay Upfront & Save 5%</h3>
                  <p className="text-xs text-amber-700 mt-0.5">Pay all at once for your entire subscription.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={payUpfront} onChange={(e) => {
                    setPayUpfront(e.target.checked);
                    if (e.target.checked && durationMonths > 12) setDurationMonths(12);
                    if (e.target.checked) setBillingIntervalMonths(1);
                  }} />
                  <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Billing Cadence */}
              {!payUpfront && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Billing Frequency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([1, 2] as const).map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => setBillingIntervalMonths(interval)}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                          billingIntervalMonths === interval
                            ? isCoffee ? "bg-stone-900 text-white border-stone-900" : "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {interval === 1 ? "Every Month" : "Every 2 Months"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Quantity</label>
                <div className="inline-flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors">−</button>
                  <span className="w-12 h-11 flex items-center justify-center text-lg font-black text-gray-900">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="w-11 h-11 flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors">+</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You&apos;ll receive {quantity} × {variant.label} {!payUpfront && billingIntervalMonths === 2 ? "every 2 months" : "every month"}.
                </p>
              </div>

              {/* Duration Picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Subscription Duration</label>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-2xl font-black text-gray-900">{durationMonths} Months</span>
                    <span className="text-sm font-bold text-gray-500">
                      {payUpfront ? (
                        <>
                          <span className="line-through text-gray-400 font-normal mr-1.5">₹{monthlyTotal * durationMonths}</span>
                          <span className="text-amber-600">₹{Math.round(monthlyTotal * durationMonths * 0.95)} total</span>
                        </>
                      ) : (
                        `₹${monthlyTotal * cycles} total commitment`
                      )}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max={payUpfront ? "12" : "24"}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isCoffee ? "accent-stone-900 bg-stone-200" : "accent-amber-500 bg-amber-200"}`}
                  />
                  <div className="flex justify-between text-xs text-gray-400 font-bold mt-2 px-1">
                    <span>2m</span>
                    {payUpfront ? (
                      <>
                        <span>6m</span>
                        <span>12m</span>
                      </>
                    ) : (
                      <>
                        <span>12m</span>
                        <span>24m</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {payUpfront
                    ? `You will be charged ₹${Math.round(monthlyTotal * durationMonths * 0.95)} once today. Deliveries will arrive every month for ${durationMonths} months.`
                    : `You will be charged ₹${monthlyTotal} every ${billingIntervalMonths === 2 ? "2 months" : "month"} for ${durationMonths} months (${cycles} charge${cycles === 1 ? "" : "s"}). Auto-cancels afterwards.`
                  }
                </p>
              </div>

              {/* Row 1: Name + Phone */}
              <div className="grid grid-cols-2 gap-3 mt-1">
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

              {/* Email full width — required for subscriptions (Cashfree + monthly receipts) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  required placeholder="you@example.com" className={inputClass} autoComplete="email" />
              </div>

              {/* Address full width */}
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

          {/* Loading */}
          {step === "loading" && (
            <div className="px-6 py-16 flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xl font-bold text-gray-800">Setting up your subscription…</p>
              <p className="text-sm text-gray-500 text-center">
                Redirecting to Cashfree to authorize monthly payments. Do not close this window.
              </p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
              <div className="text-5xl">⚠️</div>
              <p className="text-xl font-bold text-gray-800">Something went wrong</p>
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{errorMsg}</p>
              <button
                onClick={() => setStep("form")}
                className="mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-xl"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Sticky footer — only shown on form step */}
        {step === "form" && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
            <button type="submit" form="subscribe-form" className={btnClass}>
              {payUpfront ? `Pay ₹${Math.round(monthlyTotal * durationMonths * 0.95)} Upfront` : `Authorize ₹${monthlyTotal} / ${billingIntervalMonths === 2 ? "2mo" : "mo"}`}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Secured by Cashfree · Cancel any time
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
