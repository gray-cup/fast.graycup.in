"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SubscriptionSuccessContent() {
  const params = useSearchParams();
  const ref = params.get("ref");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">☕</div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Subscription Set Up!</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          We&apos;re confirming your authorization with Cashfree. You&apos;ll receive an email
          shortly once your monthly subscription is active, and again every month when a payment goes through.
        </p>
        {ref && (
          <p className="text-xs font-mono text-gray-400 bg-gray-100 px-3 py-2 rounded-lg mb-6">
            Subscription ref: {ref}
          </p>
        )}
        <Link
          href="/"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Back to Shop
        </Link>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
