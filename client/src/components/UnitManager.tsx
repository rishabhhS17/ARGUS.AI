import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import io from "socket.io-client";
import { Flame, Stethoscope, Siren, Map as MapIcon } from "lucide-react"; // Removed unused 'Shield', 'Trash2'
import "leaflet/dist/leaflet.css";

// ... (Keep existing Icons: policeIcon, fireIcon, medicalIcon) ...
const policeIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `<div style="background:#3b82f6; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
});
const fireIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `<div style="background:#ef4444; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #ef4444;"></div>`,
});
const medicalIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `<div style="background:#22c55e; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px #22c55e;"></div>`,
});

const socket = io("http://localhost:3001");

// Fix: Added explicit type for Leaflet Mouse Event
function ClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export default function UnitManager() {
  const [units, setUnits] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("POLICE");
  const [unitName, setUnitName] = useState("");

  const getNextName = (type: string, count: number) => {
    const prefix = type === "POLICE" ? "PCR" : type === "FIRE" ? "ENG" : "MED";
    return `${prefix}-${100 + count + 1}`;
  };

  useEffect(() => {
    fetch("http://localhost:3001/api/data")
      .then((res) => res.json())
      .then((data) => setUnits(data.units));
    socket.on("units_updated", (newUnits) => setUnits(newUnits));
    return () => {
      socket.off("units_updated");
    };
  }, []);

  const handleAddUnit = async (lat: number, lng: number) => {
    const name = unitName || getNextName(selectedType, units.length);
    await fetch("http://localhost:3001/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type: selectedType,
        coordinates: [lat, lng],
        status: "IDLE",
      }),
    });
    setUnitName("");
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-200">
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-2xl z-10">
        {/* --- MODIFIED SIDEBAR HEADER --- */}
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <MapIcon className="text-emerald-500" /> RESOURCE MGR
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            STRATEGIC ASSET ALLOCATION
          </p>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 block">
            SELECT UNIT TYPE
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedType("POLICE")}
              className={`p-3 rounded border flex flex-col items-center gap-1 transition ${
                selectedType === "POLICE"
                  ? "bg-blue-900/40 border-blue-500 text-blue-400"
                  : "bg-slate-800 border-slate-700 text-slate-500"
              }`}
            >
              <Siren className="w-5 h-5" />{" "}
              <span className="text-[10px] font-bold">POLICE</span>
            </button>
            <button
              onClick={() => setSelectedType("FIRE")}
              className={`p-3 rounded border flex flex-col items-center gap-1 transition ${
                selectedType === "FIRE"
                  ? "bg-red-900/40 border-red-500 text-red-400"
                  : "bg-slate-800 border-slate-700 text-slate-500"
              }`}
            >
              <Flame className="w-5 h-5" />{" "}
              <span className="text-[10px] font-bold">FIRE</span>
            </button>
            <button
              onClick={() => setSelectedType("MEDICAL")}
              className={`p-3 rounded border flex flex-col items-center gap-1 transition ${
                selectedType === "MEDICAL"
                  ? "bg-green-900/40 border-green-500 text-green-400"
                  : "bg-slate-800 border-slate-700 text-slate-500"
              }`}
            >
              <Stethoscope className="w-5 h-5" />{" "}
              <span className="text-[10px] font-bold">MEDIC</span>
            </button>
          </div>

          <label className="text-xs font-bold text-slate-400 block">
            UNIT ID (OPTIONAL)
          </label>
          <input
            type="text"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            placeholder={getNextName(selectedType, units.length)}
            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-white focus:border-cyan-500 outline-none"
          />

          <div className="bg-emerald-900/20 border border-emerald-900/50 p-4 rounded text-center">
            <p className="text-emerald-400 text-xs font-bold">
              TAP MAP TO DEPLOY
            </p>
            <p className="text-slate-500 text-[10px] mt-1">
              Coordinates will be logged automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative cursor-crosshair">
        <MapContainer
          center={[28.6139, 77.209]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap"
          />
          <ClickHandler onMapClick={handleAddUnit} />
          {units.map((unit) => (
            <Marker
              key={unit._id}
              position={unit.coordinates}
              icon={
                unit.type === "FIRE"
                  ? fireIcon
                  : unit.type === "MEDICAL"
                  ? medicalIcon
                  : policeIcon
              }
            >
              <Popup>
                <strong className="text-slate-800">{unit.name}</strong>
                <br />
                <span className="text-slate-600">{unit.type}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="absolute top-4 right-4 bg-slate-900/80 p-3 rounded border border-slate-700 pointer-events-none">
          <div className="text-xs font-bold text-slate-400">TOTAL UNITS</div>
          <div className="text-2xl font-bold text-white">{units.length}</div>
        </div>
      </div>
    </div>
  );
}
