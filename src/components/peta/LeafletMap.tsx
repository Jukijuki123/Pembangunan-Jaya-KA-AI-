"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  /** popup HTML lengkap (publik: kategori umum; instansi: breakdown) */
  popupHtml: string;
  /** warna marker — null = netral (belum ada laporan) */
  warna: string | null;
  /** ikon Font Awesome di dalam marker */
  iconFa: string;
}

const TILE_GREY =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8edf3"/><text x="50%" y="50%" fill="#94a3b8" font-size="12" text-anchor="middle" dy=".3em">offline</text></svg>'
  );

function markerIcon(warna: string, iconFa: string) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:36px">
      <div style="position:absolute;inset:0 0 6px 0;background:${warna};border-radius:50% 50% 50% 4px;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center">
        <div style="transform:rotate(45deg);color:#fff;font-size:13px"><i class="fa-solid ${iconFa}" aria-hidden="true"></i></div>
      </div>
    </div>`,
    iconSize: [32, 36],
    iconAnchor: [16, 34],
    popupAnchor: [0, -32],
  });
}

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="peta-pin" style="position:relative;width:34px;height:38px">
      <div style="position:absolute;inset:0 0 6px 0;background:#c8102e;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 12px rgba(200,16,46,.5);display:flex;align-items:center;justify-content:center">
        <div style="transform:rotate(45deg);color:#fff;font-size:14px"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></div>
      </div>
    </div>`,
    iconSize: [34, 38],
    iconAnchor: [17, 36],
  });
}

/**
 * Peta Leaflet — polished:
 *  - Tile OSM + placeholder abu-abu saat tile gagal (bukan blank/crash).
 *  - Marker clustering custom (tema PMI) — wajib utk ratusan posko.
 *  - Marker berbentuk pin dengan ikon Font Awesome + bayangan.
 *  - prop pin: marker drop-pin (pulsing) untuk input manual admin.
 */
export default function LeafletMap({
  markers,
  center = [-2.5, 118],
  zoom = 5,
  onMapClick,
  pin = null,
  height = "60vh",
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  pin?: { lat: number; lng: number } | null;
  height?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const pinRef = useRef<L.Marker | null>(null);

  // Init map sekali.
  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = L.map(ref.current, {
      center,
      zoom,
      worldCopyJump: true,
      zoomControl: false,
      minZoom: 4,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      errorTileUrl: TILE_GREY,
      updateWhenIdle: true,
      keepBuffer: 4,
    });
    tiles.addTo(map);

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng));
    }

    return () => {
      map.remove();
      mapRef.current = null;
      groupRef.current = null;
      pinRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Marker cluster — re-render saat data berubah.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (groupRef.current) {
      map.removeLayer(groupRef.current);
      groupRef.current = null;
    }

    const group = L.markerClusterGroup({
      maxClusterRadius: 52,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "",
          html: `<div class="peta-cluster">${cluster.getChildCount()}</div>`,
          iconSize: [42, 42],
        }),
    });

    markers.forEach((m) => {
      const warna = m.warna ?? "#94a3b8";
      const marker = L.marker([m.lat, m.lng], { icon: markerIcon(warna, m.iconFa) });
      marker.bindPopup(m.popupHtml, { maxWidth: 300, minWidth: 220 });
      group.addLayer(marker);
    });

    map.addLayer(group);
    groupRef.current = group;

    return () => {
      if (groupRef.current) {
        map.removeLayer(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [markers]);

  // Drop pin manual.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pinRef.current) {
      map.removeLayer(pinRef.current);
      pinRef.current = null;
    }
    if (pin) {
      pinRef.current = L.marker([pin.lat, pin.lng], { icon: pinIcon(), zIndexOffset: 1000 }).addTo(map);
    }
  }, [pin]);

  return <div ref={ref} style={{ height, width: "100%", zIndex: 0 }} className="rounded-xl border border-slate-200" />;
}
