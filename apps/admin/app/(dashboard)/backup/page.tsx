"use client";

import { useRef, useState } from "react";
import { DatabaseBackup, Download, Upload, AlertTriangle } from "lucide-react";

function Toast({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {msg}
    </div>
  );
}

export default function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup request failed");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || `graycup-backup-${new Date().toISOString()}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("success", "Backup downloaded");
    } catch {
      showToast("error", "Failed to download backup");
    } finally {
      setDownloading(false);
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPendingFile(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    try {
      const text = await pendingFile.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Restore failed");

      const summary = Object.entries(data.restored as Record<string, number>)
        .map(([table, count]) => `${table}: ${count}`)
        .join(", ");
      showToast("success", `Restore complete — ${summary}`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Invalid backup file");
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="max-w-2xl">
      {toast && <Toast type={toast.type} msg={toast.msg} />}

      <div className="flex items-center gap-3 mb-6">
        <DatabaseBackup size={22} className="text-amber-600" />
        <h1 className="text-xl font-bold text-gray-800">Backup &amp; Restore</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-1">Download backup</h2>
        <p className="text-sm text-gray-500 mb-4">
          Exports orders, coupons, documents, manual invoices, reviews and subscriptions as a single JSON
          file. Pincode reference data is excluded — it can be re-seeded with{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">npm run seed:pincodes</code>.
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Download size={16} strokeWidth={2.5} />
          {downloading ? "Preparing…" : "Download Backup"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-1">Upload backup</h2>
        <p className="text-sm text-gray-500 mb-4">
          Restores from a previously downloaded backup file. This <span className="font-semibold text-red-600">replaces all
          current data</span> in the tables included in the file — existing rows not present in the backup
          will be deleted.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFilePicked}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
          className="flex items-center gap-2 text-sm font-semibold bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Upload size={16} strokeWidth={2.5} />
          Upload Backup
        </button>
      </div>

      {pendingFile && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={22} />
              <div>
                <h3 className="text-sm font-bold text-gray-800">Restore from &quot;{pendingFile.name}&quot;?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently overwrite current data in every table present in this file. This
                  cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingFile(null)}
                disabled={restoring}
                className="text-sm font-semibold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {restoring ? "Restoring…" : "Yes, overwrite data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
