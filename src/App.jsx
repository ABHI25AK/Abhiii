import React, { useState, useEffect } from 'react';
import { HazardProvider } from './context/HazardContext';
import RoleSwitcher from './components/RoleSwitcher';
import CollectorDashboard from './dashboards/CollectorDashboard';
import AnalystDashboard from './dashboards/AnalystDashboard';
import FieldOfficerDashboard from './dashboards/FieldOfficerDashboard';
import RelocationPlanner from './pages/RelocationPlanner';
import MapDashboard from './components/MapDashboard';
import PriorityDashboard from './components/PriorityDashboard';
import { getDashboardData } from './services/scoring';
import { ROLES } from './constants';

const SUBTITLES = {
  [ROLES.COLLECTOR]: 'Wayanad District — Operational Triage',
  [ROLES.ANALYST]: 'Kerala State — System Configuration',
  [ROLES.FIELD]: 'Ground Validation',
};

function getSavedRole() {
  try {
    const saved = localStorage.getItem('role');
    return Object.values(ROLES).includes(saved) ? saved : ROLES.COLLECTOR;
  } catch (e) {
    return ROLES.COLLECTOR;
  }
}

function ExplainableView() {
  const [tab, setTab] = useState('map');
  const data = getDashboardData(1.0);
  
  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100">
      <div className="flex bg-slate-950 p-2 gap-2 border-b border-slate-800">
        <button onClick={() => setTab('map')} className={`px-4 py-2 text-sm font-bold rounded ${tab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Map View</button>
        <button onClick={() => setTab('priority')} className={`px-4 py-2 text-sm font-bold rounded ${tab === 'priority' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Priority Table</button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'map' ? <MapDashboard data={data} rainfallMultiplier={1.0} setRainfallMultiplier={()=>{}} /> : <PriorityDashboard data={data} />}
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(getSavedRole);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'planner', 'explainable'

  useEffect(() => {
    try {
      localStorage.setItem('role', role);
      // Reset view when role changes to avoid confusion if a view is role-specific
      if (role !== ROLES.COLLECTOR && role !== ROLES.ANALYST && (currentView === 'planner' || currentView === 'explainable')) {
        setCurrentView('dashboard');
      }
    } catch (e) {
      // ignore
    }
  }, [role, currentView]);

  return (
    <HazardProvider>
      <div className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
        
        {/* GLOBAL SIDEBAR */}
        <aside className="w-16 sm:w-48 bg-slate-950 border-r border-slate-800 flex flex-col items-center sm:items-start py-4 shrink-0">
          <div className="px-2 sm:px-4 mb-8 w-full text-center sm:text-left">
            <h1 className="text-xl font-bold text-white hidden sm:block truncate">DSS</h1>
            <h1 className="text-xl font-bold text-white sm:hidden">DSS</h1>
          </div>
          
          <nav className="w-full flex flex-col gap-2 px-2">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <span className="truncate text-sm font-medium">Live Dashboard</span>
            </button>
            
            {(role === ROLES.COLLECTOR || role === ROLES.ANALYST) && (
              <>
                <button 
                  onClick={() => setCurrentView('planner')}
                  className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${currentView === 'planner' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <span className="truncate text-sm font-medium">Relocation Planner</span>
                </button>
                <button 
                  onClick={() => setCurrentView('explainable')}
                  className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${currentView === 'explainable' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <span className="truncate text-sm font-medium">Explainable Risk View</span>
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex-none flex items-center justify-between gap-2 bg-slate-950 px-4 py-3 border-b border-slate-800 z-50">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white truncate">
                Red Zone Relocation DSS
              </h1>
              <p className="text-xs text-slate-400 truncate">{SUBTITLES[role]}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:block text-xs text-slate-400 uppercase font-bold tracking-wider">
                Current Role
              </span>
              <RoleSwitcher currentRole={role} onRoleChange={setRole} />
            </div>
          </header>

          <main className="flex-1 min-h-0 relative overflow-hidden">
            {currentView === 'planner' ? (
              <RelocationPlanner />
            ) : currentView === 'explainable' ? (
              <ExplainableView />
            ) : (
              <>
                {role === ROLES.COLLECTOR && <CollectorDashboard />}
                {role === ROLES.ANALYST && <AnalystDashboard />}
                {role === ROLES.FIELD && <FieldOfficerDashboard />}
              </>
            )}
          </main>
        </div>
      </div>
    </HazardProvider>
  );
}