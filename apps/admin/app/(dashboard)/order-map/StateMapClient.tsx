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

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDataMap(states: StateCount[]) {
  const out = new Map<string, StateCount>();
  const normToId: Record<string, string> = {};
  for (const [id, name] of Object.entries(ID_TO_NAME)) normToId[norm(name)] = id;

  const ALIAS: Record<string, string> = {
    "andaman and nicobar islands": "INAN",
    "chattisgarh": "INCT",
    "odisha": "INOR",
    "uttarakhand": "INUT",
    "pondicherry": "INPY",
    "jammu and kashmir": "INJK",
  };

  for (const s of states) {
    const n = norm(s.state);
    const id = normToId[n] ?? ALIAS[n];
    if (id) out.set(id, s);
  }
  return out;
}

const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#f8fafc" } }],
};

export default function StateMapClient({ states }: { states: StateCount[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: [82, 22],
      zoom: 4,
      attributionControl: false,
    });

    mapRef.current = map;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "240px",
      offset: 12,
    });

    map.on("load", async () => {
      const geojson: GeoJSON.FeatureCollection = await fetch("/india.geojson").then((r) => r.json());

      const dataById = buildDataMap(states);
      const max = Math.max(0, ...states.map((s) => s.successful_count));

      // Give every feature a stable numeric id for feature-state hover
      const augmented: GeoJSON.FeatureCollection = {
        ...geojson,
        features: geojson.features.map((f, i) => {
          const fid = (f.properties as Record<string, string>)?.id ?? "";
          const d = dataById.get(fid);
          return {
            ...f,
            id: i, // numeric feature id required for setFeatureState
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

      map.fitBounds([[68.1, 6.7], [97.4, 37.1]], { padding: 32, duration: 0 });

      map.addSource("states", { type: "geojson", data: augmented, promoteId: "id" });

      // Orange → red color steps (white = no orders)
      const colorSteps: maplibregl.ExpressionSpecification = max === 0
        ? ["literal", "#ffffff"]
        : [
            "step",
            ["get", "successful_count"],
            "#ffffff",                                    // 0  → white
            1,                           "#ffedd5",      // any → lightest orange
            Math.max(2, Math.ceil(max * 0.15)), "#fed7aa",
            Math.max(3, Math.ceil(max * 0.30)), "#fb923c",
            Math.max(4, Math.ceil(max * 0.50)), "#f97316",
            Math.max(5, Math.ceil(max * 0.70)), "#ea580c",
            Math.max(6, Math.ceil(max * 0.88)), "#b91c1c",
          ];

      map.addLayer({
        id: "states-fill",
        type: "fill",
        source: "states",
        paint: {
          "fill-color": colorSteps,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 1,
            ["==", ["get", "successful_count"], 0], 0.6,
            0.85,
          ],
        },
      });

      map.addLayer({
        id: "states-border",
        type: "line",
        source: "states",
        paint: {
          "line-color": "#d1d5db",
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.5, 0.7],
        },
      });

      let hoveredId: number | null = null;

      map.on("mousemove", "states-fill", (e) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = "pointer";

        const feat = e.features[0];
        const newId = feat.id as number;

        if (hoveredId !== null && hoveredId !== newId) {
          map.setFeatureState({ source: "states", id: hoveredId }, { hover: false });
        }
        hoveredId = newId;
        map.setFeatureState({ source: "states", id: hoveredId }, { hover: true });

        const p = feat.properties as {
          display_name: string;
          successful_count: number;
          expired_count: number;
          total_count: number;
        };

        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;padding:2px 0">` +
            `<div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #f3f4f6">${p.display_name}</div>` +
            `<div style="font-size:12px;display:flex;flex-direction:column;gap:4px">` +
            `<div style="display:flex;justify-content:space-between;gap:20px">` +
            `<span style="color:#6b7280">Successful</span><span style="font-weight:600;color:#16a34a">${p.successful_count}</span></div>` +
            `<div style="display:flex;justify-content:space-between;gap:20px">` +
            `<span style="color:#6b7280">Expired</span><span style="font-weight:600;color:#dc2626">${p.expired_count}</span></div>` +
            `<div style="display:flex;justify-content:space-between;gap:20px;margin-top:2px;padding-top:4px;border-top:1px solid #f3f4f6">` +
            `<span style="color:#6b7280">Total</span><span style="font-weight:600;color:#374151">${p.total_count}</span></div>` +
            `</div></div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "states-fill", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredId !== null) {
          map.setFeatureState({ source: "states", id: hoveredId }, { hover: false });
          hoveredId = null;
        }
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
