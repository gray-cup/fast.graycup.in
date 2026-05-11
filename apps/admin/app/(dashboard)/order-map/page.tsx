"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const StateMap = dynamic(() => import("./StateMapClient"), { ssr: false });

type StateCount = {
  state: string;
  total_count: number;
  successful_count: number;
  expired_count: number;
  manual_count: number;
};

export default function OrderMapPage() {
  const [states, setStates] = useState<StateCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/order-map")
      .then((r) => r.json())
      .then((data) => { setStates(data); setLoading(false); })
      .catch(() => { setError("Failed to load map data"); setLoading(false); });
  }, []);

  const totalOrders = states.reduce((s, r) => s + r.total_count, 0);
  const totalStates = states.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Order Map</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalOrders} orders across {totalStates} state{totalStates !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <span className="text-sm text-gray-400">Loading map…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <span className="text-sm text-red-500">{error}</span>
          </div>
        )}
        {!loading && !error && <StateMap states={states} />}
      </div>
    </div>
  );
}
