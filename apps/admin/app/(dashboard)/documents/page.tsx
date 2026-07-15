"use client";

import { useState, useEffect } from "react";

type Document = {
  id: number;
  type: "INVOICE" | "GST_SUMMARY" | "LABEL" | "PACKING_SLIP";
  source: "ADMIN" | "STORE";
  key: string;
  orderRef: string | null;
  filename: string;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  GST_SUMMARY: "GST Summary",
  LABEL: "Label",
  PACKING_SLIP: "Packing Slip",
};

const SOURCE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  STORE: "Store (Customer)",
};

const TYPE_COLORS: Record<string, string> = {
  INVOICE: "bg-blue-100 text-blue-700",
  GST_SUMMARY: "bg-purple-100 text-purple-700",
  LABEL: "bg-green-100 text-green-700",
  PACKING_SLIP: "bg-orange-100 text-orange-700",
};

const SOURCE_COLORS: Record<string, string> = {
  ADMIN: "bg-gray-700 text-white",
  STORE: "bg-amber-500 text-white",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");

  useEffect(() => {
    fetchDocuments();
  }, [filterType, filterSource]);

  async function fetchDocuments() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterSource) params.set("source", filterSource);
    try {
      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  function getDocumentUrl(key: string) {
    return `/api/documents/${encodeURIComponent(key)}`;
  }

  const filtered = documents;

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Documents</h1>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white"
          >
            <option value="">All Types</option>
            <option value="INVOICE">Invoice</option>
            <option value="GST_SUMMARY">GST Summary</option>
            <option value="LABEL">Label</option>
            <option value="PACKING_SLIP">Packing Slip</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white"
          >
            <option value="">All Sources</option>
            <option value="ADMIN">Admin</option>
            <option value="STORE">Store (Customer)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          No documents found
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Filename</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Source</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Order Ref</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Created</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[200px]">{d.filename}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${TYPE_COLORS[d.type]}`}>
                        {TYPE_LABELS[d.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${SOURCE_COLORS[d.source]}`}>
                        {SOURCE_LABELS[d.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.orderRef || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(d.createdAt).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <a
                        href={getDocumentUrl(d.key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}