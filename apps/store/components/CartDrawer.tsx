"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart";
import CartCheckoutModal from "@/components/CartCheckoutModal";

export default function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, removeFromCart, updateQty, totalItems } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const total = items.reduce(
    (s, i) => s + i.product.variants[i.variantIndex].price * i.quantity,
    0
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm cursor-pointer"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">
            Cart {totalItems > 0 && <span className="text-amber-500">({totalItems})</span>}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 font-bold cursor-pointer"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-3">
              <span className="text-5xl">🛒</span>
              <p className="text-lg font-bold text-gray-700">Your cart is empty</p>
              <p className="text-sm text-gray-400">Add some products to get started.</p>
            </div>
          ) : (
            items.map((item) => {
              const variant = item.product.variants[item.variantIndex];
              return (
                <div key={`${item.product.id}-${item.variantIndex}`} className="flex gap-3 items-start">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50">
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 leading-snug truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      {variant.label} · ₹{variant.price} each
                      {item.grindSize && <> · {item.grindSize}</>}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id, item.variantIndex, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center cursor-pointer"
                      >−</button>
                      <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product.id, item.variantIndex, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 flex items-center justify-center cursor-pointer"
                      >+</button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-black text-sm text-gray-900">₹{variant.price * item.quantity}</p>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.variantIndex)}
                      className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-2xl font-black text-gray-900">₹{total}</span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Checkout — ₹{total}
            </button>
          </div>
        )}
      </div>

      {checkoutOpen && <CartCheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </>
  );
}
