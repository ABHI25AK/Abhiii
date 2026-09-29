import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import data from '../data/hazardData.json';
import { relocationSites as initialSites } from '../data/relocationSites';
import { habitations as newHabitations } from '../data/habitations';
import { calculateHabitationRisk, DEFAULT_WEIGHTS } from '../utils/riskScoring';

const DEFAULTS = { rainfall: 50, slope: 50, soil: 50, flood: 50 };

const ZONES = [
  { id: 'wayanad', name: 'Wayanad', lat: 11.6, lng: 76.1, f: [0.9, 1.0, 0.9, 0.6] },
  { id: 'idukki', name: 'Idukki', lat: 9.85, lng: 76.95, f: [0.95, 1.0, 0.85, 0.5] },
  { id: 'pathanamthitta', name: 'Pathanamthitta', lat: 9.26, lng: 76.78, f: [0.9, 0.6, 0.7, 0.8] },
  { id: 'malappuram', name: 'Malappuram', lat: 11.05, lng: 76.07, f: [0.8, 0.7, 0.7, 0.7] },
  { id: 'kottayam', name: 'Kottayam', lat: 9.59, lng: 76.52, f: [0.8, 0.4, 0.6, 0.9] },
  { id: 'kozhikode', name: 'Kozhikode', lat: 11.25, lng: 75.78, f: [0.7, 0.6, 0.7, 0.6] },
  { id: 'alappuzha', name: 'Alappuzha', lat: 9.49, lng: 76.34, f: [0.8, 0.1, 0.6, 1.0] },
  { id: 'ernakulam', name: 'Ernakulam', lat: 9.98, lng: 76.28, f: [0.7, 0.2, 0.6, 0.7] },
  { id: 'kasaragod', name: 'Kasaragod', lat: 12.5, lng: 75.0, f: [0.6, 0.5, 0.6, 0.3] },
];

const ZONE_THRESHOLD = 60;

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { }
}

function usePersisted(key, initial) {
  const [value, setValue] = useState(() => load(key, initial));
  useEffect(() => {
    save(key, value);
  }, [key, value]);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key && e.newValue) {
        try { setValue(JSON.parse(e.newValue)); } catch (err) { }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);
  return [value, setValue];
}

const HazardContext = createContext(null);

export function HazardProvider({ children }) {
  const [sliders, setSliders] = usePersisted('dss_sliders', DEFAULTS);
  
  // Legacy states
  const [plans, setPlans] = usePersisted('dss_plans', {});
  const [validations, setValidations] = usePersisted('dss_validations', {});
  
  // NEW WORKFLOW STATES
  const [relocationPlans, setRelocationPlans] = usePersisted('dss_relocation_plans', []);
  const [dynamicSites, setDynamicSites] = usePersisted('dss_dynamic_sites', initialSites);
  
  // Bug 2 sync: Read weights/scenario for Collector list consistency
  const [weights, setWeights] = useState(() => load('riskModelWeights', DEFAULT_WEIGHTS));
  const [rainfallScenario, setRainfallScenario] = useState(() => {
    try { return Number(localStorage.getItem('rainfallScenario')) || 0; } catch { return 0; }
  });

  useEffect(() => {
    const handleWeights = () => setWeights(load('riskModelWeights', DEFAULT_WEIGHTS));
    const handleScenario = () => {
      try { setRainfallScenario(Number(localStorage.getItem('rainfallScenario')) || 0); } catch { setRainfallScenario(0); }
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

  const setSlider = (key, value) => setSliders((p) => ({ ...p, [key]: value }));
  const resetSliders = () => setSliders(DEFAULTS);
  
  const setPlan = (villageId, plan) => setPlans((p) => ({ ...p, [villageId]: plan }));
  const approvePlan = (villageId) => setPlans((p) => ({ ...p, [villageId]: { ...p[villageId], approved: true } }));
  const submitValidation = (siteId, result) => setValidations((p) => ({ ...p, [siteId]: result }));

  const addRelocationPlan = (plan) => setRelocationPlans(p => [...p, plan]);
  const updateRelocationPlan = (id, updates) => setRelocationPlans(p => p.map(x => x.id === id ? { ...x, ...updates, updatedAt: new Date().toISOString() } : x));
  const updateSiteOccupancy = (siteId, additionalOccupancy) => {
    setDynamicSites(s => s.map(x => x.id === siteId ? { ...x, occupiedCapacity: x.occupiedCapacity + additionalOccupancy } : x));
  };

  const resetAll = () => {
    setSliders(DEFAULTS);
    setPlans({});
    setValidations({});
    setRelocationPlans([]);
    setDynamicSites(initialSites);
  };

  const severity = (sliders.rainfall + sliders.slope + sliders.soil + sliders.flood) / 400;

  const zones = useMemo(() =>
    ZONES.map((z) => {
      const raw = (z.f[0] * sliders.rainfall + z.f[1] * sliders.slope + z.f[2] * sliders.soil + z.f[3] * sliders.flood) / 2.5;
      const score = Math.min(100, Math.round(raw));
      return { ...z, score, active: score >= ZONE_THRESHOLD, type: z.f[1] >= z.f[3] ? 'Landslide' : 'Flood' };
    }), [sliders]
  );
  
  const activeCount = zones.filter((z) => z.active).length;

  const villages = useMemo(() => {
    // Bug 2 fix: map newHabitations using riskScoring
    return newHabitations.map((h) => {
      const hCopy = { ...h };
      if (rainfallScenario > 0) {
        hCopy.rainfallScore = Math.min(100, hCopy.rainfallScore * (1 + rainfallScenario / 100));
      }
      const scored = calculateHabitationRisk(hCopy, weights);
      
      // Attempt lookup in old data by name for routes and legacy fields
      const legacyMatch = data.habitations.find(old => old.name === h.name);
      
      // Default dummy routes if not found
      const defaultRoutes = {
        safe: [[h.latitude, h.longitude], [h.latitude + 0.05, h.longitude + 0.05]],
        risky: [[h.latitude, h.longitude], [h.latitude - 0.05, h.longitude - 0.05]],
        safe_km: 5.0, safe_min: 15, risky_km: 3.0, risky_min: 8, risky_note: "Default risky route"
      };

      return {
        id: h.id,
        name: h.name,
        lat: h.latitude,
        lng: h.longitude,
        population: h.population,
        tier: scored.redZoneCategory === 'Orange' ? 'Yellow' : scored.redZoneCategory,
        liveScore: Math.round(scored.finalRiskScore),
        hazard_type: h.landslideScore >= h.floodScore ? 'Landslide' : 'Flood',
        hazard_note: legacyMatch ? legacyMatch.hazard_note : scored.explanation,
        routes: legacyMatch ? legacyMatch.routes : defaultRoutes,
        recommended_sites: legacyMatch ? legacyMatch.recommended_sites : []
      };
    }).sort((a, b) => b.liveScore - a.liveScore);
  }, [weights, rainfallScenario]);

  const approvedCount = Object.values(plans).filter((p) => p.approved).length;
  const validationCount = Object.keys(validations).length;

  return (
    <HazardContext.Provider
      value={{
        sliders, setSlider, resetSliders, resetAll, severity,
        zones, activeCount, villages,
        plans, setPlan, approvePlan,
        validations, submitValidation,
        approvedCount, validationCount,
        
        // NEW EXPORTS
        relocationPlans, addRelocationPlan, updateRelocationPlan,
        dynamicSites, updateSiteOccupancy
      }}
    >
      {children}
    </HazardContext.Provider>
  );
}

export const useHazard = () => useContext(HazardContext);