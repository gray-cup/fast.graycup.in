"use client";

import { useState } from "react";
import Link from "next/link";

interface TrackingEvent {
  location?: string;
  status?: string;
  time?: string;
  updated?: string;
}

interface ShipmentDetail {
  Status?: string;
  StatusType?: string;
  CurrentLocation?: string;
  ExpectedDeliveryDate?: string;
  EstimatedDeliveryDate?: string;
  UpdateTime?: string;
  Picked?: string;
  Delivered?: string;
  consignee?: string;
  destination?: string;
  origin?: string;
}

interface TrackingInfo {
  ShipmentData?: Array<{ Shipment?: ShipmentDetail }>;
}

function EventRow({ event }: { event: TrackingEvent }) {
  return (
    <div className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-900">{event.status || "Unknown status"}</p>
        {event.location && <p className="text-xs text-gray-500 mt-0.5">{event.location}</p>}
        {event.time && <p className="text-xs text-gray-400 mt-1">{event.time}</p>}
      </div>
    </div>
  );
}

export default function TrackPage() {
  const [awb, setAwb] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackingInfo | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awb.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/track?awb=${encodeURIComponent(awb.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to track");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch tracking info");
    } finally {
      setLoading(false);
    }
  };

  const shipment = data?.ShipmentData?.[0]?.Shipment;
  const status = shipment?.Status || "";
  const isDelivered = shipment?.StatusType?.toUpperCase() === "DL";

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-5">Track Shipment</h1>

          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2 mb-6">
            <input
              type="text"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="AWB number (e.g. DHP1234567890)"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={loading || !awb.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              {loading ? "Tracking…" : "Track"}
            </button>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
          )}

          {data && shipment && (
            <div>
              <div className="bg-stone-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDelivered ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {status || "Transit"}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">AWB</p>
                    <p className="text-xs font-mono font-bold text-gray-900 truncate">{awb}</p>
                  </div>
                  {shipment.CurrentLocation && (
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Current Location</p>
                      <p className="text-xs font-semibold text-gray-900">{shipment.CurrentLocation}</p>
                    </div>
                  )}
                  {shipment.destination && (
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Destination</p>
                      <p className="text-xs font-semibold text-gray-900">{shipment.destination}</p>
                    </div>
                  )}
                  {shipment.ExpectedDeliveryDate && (
                    <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
                      <p className="text-xs text-gray-400 mb-1">Expected Delivery</p>
                      <p className="text-xs font-semibold text-gray-900">{shipment.ExpectedDeliveryDate}</p>
                    </div>
                  )}
                </div>
              </div>

              {shipment.Status && (
                <EventRow event={{ status, location: shipment.CurrentLocation, time: shipment.UpdateTime }} />
              )}
            </div>
          )}

          {searched && !loading && !data && !error && (
            <p className="text-sm text-gray-500">No tracking info found for this AWB number.</p>
          )}
        </div>
      </main>
    </div>
  );
}