import React, { useState } from 'react';
import { useHazard } from '../context/HazardContext';
import { habitations } from '../data/habitations';
import { relocationSites } from '../data/relocationSites';

export default function FieldValidation() {
  const { relocationPlans, updateRelocationPlan } = useHazard();
  
  const assignedPlans = relocationPlans.filter(p => p.assignedFieldOfficerId === 'FO-001' && ['Pending Field Validation', 'Relocation In Progress'].includes(p.status));

  const [activePlan, setActivePlan] = useState(null);
  const [tab, setTab] = useState('habitation');
  const [toast, setToast] = useState('');
  
  // Habitation form state
  const [habData, setHabData] = useState({ risk: '', signs: '', road: '', evacuation: '', hh: '', pop: '', elderly: '', children: '', disability: '', readiness: '', immediate: '', remarks: '' });
  
  // Site form state
  const [siteData, setSiteData] = useState({ reachable: '', road: '', shelter: '', water: '', sanitation: '', electricity: '', health: '', physical: '', community: '', capacity: '', remarks: '' });

  const validateAndSend = () => {
    // Basic checks
    if (!habData.risk || !siteData.reachable) {
      alert("Please complete both forms."); return;
    }
    
    // Auto-check rules
    if (siteData.physical === 'No' || siteData.reachable === 'No' || siteData.water === 'No' || siteData.sanitation === 'No' || habData.evacuation === 'Unsafe') {
      alert("Cannot validate. Critical issues found. Please 'Return for Revision'.");
      return;
    }

    updateRelocationPlan(activePlan.id, {
      status: 'Pending Collector Approval',
      fieldHabitationValidation: 'Validated',
      fieldSiteValidation: 'Validated',
      collectorApprovalStatus: 'Awaiting Approval',
      fieldValidationRemarks: habData.remarks + " | " + siteData.remarks,
    });
    
    setToast('Sent to Collector Approval!');
    setTimeout(() => setToast(''), 3000);
    setActivePlan(null);
  };

  const returnForRevision = () => {
    const reason = prompt("Enter reason for revision (e.g. Site unsafe, Road blocked):");
    if (!reason) return;

    updateRelocationPlan(activePlan.id, {
      status: 'Revision Required',
      fieldValidationRemarks: reason
    });
    
    setToast('Returned for Revision!');
    setTimeout(() => setToast(''), 3000);
    setActivePlan(null);
  };

  const markCompleted = () => {
    updateRelocationPlan(activePlan.id, {
      status: 'Completed',
    });
    setToast('Relocation Marked Completed!');
    setTimeout(() => setToast(''), 3000);
    setActivePlan(null);
  };

  if (activePlan) {
    const hab = habitations.find(h => h.id === activePlan.habitationId);
    const site = relocationSites.find(s => s.id === activePlan.selectedSiteId);
    
    if (activePlan.status === 'Relocation In Progress') {
      return (
        <div className="p-4 bg-slate-900 text-slate-200 h-full overflow-y-auto">
          <button onClick={() => setActivePlan(null)} className="mb-4 text-blue-400 font-bold">&larr; Back</button>
          <h2 className="text-xl font-bold mb-4">Complete Relocation</h2>
          <div className="bg-slate-800 p-4 rounded mb-4">
            <div>Plan: {activePlan.id}</div>
            <div>Habitation: {hab?.name}</div>
            <div>Site: {site?.name}</div>
          </div>
          <button onClick={markCompleted} className="w-full bg-green-600 py-3 rounded text-white font-bold text-lg">Mark Relocation Completed</button>
        </div>
      );
    }

    return (
      <div className="h-full w-full overflow-y-auto bg-slate-900 text-slate-200 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <button onClick={() => setActivePlan(null)} className="text-blue-400 font-bold text-sm mb-2">&larr; Back to List</button>
          <div className="bg-slate-800 p-3 rounded text-sm mb-4 border border-slate-700">
            <div className="font-bold text-white text-base">{activePlan.id}</div>
            <div><span className="text-slate-400">Habitation:</span> {hab?.name}</div>
            <div><span className="text-slate-400">Site:</span> {site?.name}</div>
            <div><span className="text-slate-400">People:</span> {activePlan.peopleToRelocate}</div>
          </div>

          <div className="flex bg-slate-800 rounded-lg p-1">
            <button onClick={() => setTab('habitation')} className={`flex-1 py-2 text-sm font-bold rounded-md ${tab === 'habitation' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Habitation</button>
            <button onClick={() => setTab('site')} className={`flex-1 py-2 text-sm font-bold rounded-md ${tab === 'site' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Safe Site</button>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
            {tab === 'habitation' ? (
              <>
                <Select label="Hazard level observed" val={habData.risk} onChange={v => setHabData({...habData, risk: v})} options={['Low','Medium','High','Critical']} />
                <Select label="Landslide / flood condition" val={habData.signs} onChange={v => setHabData({...habData, signs: v})} options={['Active movement','Minor cracks','No signs']} />
                <Select label="Road accessibility" val={habData.road} onChange={v => setHabData({...habData, road: v})} options={['Accessible','Partially blocked','Blocked']} />
                <Select label="Evacuation route" val={habData.evacuation} onChange={v => setHabData({...habData, evacuation: v})} options={['Safe','Restricted','Unsafe']} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Actual HH" val={habData.hh} onChange={v => setHabData({...habData, hh: v})} />
                  <Input label="Actual Pop" val={habData.pop} onChange={v => setHabData({...habData, pop: v})} />
                  <Input label="Elderly" val={habData.elderly} onChange={v => setHabData({...habData, elderly: v})} />
                  <Input label="Children" val={habData.children} onChange={v => setHabData({...habData, children: v})} />
                </div>
                <Select label="Family readiness" val={habData.readiness} onChange={v => setHabData({...habData, readiness: v})} options={['Ready','Needs support','Refused','Not available']} />
                <Input label="Remarks" val={habData.remarks} onChange={v => setHabData({...habData, remarks: v})} isTextarea />
              </>
            ) : (
              <>
                <Select label="Site reachable" val={siteData.reachable} onChange={v => setSiteData({...siteData, reachable: v})} options={['Yes','No']} />
                <Select label="Road suitable for transport" val={siteData.road} onChange={v => setSiteData({...siteData, road: v})} options={['Yes','No']} />
                <Select label="Land/shelter ready" val={siteData.shelter} onChange={v => setSiteData({...siteData, shelter: v})} options={['Yes','No']} />
                <Select label="Water available" val={siteData.water} onChange={v => setSiteData({...siteData, water: v})} options={['Yes','No']} />
                <Select label="Sanitation functional" val={siteData.sanitation} onChange={v => setSiteData({...siteData, sanitation: v})} options={['Yes','No']} />
                <Select label="Site physically safe" val={siteData.physical} onChange={v => setSiteData({...siteData, physical: v})} options={['Yes','No']} />
                <Input label="Remarks" val={siteData.remarks} onChange={v => setSiteData({...siteData, remarks: v})} isTextarea />
              </>
            )}
            
            <div className="pt-4 border-t border-slate-700 flex flex-col gap-3">
              <button onClick={validateAndSend} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded text-white font-bold">Validate and Send to Collector</button>
              <button onClick={returnForRevision} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded text-white font-bold">Return for Revision</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-900 text-slate-200">
      <div className="p-4 border-b border-slate-800 bg-slate-950">
        <h2 className="text-xl font-bold text-white">My Assigned Validations</h2>
      </div>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        {assignedPlans.length === 0 ? (
          <div className="text-slate-500 text-center py-10">No pending validations.</div>
        ) : (
          assignedPlans.map(plan => {
            const hab = habitations.find(h => h.id === plan.habitationId);
            const site = relocationSites.find(s => s.id === plan.selectedSiteId);
            return (
              <div key={plan.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg">{hab?.name}</h3>
                  <span className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded">{plan.status}</span>
                </div>
                <div className="text-sm space-y-1 mb-4 text-slate-300">
                  <div><span className="text-slate-500">Plan ID:</span> {plan.id}</div>
                  <div><span className="text-slate-500">Site:</span> {site?.name}</div>
                  <div><span className="text-slate-500">Families:</span> {plan.familiesToRelocate} ({plan.peopleToRelocate} people)</div>
                </div>
                <button 
                  onClick={() => setActivePlan(plan)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded"
                >
                  {plan.status === 'Relocation In Progress' ? 'Complete Relocation' : 'Start Ground Validation'}
                </button>
              </div>
            );
          })
        )}
      </div>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-xl z-[2000]">
          {toast}
        </div>
      )}
    </div>
  );
}

function Select({ label, val, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{label}</label>
      <select value={val} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Input({ label, val, onChange, isTextarea }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{label}</label>
      {isTextarea ? (
        <textarea value={val} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white h-20"></textarea>
      ) : (
        <input type="text" value={val} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" />
      )}
    </div>
  );
}
