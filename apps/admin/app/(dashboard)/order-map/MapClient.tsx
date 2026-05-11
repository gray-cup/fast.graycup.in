"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type Pin = {
  pincode: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  order_count: number;
};

export default function MapClient({ pins }: { pins: Pin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;

    let map: import("leaflet").Map;

    (async () => {
      const L = (await import("leaflet")).default;

      // Fix broken default icon URLs when bundled
      // @ts-expect-error – private drizzle field
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current!, {
        center: [22.5, 80.5],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const maxCount = Math.max(...pins.map((p) => p.order_count));

      pins.forEach((pin) => {
        const radius = 4 + Math.sqrt(pin.order_count / maxCount) * 10;
        const circle = L.circleMarker([pin.latitude, pin.longitude], {
          radius,
          color: "#b45309",
          fillColor: "#f59e0b",
          fillOpacity: 0.8,
          weight: 1,
        });

        const label = [pin.city, pin.state].filter(Boolean).join(", ") || pin.pincode;
        circle.bindTooltip(
          `<strong>${pin.pincode}</strong><br>${label}<br>${pin.order_count} order${pin.order_count !== 1 ? "s" : ""}`,
          { sticky: true }
        );

        circle.addTo(map);
      });
    })();

    return () => {
      map?.remove();
    };
  }, [pins]);

  return <div ref={containerRef} className="w-full h-full" />;
}
