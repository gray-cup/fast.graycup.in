"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { getProductBySlug, products, gstAmount } from "@/lib/products";
import CheckoutModal from "@/components/CheckoutModal";
import ProductCard from "@/components/ProductCard";

interface Review {
  id: number;
  productId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

function ReviewsSection({ productId, isCoffee }: { productId: string; isCoffee: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews ?? []);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!authorName.trim() || !reviewText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, authorName, reviewText }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong");
      } else {
        setSubmitted(true);
        setAuthorName("");
        setReviewText("");
        fetchReviews();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const accent = isCoffee ? "stone" : "amber";

  return (
    <section className="mt-20">
      <h2 className="text-3xl font-black text-gray-900 mb-8">Customer Reviews</h2>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-400 text-sm mb-8">No reviews yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-5 mb-10">
          {reviews.map((r) => (
            <div key={r.id} className="bg-gray-50 rounded-2xl px-6 py-5">
              <p className="font-bold text-gray-900 text-sm mb-1">{r.authorName}</p>
              <p className="text-gray-700 leading-relaxed">{r.body}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-8">
        <h3 className="text-xl font-black text-gray-900 mb-5">Write a Review</h3>
        {submitted ? (
          <div className={`bg-${accent}-50 border border-${accent}-200 rounded-2xl px-6 py-4`}>
            <p className="font-bold text-gray-900">Thank you for your review!</p>
            <button onClick={() => setSubmitted(false)} className="text-sm text-gray-500 underline mt-1">Write another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-widest">Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience…"
                required
                rows={4}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className={`self-start font-black text-sm px-6 py-3 rounded-xl transition-all disabled:opacity-50 ${isCoffee ? "bg-stone-900 hover:bg-stone-800 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default function ProductPageClient({ slug }: { slug: string }) {
  const product = getProductBySlug(slug);

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-3xl font-black text-gray-900">Product not found</h1>
        <p className="text-gray-500">This product doesn&apos;t exist or may have been removed.</p>
        <Link href="/" className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl">
          ← Back to Shop
        </Link>
      </div>
    );
  }

  const isCoffee = product.category === "Coffee";
  const variant = product.variants[selectedVariant];
  const allowsQuantity = variant.label === "2kg (4 Packs)";
  const effectiveQty = allowsQuantity ? quantity : 1;
  const total = variant.price * effectiveQty;
  const gst = gstAmount(total);
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 pb-32 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className={`relative w-full aspect-square max-h-64 sm:max-h-none rounded-3xl overflow-hidden shadow-sm ${isCoffee ? "bg-stone-100" : "bg-amber-50"}`}>
            <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
          </div>

          <div className="flex flex-col">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-3">{product.name}</h1>
            <p className="text-xl text-gray-500 mb-5 leading-relaxed">{product.tagline}</p>
            <p className="text-base text-gray-600 leading-relaxed mb-8">{product.description}</p>

            <div className="mb-6">
              <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-widest">Pack Size</p>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v, i) => (
                  <button key={v.label} onClick={() => { setSelectedVariant(i); setQuantity(1); }}
                    className={`px-5 py-3 rounded-xl font-bold text-sm border-2 transition-all duration-150 ${selectedVariant === i ? isCoffee ? "border-stone-900 bg-stone-50 text-stone-900" : "border-amber-400 bg-amber-50 text-gray-900" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                    {v.label}
                    <span className={`block text-xs font-semibold mt-0.5 ${isCoffee ? "text-stone-600" : "text-amber-600"}`}>₹{v.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {allowsQuantity && (
              <div className="mb-8">
                <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-widest">Quantity</p>
                <div className="inline-flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors">−</button>
                  <span className="w-14 h-12 flex items-center justify-center text-xl font-black text-gray-900">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(10, q + 1))} className="w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-700 hover:bg-gray-100 transition-colors">+</button>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-6">
              {product.outOfStock ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-5 py-4">
                    <span className="text-2xl">😔</span>
                    <div>
                      <p className="font-black text-gray-900 text-base">Currently Out of Stock</p>
                      <p className="text-sm text-gray-500 mt-0.5">We&apos;ve sold out of this size for now.</p>
                    </div>
                  </div>
                  <Link
                    href="/product/ctc-blend"
                    className="w-full text-center font-black text-xl py-5 rounded-2xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Pre-book 500gm Pack — Coming Soon
                  </Link>
                  <p className="text-xs text-center text-gray-400">The 500gm pack will ship soon. Pre-book to secure yours.</p>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-5xl font-black text-gray-900">₹{total}</span>
                      {effectiveQty > 1 && <span className="text-sm text-gray-500">(₹{variant.price} × {effectiveQty})</span>}
                    </div>
                    <p className="text-xs text-gray-400">Incl. 5% GST (CGST 2.5% + SGST 2.5% = ₹{gst})</p>
                  </div>
                  <button onClick={() => setShowCheckout(true)}
                    className={`w-full font-black text-xl py-5 rounded-2xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 mb-3 ${isCoffee ? "bg-stone-900 hover:bg-stone-800 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}>
                    Buy Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="text-3xl font-black text-gray-900 mb-8">More {product.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <ReviewsSection productId={product.id} isCoffee={isCoffee} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-2xl lg:hidden z-40">
        {product.outOfStock ? (
          <Link
            href="/product/ctc-blend"
            className="block w-full text-center font-black text-lg py-4 rounded-2xl transition-all bg-amber-500 hover:bg-amber-600 text-white"
          >
            Pre-book 500gm — Coming Soon
          </Link>
        ) : (
          <button onClick={() => setShowCheckout(true)}
            className={`w-full font-black text-lg py-4 rounded-2xl transition-all ${isCoffee ? "bg-stone-900 hover:bg-stone-800 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}>
            Buy Now · ₹{total}
          </button>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal product={product} selectedVariantIndex={selectedVariant} quantity={effectiveQty} onClose={() => setShowCheckout(false)} />
      )}
    </>
  );
}
