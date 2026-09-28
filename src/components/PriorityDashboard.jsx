import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export default function PriorityDashboard({ data }) {
  const [expandedRows, setExpandedRows] = useState({});
  const [filterTier, setFilterTier] = useState('All');

  const toggleRow = (id) => {
    setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
  };

  const filteredHabitations = data.habitations.filter(hab => {
    if (filterTier === 'All') return true;
    return hab.priority.tier === filterTier;
  }).sort((a, b) => b.priority.priority_score - a.priority.priority_score);

  return (
    <div className="w-full h-full p-6 bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Habitation Priority Ranking</h2>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600 font-medium">Filter by Urgency:</span>
            <select 
              className="border border-gray-300 rounded p-2 text-sm bg-white"
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
            >
              <option value="All">All Tiers</option>
              <option value="Red">Red (Immediate)</option>
              <option value="Yellow">Yellow (Short-term)</option>
              <option value="Green">Green (Medium-term)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 text-sm uppercase tracking-wider">
                <th className="p-4 w-10"></th>
                <th className="p-4">Habitation Name</th>
                <th className="p-4">Population</th>
                <th className="p-4">Exposure Score</th>
                <th className="p-4">Priority Score</th>
                <th className="p-4">Urgency Tier</th>
              </tr>
            </thead>
            <tbody>
              {filteredHabitations.map((hab) => (
                <React.Fragment key={hab.id}>
                  <tr 
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandedRows[hab.id] ? 'bg-blue-50/30' : ''}`}
                    onClick={() => toggleRow(hab.id)}
                  >
                    <td className="p-4 text-gray-400">
                      {expandedRows[hab.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </td>
                    <td className="p-4 font-bold text-gray-800">{hab.name}</td>
                    <td className="p-4 text-gray-600">{hab.population}</td>
                    <td className="p-4 text-gray-600">{hab.simulated_hazard_exposure}</td>
                    <td className="p-4 font-bold">{hab.priority.priority_score}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max ${
                        hab.priority.tier === 'Red' ? 'bg-red-100 text-red-700' :
                        hab.priority.tier === 'Yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        <AlertTriangle size={12} />
                        {hab.priority.tier}
                      </span>
                    </td>
                  </tr>
                  
                  {expandedRows[hab.id] && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan="6" className="p-6">
                        <div className="ml-10 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Recommended Relocation Sites</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {hab.recommended_sites.map((rec, idx) => (
                              <div key={idx} className="border border-blue-100 bg-blue-50/50 rounded p-3">
                                <div className="font-bold text-blue-900 mb-1">{idx + 1}. {rec.site_name}</div>
                                <div className="text-xs text-gray-600 mb-2">{rec.distance_km} km distance</div>
                                <div className="flex justify-between items-center text-sm border-t border-blue-100 pt-2">
                                  <span className="text-gray-600">Match Score</span>
                                  <span className="font-bold text-blue-700">{rec.match_score}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {filteredHabitations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No habitations found for the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
