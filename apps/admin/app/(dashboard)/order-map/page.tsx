"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PincodeMap = dynamic(() => import("./MapClient"), { ssr: false });
const StateMap = dynamic(() => import("./StateMapClient"), { ssr: false });

type Pin = {
  pincode: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  order_count: number;
};

type StateCount = { state: string; total_count: number; expired_count: number; successful_count: number };
type Tab = "pincode" | "state";

export default function OrderMapPage() {
  const [tab, setTab] = useState<Tab>("pincode");
  const [pins, setPins] = useState<Pin[]>([]);
  const [states, setStates] = useState<StateCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/order-map")
      .then((r) => r.json())
      .then((data) => { setPins(data.pins); setStates(data.states); setLoading(false); })
      .catch(() => { setError("Failed to load map data"); setLoading(false); });
  }, []);

  const totalOrders = pins.reduce((s, p) => s + p.order_count, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Order Map</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-0.5">
              {pins.length} pincode{pins.length !== 1 ? "s" : ""} across{" "}
              {states.length} state{states.length !== 1 ? "s" : ""} · {totalOrders} total orders
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(["pincode", "state"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white text-amber-700 shadow-sm border border-amber-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "pincode" ? "By Pincode" : "By State"}
            </button>
          ))}
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <span className="text-sm text-gray-400">Loading map…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <span className="text-sm text-red-500">{error}</span>
          </div>
        )}
        {!loading && !error && (
          // Both maps mounted; only the active one is visible.
          // Keeping both mounted avoids re-initialising Leaflet on tab switch.
          <>
            <div className={`absolute inset-0 ${tab === "pincode" ? "" : "invisible"}`}>
              <PincodeMap pins={pins} />
            </div>
            <div className={`absolute inset-0 ${tab === "state" ? "" : "invisible"}`}>
              <StateMap states={states} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
