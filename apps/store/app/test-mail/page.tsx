"use client";

import { useState } from "react";

export default function TestMailPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/test-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        const debug = data._debug ? ` (RESEND_FROM_EMAIL = ${data._debug.fromEnv})` : "";
        throw new Error((data.error || "Failed to send email") + debug);
      }
      setStatus("ok");
      setMessage(`Sent to ${email}. Check the inbox (and spam folder).`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-black text-gray-900 mb-2">Test Resend Email</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sends a test email via Resend to confirm it&apos;s wired up correctly.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="office@graycup.org"
          className="w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors"
        >
          {status === "loading" ? "Sending…" : "Send Test Email"}
        </button>
      </form>

      {message && (
        <p className={`mt-4 text-sm ${status === "ok" ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
