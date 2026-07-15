"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Product } from "@/lib/products";
import CheckoutModal from "@/components/CheckoutModal";
import { useCart } from "@/lib/cart";

export default function ProductCard({ product }: { product: Product }) {
  const v0 = product.variants[0];
  const isCoffee = product.category === "Coffee";
  const [qty, setQty] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const { addToCart, totalItems } = useCart();

  const atLimit = totalItems >= 20;

  const decrement = () => setQty((q) => Math.max(1, q - 1));
  const increment = () => setQty((q) => Math.min(20, q + 1));

  return (
    <>
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 flex flex-col">
        {/* Image */}
        <Link href={`/product/${product.slug}`} className="block cursor-pointer">
          <div className={`relative w-full aspect-square overflow-hidden ${isCoffee ? "bg-stone-100" : "bg-amber-50"}`}>
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-cover ${product.outOfStock ? "grayscale opacity-60" : ""}`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {product.outOfStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-gray-900/80 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">Out of Stock</span>
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <Link
            href={`/product/${product.slug}`}
            className="text-base font-black text-gray-900 mb-1 leading-snug hover:underline cursor-pointer"
          >
            {product.name}
          </Link>

          <div className="mt-auto">
            {product.outOfStock ? (
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-sm text-gray-500 leading-snug">This pack is currently sold out.</p>
                <Link
                  href="/product/ctc-blend"
                  className="w-full text-center font-bold text-sm py-2.5 rounded-lg transition-colors duration-200 bg-amber-400 hover:bg-amber-500 text-gray-900 cursor-pointer"
                >
                  Pre-book 500gm — Coming Soon
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-0.5">From</p>
                <p className="text-xl font-black text-gray-900 mb-0.5">₹{v0.price * qty}{v0.deliveryCharge ? <span className="text-xs font-normal text-gray-400 ml-1">+ ₹{v0.deliveryCharge} delivery</span> : null}</p>
                <p className="text-xs text-gray-400 mb-3">All prices inclusive of GST</p>

                {/* Quantity selector */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={decrement}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-base font-bold cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-900 tabular-nums">{qty}</span>
                    <button
                      onClick={increment}
                      disabled={atLimit || qty >= 20}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-base font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  {atLimit && <span className="text-xs text-red-500">Cart limit reached</span>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="flex-1 font-bold text-sm py-2.5 rounded-lg transition-colors duration-200 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={() => addToCart(product, 0, qty)}
                    disabled={atLimit}
                    className="flex-1 font-bold text-sm py-2.5 rounded-lg transition-colors duration-200 bg-amber-400 hover:bg-amber-500 text-gray-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add to Cart
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          product={product}
          selectedVariantIndex={0}
          quantity={qty}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
}
