import React, { useState, useMemo, useEffect } from 'react';
import { habitations } from '../data/habitations';
import { calculateHabitationRisk, DEFAULT_WEIGHTS } from '../utils/riskScoring';
import { calculateSiteSuitabilityAndCapacity } from '../utils/capacityCalculator';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from 'react-leaflet';
import { ShieldAlert, Users, Home, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Download } from 'lucide-react';
import { useHazard } from '../context/HazardContext';
import AuditTimeline from '../components/AuditTimeline';
import 'leaflet/dist/leaflet.css';

export default function RelocationPlanner() {
  const { dynamicSites, relocationPlans, addRelocationPlan, updateRelocationPlan } = useHazard();
  
  const [selectedHab, setSelectedHab] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');

  const [weights, setWeights] = useState(() => {
    try {
      const w = localStorage.getItem('riskModelWeights');
      return w ? JSON.parse(w) : DEFAULT_WEIGHTS;
    } catch { return DEFAULT_WEIGHTS; }
  });
  
  const [rainfallScenario, setRainfallScenario] = useState(() => {
    try {
      return Number(localStorage.getItem('rainfallScenario')) || 0;
    } catch { return 0; }
  });

  useEffect(() => {
    const handleWeights = () => {
      try {
        const w = localStorage.getItem('riskModelWeights');
        if (w) setWeights(JSON.parse(w));
      } catch {}
    };
    const handleScenario = () => {
      try {
        setRainfallScenario(Number(localStorage.getItem('rainfallScenario')) || 0);
      } catch {}
    };
    
    window.addEventListener('weightsChanged', handleWeights);
    window.addEventListener('scenarioChanged', handleScenario);
    window.addEventListener('storage', (e) => {
      if (e.key === 'riskModelWeights') handleWeights();
      if (e.key === 'rainfallScenario') handleScenario();
    });
    
    return () => {
      window.removeEventListener('weightsChanged', handleWeights);
      window.removeEventListener('scenarioChanged', handleScenario);
    };
  }, []);

  const scoredHabitations = useMemo(() => {
    return habitations.map(h => {
      const hCopy = { ...h };
      if (rainfallScenario > 0) {
        hCopy.rainfallScore = Math.min(100, hCopy.rainfallScore * (1 + rainfallScenario / 100));
      }
      return calculateHabitationRisk(hCopy, weights);
    }).sort((a,b) => b.finalRiskScore - a.finalRiskScore);
  }, [weights, rainfallScenario]);
  
  const processedSites = useMemo(() => dynamicSites.map(s => calculateSiteSuitabilityAndCapacity(s)).sort((a,b) => b.suitabilityScore - a.suitabilityScore), [dynamicSites]);

  const highRiskHabs = scoredHabitations.filter(h => h.redZoneCategory === 'Red' || h.redZoneCategory === 'Orange');
  const peopleImmediate = scoredHabitations.filter(h => h.relocationCategory === 'Immediate Relocation').reduce((acc, h) => acc + h.population, 0);
  const totalSafeCapacity = processedSites.reduce((acc, s) => acc + s.finalCapacity, 0);
  const remainingCapacity = processedSites.reduce((acc, s) => acc + s.availableCapacity, 0);

  const getMarkerColor = (cat) => {
    switch(cat) {
      case 'Red': return '#ef4444';
      case 'Orange': return '#f97316';
      case 'Yellow': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getSiteColor = (status) => {
    switch(status) {
      case 'Recommended': return '#22c55e';
      case 'Conditional': return '#f59e0b';
      case 'Temporary Only': return '#9ca3af';
      default: return '#4b5563';
    }
  };

  const submitPlan = () => {
    if (!selectedHab || !selectedSite) return;
    
    const existingPlan = relocationPlans.find(p => p.habitationId === selectedHab.id && p.status === 'Revision Required');
    
    if (existingPlan) {
      updateRelocationPlan(existingPlan.id, {
        selectedSiteId: selectedSite.id,
        category: category || selectedHab.relocationCategory,
        transportRequirement: notes,
        status: 'Pending Field Validation',
        fieldHabitationValidation: 'Pending',
        fieldSiteValidation: 'Pending'
      });
    } else {
      const newPlan = {
        id: `PLAN-${Math.floor(Math.random() * 10000)}`,
        habitationId: selectedHab.id,
        assignedFieldOfficerId: "FO-001",
        selectedSiteId: selectedSite.id,
        familiesToRelocate: selectedHab.households,
        peopleToRelocate: selectedHab.population,
        category: category || selectedHab.relocationCategory,
        priorityScore: Math.round(selectedHab.finalRiskScore),
        status: "Pending Field Validation",
        fieldHabitationValidation: "Pending",
        fieldSiteValidation: "Pending",
        fieldValidationRemarks: "",
        validationPhotos: [],
        collectorApprovalStatus: "Not Submitted",
        collectorApprovalNote: "",
        transportRequirement: notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addRelocationPlan(newPlan);
    }
    
    setPlanModalOpen(false);
    setSelectedHab(null);
    setSelectedSite(null);
    setNotes('');
  };

  const openPlanModal = (hab) => {
    setSelectedHab(hab);
    setCategory(hab.relocationCategory);
    setPlanModalOpen(true);
  };
  
  const exportDistrictBrief = () => {
    const headers = ['Rank', 'Habitation Name', 'Ward', 'Population', 'Risk Score', 'Zone Category', 'Relocation Category', 'Plan Status'];
    const rows = scoredHabitations.map((h, i) => {
      const plan = relocationPlans.find(p => p.habitationId === h.id);
      return [
        i + 1,
        `"${h.name}"`,
        `"${h.ward}"`,
        h.population,
        Math.round(h.finalRiskScore),
        `"${h.redZoneCategory}"`,
        `"${h.relocationCategory}"`,
        plan ? `"${plan.status}"` : '"Unplanned"'
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'District_Relocation_Brief.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const revisions = relocationPlans.filter(p => p.status === 'Revision Required');
  
  const activePlan = selectedHab ? relocationPlans.find(p => p.habitationId === selectedHab.id) : null;

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-200 overflow-y-auto">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Proactive Relocation Planner</h1>
          <p className="text-xs text-slate-400">Identify risk, validate vulnerability, match safe sites, verify carrying capacity, and approve relocation action.</p>
        </div>
        <button onClick={exportDistrictBrief} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors">
          <Download size={16} />
          Export District Brief
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={<ShieldAlert className="text-red-500"/>} title="High-Risk Habitations" value={highRiskHabs.length} />
        <SummaryCard icon={<Users className="text-orange-500"/>} title="People (Immediate)" value={peopleImmediate} />
        <SummaryCard icon={<Home className="text-blue-500"/>} title="Total Safe Capacity" value={totalSafeCapacity} />
        <SummaryCard icon={<CheckCircle2 className="text-green-500"/>} title="Remaining Capacity" value={remainingCapacity} />
      </div>
      
      {revisions.length > 0 && (
        <div className="mx-4 p-4 bg-red-900/40 border border-red-700 rounded-lg">
          <h2 className="text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={18}/> {revisions.length} Plans Require Revision</h2>
          <div className="space-y-2">
            {revisions.map(rev => {
              const hab = scoredHabitations.find(h => h.id === rev.habitationId);
              return (
                <div key={rev.id} className="bg-slate-800 p-3 rounded flex justify-between items-center text-sm">
                  <div>
                    <div className="font-bold">{hab?.name}</div>
                    <div className="text-red-300 text-xs">Reason: {rev.fieldValidationRemarks}</div>
                  </div>
                  <button onClick={() => { setSelectedHab(hab); setSelectedSite(null); }} className="bg-blue-600 px-3 py-1 rounded text-white font-medium hover:bg-blue-500">Edit Plan</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0" style={{ minHeight: '500px' }}>
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col relative z-0">
          <div className="p-3 bg-slate-900 border-b border-slate-700 font-semibold">Interactive GIS Map</div>
          <div className="flex-1">
            <MapContainer center={[11.58, 76.12]} zoom={11} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="dark-tiles" />
              {scoredHabitations.map(h => {
                const isPlanned = relocationPlans.some(p => p.habitationId === h.id && p.status !== 'Revision Required');
                return (
                  <CircleMarker key={h.id} center={[h.latitude, h.longitude]} radius={8} 
                    pathOptions={{ color: isPlanned ? '#3b82f6' : '#fff', weight: 2, fillColor: getMarkerColor(h.redZoneCategory), fillOpacity: 0.9 }}
                    eventHandlers={{ click: () => setSelectedHab(h) }}
                  >
                    <Tooltip>{h.name} - {h.redZoneCategory} Zone {isPlanned && '(Plan Active)'}</Tooltip>
                  </CircleMarker>
                );
              })}
              {processedSites.map(s => (
                <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={10} 
                  pathOptions={{ color: '#000', weight: 2, fillColor: getSiteColor(s.siteStatus), fillOpacity: 1 }}
                  eventHandlers={{ click: () => setSelectedSite(s) }}
                >
                  <Tooltip>{s.name} (Avail: {s.availableCapacity})</Tooltip>
                </CircleMarker>
              ))}
              {selectedHab && selectedSite && (
                <Polyline positions={[[selectedHab.latitude, selectedHab.longitude], [selectedSite.latitude, selectedSite.longitude]]} 
                  pathOptions={{ color: '#3b82f6', dashArray: '5, 5', weight: 3 }} 
                />
              )}
            </MapContainer>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 overflow-y-auto">
          {selectedHab ? (
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-white">{selectedHab.name}</h2>
                <button onClick={() => setSelectedHab(null)} className="text-slate-400 hover:text-white"><XCircle size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><span className="text-slate-400">Ward:</span> {selectedHab.ward}</div>
                <div><span className="text-slate-400">Population:</span> {selectedHab.population} ({selectedHab.households} HH)</div>
                <div><span className="text-slate-400">Risk Score:</span> <span className="font-bold">{Math.round(selectedHab.finalRiskScore)}</span></div>
                <div><span className="text-slate-400">Category:</span> <span className={`font-bold text-${selectedHab.redZoneCategory.toLowerCase()}-500`}>{selectedHab.redZoneCategory}</span></div>
              </div>
              <div className="mb-4">
                <h3 className="font-semibold text-slate-300 mb-2">Why this priority?</h3>
                <p className="text-xs text-slate-400 bg-slate-900 p-3 rounded border border-slate-700">{selectedHab.explanation}</p>
              </div>
              
              <h3 className="font-semibold text-slate-300 mb-2 mt-4">Recommended Safe Sites</h3>
              <div className="space-y-2">
                {processedSites.filter(s => s.availableCapacity >= selectedHab.population).slice(0,3).map(site => (
                  <div key={site.id} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center cursor-pointer hover:border-blue-500" onClick={() => setSelectedSite(site)}>
                    <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-xs text-slate-400">Suitability: {Math.round(site.suitabilityScore)} | Avail: {site.availableCapacity}</div>
                    </div>
                    <span className="text-green-500 text-xs border border-green-500 px-2 py-1 rounded">Select</span>
                  </div>
                ))}
              </div>

              {selectedSite && !activePlan && (
                <button onClick={() => openPlanModal(selectedHab)} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold">
                  Create Relocation Plan
                </button>
              )}
              {selectedSite && activePlan && activePlan.status === 'Revision Required' && (
                <button onClick={() => openPlanModal(selectedHab)} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold">
                  Update Relocation Plan
                </button>
              )}
              
              {activePlan && <AuditTimeline plan={activePlan} />}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Click a habitation marker on the map to view details and plan relocation.
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold text-white mb-4">Habitation Priority List</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-800 text-slate-400">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Habitation</th>
                <th className="p-3">Pop</th>
                <th className="p-3">Risk Score</th>
                <th className="p-3">Zone</th>
                <th className="p-3">Plan Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {scoredHabitations.map((h, i) => {
                const plan = relocationPlans.find(p => p.habitationId === h.id);
                return (
                  <tr key={h.id} className="hover:bg-slate-800/50 cursor-pointer" onClick={() => setSelectedHab(h)}>
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 font-medium">{h.name}</td>
                    <td className="p-3">{h.population}</td>
                    <td className="p-3">{Math.round(h.finalRiskScore)}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: getMarkerColor(h.redZoneCategory) + '33', color: getMarkerColor(h.redZoneCategory) }}>
                        {h.redZoneCategory}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      {plan ? <span className={plan.status.includes('Revision') ? 'text-red-400' : 'text-blue-400'}>{plan.status}</span> : 'Unplanned'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-slate-800 text-center text-xs text-slate-500">
        Prototype decision-support tool. Final relocation decisions require verified data, field assessment, community consultation, and authorization by competent disaster-management authorities.
      </div>

      {planModalOpen && selectedHab && selectedSite && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-lg w-full">
            <h3 className="font-bold text-xl text-white mb-4">Create Relocation Plan</h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-900 p-3 rounded">
                <div className="text-sm text-slate-400">From (Risk Zone)</div>
                <div className="font-bold text-white">{selectedHab.name} ({selectedHab.population} people)</div>
              </div>
              
              <div className="flex justify-center text-slate-500"><ArrowRight /></div>
              
              <div className="bg-slate-900 p-3 rounded">
                <div className="text-sm text-slate-400">To (Safe Site)</div>
                <div className="font-bold text-white">{selectedSite.name}</div>
                <div className={`text-xs mt-1 ${selectedSite.availableCapacity >= selectedHab.population ? 'text-green-400' : 'text-red-400'}`}>
                  Available Capacity: {selectedSite.availableCapacity} 
                  {selectedSite.availableCapacity < selectedHab.population ? ' (Insufficient!)' : ' (Sufficient)'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Relocation Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm">
                  <option value="">{selectedHab.relocationCategory}</option>
                  <option value="Immediate Relocation">Immediate Relocation</option>
                  <option value="Short-Term Relocation">Short-Term Relocation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm h-20" placeholder="Add transport requirements or special needs..."></textarea>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setPlanModalOpen(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white">Cancel</button>
              <button 
                onClick={submitPlan}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold text-white disabled:opacity-50"
                disabled={selectedSite.availableCapacity < selectedHab.population}
              >
                Submit for Field Validation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, title, value }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center gap-4">
      <div className="p-3 bg-slate-900 rounded-full">{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{title}</div>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}
