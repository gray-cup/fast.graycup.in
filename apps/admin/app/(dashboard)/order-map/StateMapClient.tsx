"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

type StateCount = {
  state: string;
  total_count: number;
  successful_count: number;
  expired_count: number;
};

// Authoritative GeoJSON id → display name (provided by user)
const ID_TO_NAME: Record<string, string> = {
  INAN: "Andaman and Nicobar",
  INAP: "Andhra Pradesh",
  INAR: "Arunachal Pradesh",
  INAS: "Assam",
  INBR: "Bihar",
  INCH: "Chandigarh",
  INCT: "Chhattisgarh",
  INDH: "Dadra and Nagar Haveli and Daman and Diu",
  INDL: "Delhi",
  INGA: "Goa",
  INGJ: "Gujarat",
  INHP: "Himachal Pradesh",
  INHR: "Haryana",
  INJH: "Jharkhand",
  INJK: "Jammu and Kashmir",
  INKA: "Karnataka",
  INKL: "Kerala",
  INLA: "Ladakh",
  INLD: "Lakshadweep",
  INMH: "Maharashtra",
  INML: "Meghalaya",
  INMN: "Manipur",
  INMP: "Madhya Pradesh",
  INMZ: "Mizoram",
  INNL: "Nagaland",
  INOR: "Odisha",
  INPB: "Punjab",
  INPY: "Puducherry",
  INRJ: "Rajasthan",
  INSK: "Sikkim",
  INTG: "Telangana",
  INTN: "Tamil Nadu",
  INTR: "Tripura",
  INUP: "Uttar Pradesh",
  INUT: "Uttarakhand",
  INWB: "West Bengal",
};

// Normalize our API state names to match ID_TO_NAME values for lookup.
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

// Pre-build: normalised display name → api data
function buildDataMap(states: StateCount[]) {
  const map = new Map<string, StateCount>();
  // Index by normalised form of each ID_TO_NAME value
  const normToId: Record<string, string> = {};
  for (const [id, name] of Object.entries(ID_TO_NAME)) normToId[norm(name)] = id;

  for (const s of states) {
    const n = norm(s.state);
    // direct match
    if (normToId[n]) { map.set(normToId[n], s); continue; }
    // alias fallback for old names in our data
    const ALIAS: Record<string, string> = {
      "andaman and nicobar islands": "INAN",
      "chattisgarh": "INCT",
      "odisha": "INOR",
      "uttarakhand": "INUT",
      "pondicherry": "INPY",
      "jammu and kashmir": "INJK",
    };
    if (ALIAS[n]) map.set(ALIAS[n], s);
  }
  return map;
}

function choroColor(count: number, max: number): string {
  if (!count || !max) return "#e5e7eb";
  const t = count / max;
  if (t < 0.10) return "#fef9c3";
  if (t < 0.25) return "#fde68a";
  if (t < 0.45) return "#fbbf24";
  if (t < 0.65) return "#f97316";
  if (t < 0.82) return "#ea580c";
  return "#b91c1c";
}

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-opacity": 0.35 } }],
};

export default function StateMapClient({ states }: { states: StateCount[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [82, 22],
      zoom: 4.2,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "220px",
    });

    map.on("load", async () => {
      const geojson: GeoJSON.FeatureCollection = await fetch("/india.geojson").then((r) => r.json());

      const dataById = buildDataMap(states);
      const max = Math.max(0, ...states.map((s) => s.successful_count));

      // Augment features: add order counts + canonical display name via id
      const augmented: GeoJSON.FeatureCollection = {
        ...geojson,
        features: geojson.features.map((f) => {
          const fid = (f.properties as Record<string, string>)?.id ?? "";
          const d = dataById.get(fid);
          return {
            ...f,
            properties: {
              ...f.properties,
              display_name: ID_TO_NAME[fid] ?? (f.properties as Record<string, string>)?.name ?? fid,
              successful_count: d?.successful_count ?? 0,
              expired_count: d?.expired_count ?? 0,
              total_count: d?.total_count ?? 0,
            },
          };
        }),
      };

      const colorSteps: maplibregl.ExpressionSpecification = [
        "step",
        ["get", "successful_count"],
        "#e5e7eb",
        1,                                    "#fef9c3",
        Math.max(1, Math.ceil(max * 0.10)),   "#fde68a",
        Math.max(2, Math.ceil(max * 0.25)),   "#fbbf24",
        Math.max(3, Math.ceil(max * 0.45)),   "#f97316",
        Math.max(4, Math.ceil(max * 0.65)),   "#ea580c",
        Math.max(5, Math.ceil(max * 0.82)),   "#b91c1c",
      ];

      map.addSource("states", { type: "geojson", data: augmented });

      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": colorSteps,
          "fill-opacity": ["case", [">", ["get", "successful_count"], 0], 0.78, 0.15],
        },
      });

      map.addLayer({
        id: "states-border",
        type: "line",
        source: "states",
        paint: { "line-color": "#92400e", "line-width": 0.8, "line-opacity": 0.6 },
      });

      map.addLayer({
        id: "states-hover",
        type: "fill",
        source: "states",
        paint: { "fill-color": "#1e293b", "fill-opacity": 0.1 },
        filter: ["==", ["get", "id"], ""],
      });

      map.on("mousemove", "states-fill", (e) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = "pointer";

        const p = e.features[0].properties as {
          id: string;
          display_name: string;
          successful_count: number;
          expired_count: number;
          total_count: number;
        };

        map.setFilter("states-hover", ["==", ["get", "id"], p.id]);

        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui;padding:2px 0">` +
            `<div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:6px">${p.display_name}</div>` +
            `<div style="font-size:12px;display:flex;flex-direction:column;gap:3px">` +
            `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#6b7280">Successful</span><span style="font-weight:600;color:#16a34a">${p.successful_count}</span></div>` +
            `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:#6b7280">Expired</span><span style="font-weight:600;color:#dc2626">${p.expired_count}</span></div>` +
            `<div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid #e5e7eb;padding-top:4px;margin-top:2px"><span style="color:#6b7280">Total</span><span style="font-weight:600;color:#374151">${p.total_count}</span></div>` +
            `</div></div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "states-fill", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("states-hover", ["==", ["get", "id"], ""]);
        popup.remove();
      });
    });

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [states]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
