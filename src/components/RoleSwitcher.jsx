import React from 'react';
import { ROLES } from '../constants';

const LABELS = {
  [ROLES.COLLECTOR]: 'District Collector',
  [ROLES.ANALYST]: 'GIS Analyst',
  [ROLES.FIELD]: 'Field Officer',
};

export default function RoleSwitcher({ currentRole, onRoleChange }) {
  return (
    <select
      id="role"
      value={currentRole}
      onChange={(e) => onRoleChange(e.target.value)}
      className="bg-slate-800 text-white text-sm border border-slate-600 rounded px-2 py-1"
    >
      {Object.values(ROLES).map((r) => (
        <option key={r} value={r}>{LABELS[r]}</option>
      ))}
    </select>
  );
}