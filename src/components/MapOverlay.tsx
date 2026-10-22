import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Facility {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  tags?: Record<string, string>;
}

interface MapOverlayProps {
  latitude: number;
  longitude: number;
  queryType: string;
  onClose: () => void;
}

const greenIcon = L.divIcon({
  className: "",
  html: `<div style="background:#10b981;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const facilityIcon = L.divIcon({
  className: "",
  html: `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">📍</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function MapOverlay({ latitude, longitude, queryType, onClose }: MapOverlayProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current).setView([latitude, longitude], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    L.marker([latitude, longitude], { icon: greenIcon })
      .addTo(map)
      .bindPopup("Your location")
      .openPopup();

    mapRef.current = map;

    const radius = 5000;
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
      `[out:json][timeout:25];(node["amenity"~"recycling|waste_disposal"](around:${radius},${latitude},${longitude});node["shop"="charity"](around:${radius},${latitude},${longitude});node["amenity"="recycling_centre"](around:${radius},${latitude},${longitude});node["amenity"="waste_transfer_station"](around:${radius},${latitude},${longitude}););out body 20;`,
    )}`;

    fetch(overpassUrl)
      .then((res) => res.json())
      .then((data) => {
        const results: Facility[] = (data.elements || [])
          .filter((el: { lat?: number; lon?: number }) => el.lat && el.lon)
          .map((el: { id: string | number; lat: number; lon: number; tags?: Record<string, string> }) => {
            const dx = (el.lon - longitude) * 111320 * Math.cos((latitude * Math.PI) / 180);
            const dy = (el.lat - latitude) * 110540;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return {
              id: String(el.id),
              name: el.tags?.name || el.tags?.amenity || "Drop-off facility",
              lat: el.lat,
              lon: el.lon,
              distance: Math.round(distance),
              tags: el.tags,
            };
          })
          .sort((a: Facility, b: Facility) => a.distance - b.distance)
          .slice(0, 15);

        setFacilities(results);

        results.forEach((f) => {
          L.marker([f.lat, f.lon], { icon: facilityIcon })
            .addTo(map)
            .bindPopup(
              `<div style="font-weight:600;font-size:14px;">${f.name}</div><div style="color:#666;font-size:12px;margin-top:4px;">${(f.distance / 1000).toFixed(1)} km away</div>`,
            );
        });

        if (results.length > 0) {
          const bounds = L.latLngBounds([
            [latitude, longitude],
            ...results.map((f) => [f.lat, f.lon] as [number, number]),
          ]);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }

        setLoading(false);
        setTimeout(() => map.invalidateSize(), 100);
      })
      .catch(() => setLoading(false));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, queryType]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nearby Drop-off Locations</h2>
            <p className="text-xs text-gray-500">
              {loading ? "Searching..." : `${facilities.length} facilities found nearby`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={containerRef} className="flex-1 min-h-0" style={{ background: "#e5e7eb" }} />

        {facilities.length > 0 && (
          <div className="max-h-40 overflow-y-auto border-t border-gray-100">
            {facilities.slice(0, 5).map((f) => (
              <div key={f.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{f.name}</p>
                    <p className="text-xs text-gray-500">{(f.distance / 1000).toFixed(1)} km away</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
