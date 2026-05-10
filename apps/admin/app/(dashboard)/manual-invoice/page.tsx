"use client";

import { useState, useEffect, useRef } from "react";

type SavedInvoice = {
  key: string;
  filename: string;
  size: number;
  lastModified: string | null;
};

const today = new Date().toISOString().split("T")[0];

export default function ManualInvoicePage() {
  const [form, setForm] = useState({
    buyerName: "",
    buyerPhone: "",
    buyerEmail: "",
    buyerAddress: "",
    buyerPincode: "",
    itemDescription: "",
    itemVariant: "",
    quantity: "1",
    amount: "",
    gstAmount: "",
    upiTransactionId: "",
    date: today,
  });
  const [screenshotDataUri, setScreenshotDataUri] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{ invoiceNumber: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedInvoice[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSaved();
  }, []);

  function autoGst(amountStr: string) {
    const amt = parseInt(amountStr);
    if (!isNaN(amt) && amt > 0) {
      return String(Math.round(amt * 5 / 105));
    }
    return "";
  }

  function set(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "amount") next.gstAmount = autoGst(value);
      return next;
    });
  }

  function handleImage(file: File) {
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotDataUri(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/manual-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: parseInt(form.quantity) || 1,
          amount: parseInt(form.amount),
          gstAmount: parseInt(form.gstAmount) || 0,
          upiScreenshotDataUri: screenshotDataUri,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setLastGenerated({ invoiceNumber: data.invoiceNumber, key: data.key });
      fetchSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteInvoice(key: string) {
    setDeletingKey(key);
    try {
      await fetch(`/api/manual-invoices?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      setSaved((prev) => prev.filter((d) => d.key !== key));
    } finally {
      setDeletingKey(null);
      setConfirmKey(null);
    }
  }

  async function fetchSaved() {
    setLoadingSaved(true);
    try {
      const res = await fetch("/api/manual-invoices");
      setSaved(await res.json());
    } catch {
      setSaved([]);
    } finally {
      setLoadingSaved(false);
    }
  }

  const canGenerate =
    form.buyerName && form.buyerPhone && form.buyerAddress && form.buyerPincode &&
    form.itemDescription && form.amount && form.upiTransactionId && form.date;

  return (
    <div className="h-full overflow-y-auto">
      <h1 className="text-2xl font-black mb-6">Manual Invoice</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Buyer Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
              <input
                value={form.buyerName}
                onChange={(e) => set("buyerName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                placeholder="Buyer name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
              <input
                value={form.buyerPhone}
                onChange={(e) => set("buyerPhone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                placeholder="+91 00000 00000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              value={form.buyerEmail}
              onChange={(e) => set("buyerEmail", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
              placeholder="buyer@email.com (optional)"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label>
              <input
                value={form.buyerAddress}
                onChange={(e) => set("buyerAddress", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                placeholder="Full address"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pincode *</label>
              <input
                value={form.buyerPincode}
                onChange={(e) => set("buyerPincode", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                placeholder="110001"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">Item</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
                <input
                  value={form.itemDescription}
                  onChange={(e) => set("itemDescription", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  placeholder="e.g. Premium Dry Fruits"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pack / Variant</label>
                <input
                  value={form.itemVariant}
                  onChange={(e) => set("itemVariant", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  placeholder="e.g. 500g"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Total Amount (₹) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">GST (₹)</label>
                <input
                  type="number"
                  value={form.gstAmount}
                  onChange={(e) => set("gstAmount", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  placeholder="auto-calc 5%"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">Payment</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">UPI Transaction ID *</label>
                <input
                  value={form.upiTransactionId}
                  onChange={(e) => set("upiTransactionId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-amber-400"
                  placeholder="e.g. 4127XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">UPI Screenshot</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImage(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors w-full justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {screenshotName ? screenshotName : "Upload screenshot (optional)"}
              </button>
              {screenshotDataUri && (
                <div className="mt-2 relative">
                  <img src={screenshotDataUri} alt="UPI screenshot preview" className="h-32 rounded-lg object-contain border border-gray-200" />
                  <button
                    onClick={() => { setScreenshotDataUri(null); setScreenshotName(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-1 right-1 w-5 h-5 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {lastGenerated && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700">{lastGenerated.invoiceNumber}</p>
                <p className="text-xs text-green-600 mt-0.5">Generated and saved to object storage</p>
              </div>
              <a
                href={`/api/documents/${encodeURIComponent(lastGenerated.key)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-green-700 hover:text-green-800 underline"
              >
                Download
              </a>
            </div>
          )}

          <button
            onClick={generate}
            disabled={!canGenerate || generating}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-colors text-sm"
          >
            {generating ? "Generating…" : "Generate Invoice"}
          </button>
        </div>

        {/* Saved invoices */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Saved Manual Invoices</h2>
            <button onClick={fetchSaved} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Refresh
            </button>
          </div>

          {loadingSaved ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : saved.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16 text-sm text-gray-400">
              No manual invoices yet
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Invoice</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Created</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">Size</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((doc) => (
                    <tr key={doc.key} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 max-w-[160px] truncate" title={doc.filename}>
                        {doc.filename.replace(".pdf", "")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {doc.lastModified
                          ? new Date(doc.lastModified).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-right">
                        {doc.size > 1024 ? `${Math.round(doc.size / 1024)} KB` : `${doc.size} B`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/api/documents/${encodeURIComponent(doc.key)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View
                          </a>
                          {confirmKey === doc.key ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteInvoice(doc.key)}
                                disabled={deletingKey === doc.key}
                                className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                              >
                                {deletingKey === doc.key ? "…" : "Yes"}
                              </button>
                              <span className="text-gray-300">/</span>
                              <button
                                onClick={() => setConfirmKey(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmKey(doc.key)}
                              className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                {saved.length} invoice{saved.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
