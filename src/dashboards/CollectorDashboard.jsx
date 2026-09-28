import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import data from '../data/hazardData.json';
import { useHazard } from '../context/HazardContext';

const BOUNDS = [[11.3, 75.8], [12.0, 76.6]];
const THRESHOLD = 50;

const PRIORITY = {
  Red: { label: 'Immediate', cls: 'bg-red-600' },
  Yellow: { label: 'Short-term', cls: 'bg-amber-500' },
  Green: { label: 'Medium-term', cls: 'bg-emerald-600' },
};

const ZONE_COLOR = { Landslide: '#ef4444', Flood: '#3b82f6' };

function MapHelper({ focus }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    if (focus) map.flyToBounds(focus, { padding: [50, 50], duration: 1.2 });
  }, [focus, map]);
  return null;
}

export default function CollectorDashboard() {
  const { severity, villages, plans, setPlan, approvePlan, validations } = useHazard();
  const [pending, setPending] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [focus, setFocus] = useState(null);

  const showRoute = (v) => {
    setActiveId(v.id);
    setFocus([...v.routes.safe, ...v.routes.risky]);
  };

  const findSafeZone = (v) => {
    const rec = v.recommended_sites && v.recommended_sites[0];
    const site =
      data.candidate_sites.find((s) => rec && s.name === rec.site_name) ||
      data.candidate_sites[0];
    const area = site.area_sqm || 20000 + site.suitability.final_score * 300;
    const capacity = area / v.population;
    setPlan(v.id, {
      siteId: site.id,
      siteName: site.name,
      area: area,
      capacity: capacity,
      pass: capacity >= THRESHOLD,
      approved: false,
    });
    showRoute(v);
    setPending(v);
  };

  const siteIds = Array.from(new Set(Object.values(plans).map((p) => p.siteId)));
  const greenSites = siteIds
    .map((id) => data.candidate_sites.find((s) => s.id === id))
    .filter(Boolean);

  const pendingPlan = pending ? plans[pending.id] : null;
  const activeVillage = villages.find((v) => v.id === activeId);
  const routes = activeVillage && plans[activeId] ? activeVillage.routes : null;

  return (
    <div className="grid grid-cols-[70%_30%] h-full w-full">
      {/* MAP 70% */}
      <div className="h-full min-h-0 min-w-0">
        <MapContainer
          center={[11.52, 76.14]}
          zoom={12}
          minZoom={10}
          maxBounds={BOUNDS}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            className="dark-tiles"
          />
          <MapHelper focus={focus} />

          {/* Hazard zones, colored and labelled by type */}
          {data.red_zones.map((z) => {
            const c = ZONE_COLOR[z.hazard_type] || '#ef4444';
            return (
              <Polygon
                key={z.id}
                positions={z.polygon}
                pathOptions={{
                  color: c,
                  weight: 2,
                  dashArray: '4 4',
                  fillColor: c,
                  fillOpacity: 0.2 + severity * 0.35,
                }}
              >
                <Tooltip permanent direction="center">
                  {z.hazard_type.toUpperCase()}
                </Tooltip>
                <Tooltip sticky>
                  {z.name}: {z.hazard_type}. {z.cause}
                </Tooltip>
              </Polygon>
            );
          })}

          {/* Routes for selected village */}
          {routes && (
            <>
              <Polyline
                positions={routes.risky}
                pathOptions={{ color: '#ef4444', weight: 4, dashArray: '8 8', opacity: 0.9 }}
              >
                <Tooltip sticky>Risky route: {routes.risky_note}</Tooltip>
              </Polyline>
              <Polyline
                positions={routes.safe}
                pathOptions={{ color: '#22c55e', weight: 6, opacity: 0.95 }}
              >
                <Tooltip sticky>Safest route: avoids all red zones</Tooltip>
              </Polyline>
            </>
          )}

          {/* RED pins = hazard */}
          {villages.map((h) => (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={10}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }}
            >
              <Tooltip>{h.name}: {h.hazard_type} (risk {h.liveScore}/100)</Tooltip>
            </CircleMarker>
          ))}

          {/* GREEN pins = safe zones */}
          {greenSites.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={12}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#22c55e', fillOpacity: 1 }}
            >
              <Tooltip>{s.name} (Safe Zone)</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* SIDEBAR 30% */}
      <aside className="h-full min-h-0 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h2 className="font-bold text-white">Triage Priority List</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-300">
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-red-500" />Hazard pin</span>
            <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-green-500" />Safe zone</span>
            <span className="flex items-center gap-1"><i className="w-3 h-2 bg-red-500/60 border border-red-500" />Landslide zone</span>
            <span className="flex items-center gap-1"><i className="w-3 h-2 bg-blue-500/60 border border-blue-500" />Flood zone</span>
            <span className="flex items-center gap-1"><i className="w-4 h-[3px] bg-green-500" />Safest route</span>
            <span className="flex items-center gap-1"><i className="w-4 border-t-2 border-dashed border-red-500" />Risky route</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {villages.map((v) => {
            const p = PRIORITY[v.tier];
            const plan = plans[v.id];
            const check = plan ? validations[plan.siteId] : null;
            const isFlood = v.hazard_type.indexOf('Flood') >= 0 && v.hazard_type.indexOf('Landslide') < 0;
            return (
              <div
                key={v.id}
                className={
                  'bg-slate-900 rounded-lg p-3 border ' +
                  (activeId === v.id ? 'border-green-500' : 'border-slate-700')
                }
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-white text-sm">{v.name}</h3>
                  <span className={p.cls + ' text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap'}>
                    {p.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Population: {v.population} · Risk: {v.liveScore}/100
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      'text-[10px] font-bold px-2 py-0.5 rounded ' +
                      (isFlood ? 'bg-blue-600 text-white' : 'bg-red-900 text-red-200')
                    }
                  >
                    {v.hazard_type.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400">{v.hazard_note}</span>
                </div>

                {plan ? (
                  <div className="mt-2 text-xs text-slate-200 space-y-1">
                    <div>Safe zone: <b>{plan.siteName}</b></div>
                    <div>Area: {Math.round(plan.area).toLocaleString()} sq m</div>
                    <div>
                      Capacity: <b>{plan.capacity.toFixed(1)} sq m/person</b>{' '}
                      <span className={plan.pass ? 'text-green-400' : 'text-red-400'}>
                        {plan.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    <div className="bg-slate-800 border border-slate-600 rounded p-2 space-y-1">
                      <div className="text-green-400 font-semibold">
                        Safest: {v.routes.safe_km} km · {v.routes.safe_min} min
                      </div>
                      <div className="text-slate-400">Avoids all red zones</div>
                      <div className="text-red-400">
                        Risky: {v.routes.risky_km} km · {v.routes.risky_min} min
                      </div>
                      <div className="text-slate-400">{v.routes.risky_note}</div>
                      <button
                        onClick={() => showRoute(v)}
                        className="w-full mt-1 bg-slate-700 hover:bg-slate-600 text-white py-1 rounded"
                      >
                        Show route on map
                      </button>
                    </div>

                    {check ? (
                      <div className="bg-slate-800 border border-slate-600 rounded p-2">
                        <div className="text-green-400 font-semibold">Ground validated ({check.time})</div>
                        <div>Water: {check.water}</div>
                        {check.dispute && (
                          <div className="text-amber-400 font-semibold">Land dispute reported. Review needed.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400">Awaiting field validation</div>
                    )}

                    {plan.approved ? (
                      <div className="text-green-400 font-semibold">Plan approved</div>
                    ) : (
                      <button
                        onClick={() => setPending(v)}
                        className="w-full mt-1 bg-green-600 text-white text-xs font-semibold py-2 rounded"
                      >
                        Review and Approve
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => findSafeZone(v)}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded"
                  >
                    Find Safe Zone
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* CONFIRM MODAL */}
      {pendingPlan && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-5 max-w-sm w-full">
            <h3 className="font-bold text-white mb-2">Relocation Plan: {pending.name}</h3>
            <p className="text-sm text-slate-300 mb-2">
              Hazard: {pending.hazard_type}. Safe zone: {pendingPlan.siteName}. Capacity{' '}
              {pendingPlan.capacity.toFixed(1)} sq m/person ({pendingPlan.pass ? 'PASS' : 'FAIL'}).
            </p>
            <p className="text-sm text-green-400 mb-4">
              Evacuation via safest route: {pending.routes.safe_km} km, {pending.routes.safe_min} min.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPending(null)} className="px-3 py-2 text-sm text-slate-300">
                Close
              </button>
              <button
                onClick={() => { approvePlan(pending.id); setPending(null); }}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded font-semibold"
              >
                Approve Relocation Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}