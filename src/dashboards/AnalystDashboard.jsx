import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useHazard } from '../context/HazardContext';

const SLIDERS = [
  { key: 'rainfall', label: 'Rainfall Intensity' },
  { key: 'slope', label: 'Slope Vulnerability' },
  { key: 'soil', label: 'Soil Saturation' },
  { key: 'flood', label: 'Historical Flood Weight' },
];

function FixMap() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function Metric({ label, value, color }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
      <div className="text-[11px] text-slate-400 uppercase">{label}</div>
      <div className={'font-bold ' + color}>{value}</div>
    </div>
  );
}

export default function AnalystDashboard() {
  const {
    sliders, setSlider, resetSliders, resetAll,
    zones, activeCount, approvedCount, validationCount,
  } = useHazard();

  return (
    <div className="grid grid-cols-[25%_75%] h-full w-full">
      {/* LEFT 25% */}
      <aside className="h-full min-h-0 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h2 className="font-bold text-white">Algorithm Calibration</h2>
          <p className="text-xs text-slate-400 mt-1">Changes reach the Collector view instantly.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {SLIDERS.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-sm text-slate-200 mb-1">
                <span>{s.label}</span>
                <span className="font-bold text-blue-400">{sliders[s.key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliders[s.key]}
                onChange={(e) => setSlider(s.key, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
          <button
            onClick={resetSliders}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded"
          >
            Reset sliders
          </button>
          <button
            onClick={resetAll}
            className="w-full bg-red-800 hover:bg-red-700 text-white text-sm py-2 rounded"
          >
            Reset entire demo
          </button>
        </div>
      </aside>

      {/* RIGHT 75% */}
      <div className="h-full min-h-0 min-w-0 flex flex-col">
        <div className="flex-none flex flex-wrap gap-3 p-3 bg-slate-900 border-b border-slate-700">
          <Metric label="IMD API" value="Online" color="text-green-400" />
          <Metric label="Model Accuracy" value="94%" color="text-blue-400" />
          <Metric label="Active Red Zones" value={activeCount} color="text-red-400" />
          <Metric label="Plans Approved" value={approvedCount} color="text-green-400" />
          <Metric label="Field Validations" value={validationCount} color="text-amber-400" />
        </div>
        <div className="flex-1 min-h-0">
          <MapContainer
            center={[10.4, 76.4]}
            zoom={7}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              className="dark-tiles"
            />
            <FixMap />
            {zones.map((z) => {
  const c = z.type === 'Flood' ? '#3b82f6' : '#ef4444';
  return (
    <Circle
      key={z.id}
      center={[z.lat, z.lng]}
      radius={6000 + z.score * 600}
      pathOptions={{
        color: z.active ? c : '#94a3b8',
        weight: 1,
        fillColor: z.active ? c : '#94a3b8',
        fillOpacity: z.active ? 0.15 + z.score / 250 : 0.08,
      }}
    >
      <Tooltip>
        {z.name}: {z.type} risk {z.score}/100 {z.active ? '(RED ZONE)' : ''}
      </Tooltip>
    </Circle>
  );
})}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}