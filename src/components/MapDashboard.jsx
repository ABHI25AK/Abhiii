import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Activity, AlertTriangle, MapPin, Users, Droplet, Trees } from 'lucide-react';

const { Overlay } = LayersControl;

export default function MapDashboard({ data, rainfallMultiplier, setRainfallMultiplier }) {
  const [selectedHabitation, setSelectedHabitation] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  
  // Center roughly on Wayanad
  const center = [11.55, 76.1];
  
  const getPriorityColor = (tier) => {
    switch (tier) {
      case 'Red': return '#ef4444';
      case 'Yellow': return '#eab308';
      case 'Green': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity) => {
    if (severity === 'High') return 'rgba(239, 68, 68, 0.4)';
    if (severity === 'Medium') return 'rgba(249, 115, 22, 0.4)';
    return 'rgba(234, 179, 8, 0.4)';
  };

  return (
    <div className="relative w-full h-full flex">
      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <LayersControl position="topright">
            <Overlay checked name="Red Zones (Hazard Areas)">
              <React.Fragment>
                {data.red_zones.map(zone => (
                  <Polygon 
                    key={zone.id}
                    positions={zone.polygon}
                    pathOptions={{ color: 'red', fillColor: getSeverityColor(zone.severity), fillOpacity: 0.5 }}
                  >
                    <Tooltip>{zone.name} ({zone.hazard_type}) - {zone.severity}</Tooltip>
                  </Polygon>
                ))}
              </React.Fragment>
            </Overlay>

            <Overlay checked name="Habitations (Vulnerable)">
              <React.Fragment>
                {data.habitations.map(hab => (
                  <CircleMarker
                    key={hab.id}
                    center={[hab.lat, hab.lng]}
                    radius={8 + (hab.population / 1000) * 2}
                    pathOptions={{ 
                      color: 'white', 
                      weight: 2,
                      fillColor: getPriorityColor(hab.priority.tier), 
                      fillOpacity: 0.9 
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedHabitation(hab);
                        setSelectedSite(null);
                      }
                    }}
                  >
                    <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.8} className="bg-transparent border-none shadow-none text-xs font-bold text-black text-shadow-sm">
                      {hab.name}
                    </Tooltip>
                  </CircleMarker>
                ))}
              </React.Fragment>
            </Overlay>

            <Overlay name="Candidate Relocation Sites">
              <React.Fragment>
                {data.candidate_sites.map(site => (
                  <CircleMarker
                    key={site.id}
                    center={[site.lat, site.lng]}
                    radius={8}
                    pathOptions={{ 
                      color: 'white',
                      weight: 2,
                      fillColor: '#3b82f6', 
                      fillOpacity: 0.9 
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedSite(site);
                        setSelectedHabitation(null);
                      }
                    }}
                  >
                    <Tooltip>{site.name} (Suitability: {site.suitability.final_score})</Tooltip>
                  </CircleMarker>
                ))}
              </React.Fragment>
            </Overlay>
          </LayersControl>
        </MapContainer>
        
        {/* Legend & Info Overlay */}
        <div className="absolute top-4 left-14 z-[400] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-gray-200 pointer-events-none">
          <h4 className="font-bold text-sm mb-2 text-gray-800">Map Legend</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div> Immediate Priority (Red)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div> Short-term Priority (Yellow)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div> Medium-term Priority (Green)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div> Candidate Relocation Site
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
              <div className="w-4 h-3 bg-red-500/40 border border-red-500"></div> High Hazard Zone
            </div>
          </div>
          <div className="mt-3 text-[10px] text-gray-400">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Scenario Slider Overlay */}
        <div className="absolute bottom-6 left-6 z-[400] bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-80">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" />
            Scenario Simulation
          </h3>
          <label className="block text-sm text-gray-600 mb-1">
            Rainfall Intensity Multiplier: {rainfallMultiplier.toFixed(1)}x
          </label>
          <input 
            type="range" 
            min="1.0" max="2.0" step="0.1" 
            value={rainfallMultiplier}
            onChange={(e) => setRainfallMultiplier(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-2">Adjusting this re-calculates hazard exposure scores in real-time.</p>
        </div>
      </div>

      {/* Side Panel for Habitation */}
      {selectedHabitation && (
        <div className="w-96 bg-white shadow-xl border-l border-gray-200 z-10 flex flex-col h-full overflow-y-auto animate-in slide-in-from-right">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">{selectedHabitation.name}</h2>
            <button onClick={() => setSelectedHabitation(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">&times;</button>
          </div>
          <div className="p-4 flex-1">
            <div className="flex gap-4 mb-6">
              <div className="bg-gray-100 p-3 rounded-lg flex-1 text-center">
                <Users size={20} className="mx-auto mb-1 text-gray-600" />
                <div className="text-xs text-gray-500 uppercase">Population</div>
                <div className="font-bold">{selectedHabitation.population}</div>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg flex-1 text-center">
                <AlertTriangle size={20} className={`mx-auto mb-1 ${selectedHabitation.priority.tier === 'Red' ? 'text-red-500' : selectedHabitation.priority.tier === 'Yellow' ? 'text-yellow-500' : 'text-green-500'}`} />
                <div className="text-xs text-gray-500 uppercase">Priority</div>
                <div className="font-bold" style={{ color: getPriorityColor(selectedHabitation.priority.tier) }}>
                  {selectedHabitation.priority.tier}
                </div>
              </div>
            </div>

            <h3 className="font-bold border-b pb-1 mb-3">Hazard Profile</h3>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Exposure Score:</span>
                <span className="font-bold">{selectedHabitation.simulated_hazard_exposure}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Past Events:</span>
                <span className="font-bold">{selectedHabitation.hazard_history}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Priority Score:</span>
                <span className="font-bold">{selectedHabitation.priority.priority_score}/100</span>
              </div>
            </div>

            <h3 className="font-bold border-b pb-1 mb-3 flex items-center gap-2">
              <MapPin size={16} /> Recommended Relocation
            </h3>
            <div className="space-y-4">
              {selectedHabitation.recommended_sites.map((rec, idx) => (
                <div key={idx} className="border border-gray-200 rounded p-3 bg-blue-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-blue-900">{idx + 1}. {rec.site_name}</div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                      {rec.distance_km} km away
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div className="flex justify-between">
                      <span>Match Score:</span>
                      <span className="font-bold">{rec.match_score}/100</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Site Suitability:</span>
                      <span>{rec.suitability_breakdown.final_score}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Side Panel for Candidate Site */}
      {selectedSite && (
        <div className="w-96 bg-white shadow-xl border-l border-gray-200 z-10 flex flex-col h-full overflow-y-auto animate-in slide-in-from-right">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">{selectedSite.name}</h2>
            <button onClick={() => setSelectedSite(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold">&times;</button>
          </div>
          <div className="p-4 flex-1">
            <div className="bg-blue-50 p-4 rounded-lg text-center mb-6 border border-blue-100">
              <div className="text-sm text-blue-800 font-bold uppercase tracking-wider mb-1">Overall Suitability</div>
              <div className="text-4xl font-black text-blue-600">{selectedSite.suitability.final_score}</div>
              <div className="text-xs text-blue-500 mt-1">out of 100</div>
            </div>

            <h3 className="font-bold border-b pb-1 mb-3">Score Breakdown (Explainable AI)</h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="flex items-center gap-1 text-gray-700"><Layers size={14}/> Land Availability</span>
                  <span className="font-bold">+{selectedSite.suitability.breakdown.land_score_contribution}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{width: `${(selectedSite.suitability.breakdown.land_score_contribution / 30)*100}%`}}></div></div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="flex items-center gap-1 text-gray-700"><Droplet size={14}/> Water Access</span>
                  <span className="font-bold">+{selectedSite.suitability.breakdown.water_score_contribution}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${(selectedSite.suitability.breakdown.water_score_contribution / 30)*100}%`}}></div></div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="flex items-center gap-1 text-gray-700"><MapPin size={14}/> Distance to Services</span>
                  <span className="font-bold">+{selectedSite.suitability.breakdown.services_score_contribution}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{width: `${(selectedSite.suitability.breakdown.services_score_contribution / 40)*100}%`}}></div></div>
              </div>
              
              {selectedSite.suitability.breakdown.ecological_penalty > 0 && (
                <div className="bg-red-50 p-3 rounded border border-red-100 mt-4">
                  <div className="flex justify-between text-red-700 font-bold mb-1">
                    <span className="flex items-center gap-1"><Trees size={14}/> Ecological Risk Penalty</span>
                    <span>-{selectedSite.suitability.breakdown.ecological_penalty}</span>
                  </div>
                  <p className="text-xs text-red-600">This site is flagged for being too close to protected forest/wildlife areas, drastically reducing its suitability.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
