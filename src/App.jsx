import React, { useState, useEffect } from 'react';
import { HazardProvider } from './context/HazardContext';
import RoleSwitcher from './components/RoleSwitcher';
import CollectorDashboard from './dashboards/CollectorDashboard';
import AnalystDashboard from './dashboards/AnalystDashboard';
import FieldOfficerDashboard from './dashboards/FieldOfficerDashboard';
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

export default function App() {
  const [role, setRole] = useState(getSavedRole);

  useEffect(() => {
    try {
      localStorage.setItem('role', role);
    } catch (e) {
      // ignore
    }
  }, [role]);

  return (
    <HazardProvider>
      <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
        <header className="flex-none flex items-center justify-between gap-2 bg-slate-950 px-3 sm:px-4 py-3 border-b border-slate-800 z-50">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
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
          {role === ROLES.COLLECTOR && <CollectorDashboard />}
          {role === ROLES.ANALYST && <AnalystDashboard />}
          {role === ROLES.FIELD && <FieldOfficerDashboard />}
        </main>
      </div>
    </HazardProvider>
  );
}