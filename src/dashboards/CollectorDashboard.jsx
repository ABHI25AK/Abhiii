import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import data from '../data/hazardData.json';
import { useHazard } from '../context/HazardContext';
import { habitations } from '../data/habitations';

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
  const { severity, villages, plans, setPlan, approvePlan: approveLegacy, validations, relocationPlans, updateRelocationPlan, dynamicSites, updateSiteOccupancy } = useHazard();
  const [pending, setPending] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [focus, setFocus] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('triage'); // 'triage' or 'approvals'
  const [toast, setToast] = useState('');

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

  const approveRelocation = (plan) => {
    updateRelocationPlan(plan.id, {
      status: 'Relocation In Progress',
      collectorApprovalStatus: 'Approved',
      collectorApprovalNote: 'Approved by Collector Command'
    });
    updateSiteOccupancy(plan.selectedSiteId, plan.peopleToRelocate);
    setToast(`Plan ${plan.id} Approved`);
    setTimeout(() => setToast(''), 3000);
  };

  const rejectRelocation = (plan) => {
    const reason = prompt("Enter reason for rejection/revision:");
    if (!reason) return;
    updateRelocationPlan(plan.id, {
      status: 'Revision Required',
      collectorApprovalStatus: 'Rejected',
      fieldValidationRemarks: reason
    });
    setToast(`Plan ${plan.id} Returned for Revision`);
    setTimeout(() => setToast(''), 3000);
  };

  const siteIds = Array.from(new Set(Object.values(plans).map((p) => p.siteId)));
  const greenSites = siteIds
    .map((id) => data.candidate_sites.find((s) => s.id === id))
    .filter(Boolean);

  const pendingPlan = pending ? plans[pending.id] : null;
  const activeVillage = villages.find((v) => v.id === activeId);
  const routes = activeVillage && plans[activeId] ? activeVillage.routes : null;

  const pendingApprovals = relocationPlans.filter(p => p.status === 'Pending Collector Approval');

  return (
    <div className="grid grid-cols-[70%_30%] h-full w-full relative">
      {toast && (
        <div className="absolute top-4 right-[31%] bg-green-600 text-white px-4 py-2 rounded shadow-lg z-[2000]">
          {toast}
        </div>
      )}
      
      {/* MAP 70% */}
      <div className="h-full min-h-0 min-w-0 z-0">
        <MapContainer center={[11.52, 76.14]} zoom={12} minZoom={10} maxBounds={BOUNDS} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" className="dark-tiles" />
          <MapHelper focus={focus} />

          {/* Hazard zones */}
          {data.red_zones.map((z) => {
            const c = ZONE_COLOR[z.hazard_type] || '#ef4444';
            return (
              <Polygon key={z.id} positions={z.polygon} pathOptions={{ color: c, weight: 2, dashArray: '4 4', fillColor: c, fillOpacity: 0.2 + severity * 0.35 }}>
                <Tooltip permanent direction="center">{z.hazard_type.toUpperCase()}</Tooltip>
                <Tooltip sticky>{z.name}: {z.hazard_type}. {z.cause}</Tooltip>
              </Polygon>
            );
          })}

          {routes && (
            <>
              <Polyline positions={routes.risky} pathOptions={{ color: '#ef4444', weight: 4, dashArray: '8 8', opacity: 0.9 }}><Tooltip sticky>Risky route: {routes.risky_note}</Tooltip></Polyline>
              <Polyline positions={routes.safe} pathOptions={{ color: '#22c55e', weight: 6, opacity: 0.95 }}><Tooltip sticky>Safest route: avoids all red zones</Tooltip></Polyline>
            </>
          )}

          {villages.map((h) => (
            <CircleMarker key={h.id} center={[h.lat, h.lng]} radius={10} pathOptions={{ color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }}>
              <Tooltip>{h.name}: {h.hazard_type} (risk {h.liveScore}/100)</Tooltip>
            </CircleMarker>
          ))}

          {greenSites.map((s) => (
            <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={12} pathOptions={{ color: '#fff', weight: 2, fillColor: '#22c55e', fillOpacity: 1 }}>
              <Tooltip>{s.name} (Safe Zone)</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* SIDEBAR 30% */}
      <aside className="h-full min-h-0 bg-slate-800 border-l border-slate-700 flex flex-col z-10">
        <div className="flex bg-slate-900 border-b border-slate-700 p-2 gap-2">
          <button 
            onClick={() => setSidebarTab('triage')} 
            className={`flex-1 text-sm font-semibold py-1 rounded ${sidebarTab === 'triage' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Live Operations
          </button>
          <button 
            onClick={() => setSidebarTab('approvals')} 
            className={`flex-1 text-sm font-semibold py-1 rounded flex items-center justify-center gap-2 ${sidebarTab === 'approvals' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Pending Approvals {pendingApprovals.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingApprovals.length}</span>}
          </button>
        </div>

        {sidebarTab === 'triage' ? (
          <>
            <div className="p-3 border-b border-slate-700">
              <h2 className="font-bold text-white">Triage Priority List</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-300">
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-red-500" />Hazard pin</span>
                <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-green-500" />Safe zone</span>
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
                  <div key={v.id} className={'bg-slate-900 rounded-lg p-3 border ' + (activeId === v.id ? 'border-green-500' : 'border-slate-700')}>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-white text-sm">{v.name}</h3>
                      <span className={p.cls + ' text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap'}>{p.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Population: {v.population} | Risk: {v.liveScore}/100</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded ' + (isFlood ? 'bg-blue-600 text-white' : 'bg-red-900 text-red-200')}>{v.hazard_type.toUpperCase()}</span>
                      <span className="text-[11px] text-slate-400">{v.hazard_note}</span>
                    </div>

                    {plan ? (
                      <div className="mt-2 text-xs text-slate-200 space-y-1">
                        <div>Safe zone: <b>{plan.siteName}</b></div>
                        <div>Capacity: <b>{plan.capacity.toFixed(1)} sq m/person</b> <span className={plan.pass ? 'text-green-400' : 'text-red-400'}>{plan.pass ? 'PASS' : 'FAIL'}</span></div>
                        <div className="bg-slate-800 border border-slate-600 rounded p-2 space-y-1">
                          <button onClick={() => showRoute(v)} className="w-full mt-1 bg-slate-700 hover:bg-slate-600 text-white py-1 rounded">Show route on map</button>
                        </div>
                        {check ? (
                          <div className="bg-slate-800 border border-slate-600 rounded p-2">
                            <div className="text-green-400 font-semibold">Ground validated ({check.time})</div>
                            <div>Water: {check.water}</div>
                          </div>
                        ) : (<div className="text-slate-400">Awaiting field validation</div>)}
                        {plan.approved ? (
                          <div className="text-green-400 font-semibold">Plan approved</div>
                        ) : (
                          <button onClick={() => setPending(v)} className="w-full mt-1 bg-green-600 text-white text-xs font-semibold py-2 rounded">Review and Approve</button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => findSafeZone(v)} className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded">Find Safe Zone</button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto">
            {pendingApprovals.length === 0 ? (
              <div className="text-center text-slate-400 mt-10">No plans pending approval.</div>
            ) : (
              pendingApprovals.map(plan => {
                const hab = habitations.find(h => h.id === plan.habitationId);
                const site = dynamicSites.find(s => s.id === plan.selectedSiteId);
                return (
                  <div key={plan.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
                    <h3 className="font-bold text-white text-lg mb-2">{hab?.name} <span className="text-xs bg-red-600 px-2 py-1 rounded ml-2">{plan.category}</span></h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div><span className="text-slate-500">Plan ID:</span> {plan.id}</div>
                      <div><span className="text-slate-500">Risk Score:</span> {plan.priorityScore}</div>
                      <div><span className="text-slate-500">Families:</span> {plan.familiesToRelocate}</div>
                      <div><span className="text-slate-500">People:</span> {plan.peopleToRelocate}</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded mb-3">
                      <div className="font-bold text-slate-200 mb-1">Target Site: {site?.name}</div>
                      <div className={site?.availableCapacity >= plan.peopleToRelocate ? 'text-green-400' : 'text-red-400'}>
                        Available Capacity: {site?.availableCapacity}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded mb-4">
                      <div className="text-green-400 font-bold mb-1">Field Validation: Passed</div>
                      <div className="text-xs italic">Remarks: {plan.fieldValidationRemarks || 'No issues found'}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approveRelocation(plan)} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded">Approve</button>
                      <button onClick={() => rejectRelocation(plan)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded">Reject / Revise</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </aside>

      {/* CONFIRM MODAL (Legacy) */}
      {pendingPlan && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-5 max-w-sm w-full">
            <h3 className="font-bold text-white mb-2">Relocation Plan: {pending.name}</h3>
            <p className="text-sm text-slate-300 mb-4">Hazard: {pending.hazard_type}. Safe zone: {pendingPlan.siteName}. Capacity {pendingPlan.capacity.toFixed(1)} sq m/person.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPending(null)} className="px-3 py-2 text-sm text-slate-300">Close</button>
              <button onClick={() => { approveLegacy(pending.id); setPending(null); }} className="px-3 py-2 text-sm bg-green-600 text-white rounded font-semibold">Approve Relocation Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}