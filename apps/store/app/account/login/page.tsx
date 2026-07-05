"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const params = useSearchParams();
  const error = params.get("error");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/account/request-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full">
        <h1 className="text-3xl font-black text-gray-900 mb-2 text-center">My Account</h1>
        <p className="text-gray-500 text-center mb-8">
          Sign in with your email to manage your subscriptions.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-6 text-center">
            That sign-in link is invalid or has expired. Please request a new one.
          </p>
        )}

        {submitted ? (
          <div className="text-center bg-stone-50 rounded-2xl px-6 py-8">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-bold text-gray-900 mb-1">Check your email</p>
            <p className="text-sm text-gray-500">
              If an account exists for {email}, we&apos;ve sent a sign-in link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-stone-900 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Sign-In Link"}
            </button>
          </form>
        )}

        <Link href="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-6">
          ← Back to Shop
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
