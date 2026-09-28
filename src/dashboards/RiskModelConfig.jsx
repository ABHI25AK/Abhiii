import React, { useState, useEffect } from 'react';
import { DEFAULT_WEIGHTS } from '../utils/riskScoring';

export default function RiskModelConfig() {
  const [weights, setWeights] = useState(() => {
    try {
      const stored = localStorage.getItem('riskModelWeights');
      return stored ? JSON.parse(stored) : DEFAULT_WEIGHTS;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  });

  const [rainfallScenario, setRainfallScenario] = useState(0);

  useEffect(() => {
    localStorage.setItem('riskModelWeights', JSON.stringify(weights));
    // Trigger custom event so other components know weights changed
    window.dispatchEvent(new Event('weightsChanged'));
  }, [weights]);

  useEffect(() => {
    localStorage.setItem('rainfallScenario', rainfallScenario);
    window.dispatchEvent(new Event('scenarioChanged'));
  }, [rainfallScenario]);

  const hazardSum = weights.landslide + weights.rainfall + weights.flood + weights.historical;
  const finalSum = weights.hazard + weights.exposure + weights.vulnerability + weights.responseGap;

  const hazardValid = Math.abs(hazardSum - 1.0) < 0.01;
  const finalValid = Math.abs(finalSum - 1.0) < 0.01;

  const updateWeight = (key, val) => {
    setWeights(prev => ({ ...prev, [key]: parseFloat(val) }));
  };

  const resetDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
    setRainfallScenario(0);
  };

  return (
    <div className="p-6 bg-slate-900 h-full overflow-y-auto text-slate-200">
      <h2 className="text-2xl font-bold text-white mb-2">Risk Model Configuration</h2>
      <p className="text-sm text-slate-400 mb-6 border-b border-slate-700 pb-4">
        This is an explainable multi-criteria decision-support model. It supports, but does not replace, expert assessment and official approval.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Hazard Weights */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex justify-between">
            <span>Hazard Components</span>
            <span className={hazardValid ? 'text-green-500' : 'text-red-500'}>
              {Math.round(hazardSum * 100)}%
            </span>
          </h3>
          
          <div className="space-y-4">
            {['landslide', 'rainfall', 'flood', 'historical'].map(key => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1 capitalize">
                  <span>{key} Weight</span>
                  <span>{Math.round(weights[key] * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={weights[key]} onChange={(e) => updateWeight(key, e.target.value)} className="w-full" />
              </div>
            ))}
            {!hazardValid && <p className="text-xs text-red-400">Total must equal 100% (currently {Math.round(hazardSum * 100)}%)</p>}
          </div>
        </div>

        {/* Final Risk Weights */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4 flex justify-between">
            <span>Final Score Components</span>
            <span className={finalValid ? 'text-green-500' : 'text-red-500'}>
              {Math.round(finalSum * 100)}%
            </span>
          </h3>
          
          <div className="space-y-4">
            {['hazard', 'exposure', 'vulnerability', 'responseGap'].map(key => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1 capitalize">
                  <span>{key.replace(/([A-Z])/g, ' $1').trim()} Weight</span>
                  <span>{Math.round(weights[key] * 100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={weights[key]} onChange={(e) => updateWeight(key, e.target.value)} className="w-full" />
              </div>
            ))}
            {!finalValid && <p className="text-xs text-red-400">Total must equal 100% (currently {Math.round(finalSum * 100)}%)</p>}
          </div>
        </div>

      </div>

      <div className="mt-8 bg-slate-800 p-4 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Scenario Testing</h3>
        <p className="text-sm text-slate-400 mb-4">Simulate extreme weather conditions to observe impacts on relocation priorities.</p>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Increase rainfall severity by {rainfallScenario}%</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={rainfallScenario} onChange={(e) => setRainfallScenario(Number(e.target.value))} className="w-full max-w-md" />
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <button onClick={resetDefaults} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white">
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
