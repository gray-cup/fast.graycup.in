"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type StateCount = { state: string; total_count: number; expired_count: number; successful_count: number };

// Normalize state names so our pincode-file names match GeoJSON NAME_1 values.
// GeoJSON source: https://raw.githubusercontent.com/geohacker/india/master/state/india.geojson
const NORMALIZE: Record<string, string> = {
  "andaman & nicobar islands": "andaman and nicobar",
  "chattisgarh": "chhattisgarh",
  "jammu & kashmir": "jammu and kashmir",
  "pondicherry": "puducherry",
  "dadra and nagar haveli and daman and diu": "dadra and nagar haveli",
  "nct of delhi": "delhi",
};

function norm(s: string) {
  const lower = s.toLowerCase().trim();
  return NORMALIZE[lower] ?? lower;
}

function choroColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "#f3f4f6";
  const t = count / max;
  if (t < 0.1) return "#fef9c3";
  if (t < 0.25) return "#fde68a";
  if (t < 0.45) return "#fbbf24";
  if (t < 0.65) return "#f97316";
  if (t < 0.82) return "#ea580c";
  return "#b91c1c";
}

const INDIA_GEOJSON_URL = "/india.geojson";

export default function StateMapClient({ states }: { states: StateCount[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: import("leaflet").Map;

    (async () => {
      const L = (await import("leaflet")).default;
      const geojson = await fetch(INDIA_GEOJSON_URL).then((r) => r.json());

      const dataByState = new Map<string, StateCount>();
      states.forEach((s) => dataByState.set(norm(s.state), s));
      const max = Math.max(0, ...states.map((s) => s.successful_count));

      map = L.map(containerRef.current!, {
        center: [22.5, 80.5],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        opacity: 0.4,
      }).addTo(map);

      L.geoJSON(geojson, {
        style(feature) {
          const name = norm(feature?.properties?.NAME_1 ?? "");
          const d = dataByState.get(name);
          const count = d?.successful_count ?? 0;
          return {
            fillColor: choroColor(count, max),
            fillOpacity: count > 0 ? 0.75 : 0.2,
            color: "#92400e",
            weight: 1,
          };
        },
        onEachFeature(feature, layer) {
          const rawName: string = feature?.properties?.NAME_1 ?? "";
          const d = dataByState.get(norm(rawName));
          const successful = d?.successful_count ?? 0;
          const expired = d?.expired_count ?? 0;
          layer.bindTooltip(
            `<strong>${rawName}</strong>` +
            `<br>Successful: ${successful}` +
            `<br>Expired: ${expired}`,
            { sticky: true }
          );
        },
      }).addTo(map);

      // Legend
      const legend = new L.Control({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", "");
        div.style.cssText =
          "background:white;padding:10px 14px;border-radius:8px;border:1px solid #e5e7eb;font-size:12px;line-height:1.8";
        const steps = [
          { color: "#f3f4f6", label: "No orders" },
          { color: "#fde68a", label: "Low" },
          { color: "#fbbf24", label: "Medium" },
          { color: "#f97316", label: "High" },
          { color: "#b91c1c", label: "Highest" },
        ];
        div.innerHTML = steps
          .map(
            (s) =>
              `<div style="display:flex;align-items:center;gap:8px">` +
              `<span style="width:14px;height:14px;border-radius:3px;background:${s.color};display:inline-block;border:1px solid #d1d5db"></span>` +
              `${s.label}</div>`
          )
          .join("");
        return div;
      };
      legend.addTo(map);
    })();

    return () => { map?.remove(); };
  }, [states]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
