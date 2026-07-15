"use client";

export default function DownloadButton({ orderRef }: { orderRef: string }) {
  return (
    <a
      href={`/api/invoice/${orderRef}`}
      download={`Invoice-${orderRef}.pdf`}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
    >
      Download PDF
    </a>
  );
}
