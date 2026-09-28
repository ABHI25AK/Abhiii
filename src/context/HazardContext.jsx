import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import data from '../data/hazardData.json';

const DEFAULTS = { rainfall: 50, slope: 50, soil: 50, flood: 50 };

// f = sensitivity to rainfall, slope, soil, flood (0 to 1)
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
  } catch (e) {
    // ignore
  }
}

// state that is saved in the browser and synced between tabs
function usePersisted(key, initial) {
  const [value, setValue] = useState(() => load(key, initial));

  useEffect(() => {
    save(key, value);
  }, [key, value]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key && e.newValue) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (err) {
          // ignore
        }
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
  const [plans, setPlans] = usePersisted('dss_plans', {});
  const [validations, setValidations] = usePersisted('dss_validations', {});

  const setSlider = (key, value) =>
    setSliders((p) => ({ ...p, [key]: value }));
  const resetSliders = () => setSliders(DEFAULTS);

  const setPlan = (villageId, plan) =>
    setPlans((p) => ({ ...p, [villageId]: plan }));
  const approvePlan = (villageId) =>
    setPlans((p) => ({ ...p, [villageId]: { ...p[villageId], approved: true } }));

  const submitValidation = (siteId, result) =>
    setValidations((p) => ({ ...p, [siteId]: result }));

  const resetAll = () => {
    setSliders(DEFAULTS);
    setPlans({});
    setValidations({});
  };

  const severity =
    (sliders.rainfall + sliders.slope + sliders.soil + sliders.flood) / 400;

  // Analyst zones (state level)
  const zones = useMemo(
    () =>
      ZONES.map((z) => {
        const raw =
          (z.f[0] * sliders.rainfall +
            z.f[1] * sliders.slope +
            z.f[2] * sliders.soil +
            z.f[3] * sliders.flood) / 2.5;
        const score = Math.min(100, Math.round(raw));
        return { ...z, score, active: score >= ZONE_THRESHOLD, type: z.f[1] >= z.f[3] ? 'Landslide' : 'Flood' };
      }),
    [sliders]
  );
  const activeCount = zones.filter((z) => z.active).length;

  // Collector villages (live score and tier react to sliders)
  const villages = useMemo(() => {
    const factor = 0.6 + severity * 0.8;
    return data.habitations
      .map((h) => {
        const liveScore = Math.min(100, Math.round(h.priority.priority_score * factor));
        const tier = liveScore >= 75 ? 'Red' : liveScore >= 60 ? 'Yellow' : 'Green';
        return { ...h, liveScore, tier };
      })
      .sort((a, b) => b.liveScore - a.liveScore);
  }, [severity]);

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
      }}
    >
      {children}
    </HazardContext.Provider>
  );
}

export const useHazard = () => useContext(HazardContext);