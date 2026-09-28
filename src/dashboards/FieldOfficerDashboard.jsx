import { useState } from 'react';
import data from '../data/hazardData.json';
import { useHazard } from '../context/HazardContext';

export default function FieldOfficerDashboard() {
  const { plans, submitValidation, validations } = useHazard();
  const [siteId, setSiteId] = useState('');
  const [water, setWater] = useState('');
  const [dispute, setDispute] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);

  const site = data.candidate_sites.find((s) => s.id === siteId);

  const assignedTo = (id) =>
    Object.keys(plans)
      .filter((vid) => plans[vid].siteId === id)
      .map((vid) => {
        const h = data.habitations.find((x) => x.id === vid);
        return h ? h.name : vid;
      })
      .join(', ');

  const onPhoto = (e) => {
    const f = e.target.files && e.target.files[0];
    setPhoto(f ? URL.createObjectURL(f) : null);
  };

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      submitValidation(siteId, {
        water: water,
        dispute: dispute,
        hasPhoto: !!photo,
        time: new Date().toLocaleTimeString(),
      });
      setLoading(false);
      setSiteId('');
      setWater('');
      setDispute(false);
      setPhoto(null);
      setFileKey((k) => k + 1);
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    }, 1500);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-900">
      <div className="max-w-[400px] mx-auto min-h-full flex flex-col bg-slate-900">
        <div className="flex-1 p-4 space-y-4">
          {/* Mini-map placeholder */}
          <div className="relative h-36 rounded-lg overflow-hidden border border-slate-600 bg-slate-700">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <defs>
                <pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20 0H0V20" fill="none" stroke="#64748b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="200" height="100" fill="url(#g)" />
              <polygon
                points="60,25 140,20 150,70 70,80"
                fill={site ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.25)'}
                stroke={site ? '#22c55e' : '#94a3b8'}
                strokeWidth="2"
              />
            </svg>
            <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Mini-Map: {site ? site.name : 'Select a site'}
            </span>
          </div>

          <h2 className="text-lg font-bold text-white">Ground Validation Form</h2>

          <div className="bg-white rounded-lg p-4 space-y-5 text-slate-900">
            <div>
              <label className="block text-sm font-bold mb-1">Site to Validate</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full border-2 border-slate-900 rounded-lg p-3 text-base bg-white"
              >
                <option value="">Select site...</option>
                {data.candidate_sites.map((s) => {
                  const who = assignedTo(s.id);
                  const done = validations[s.id] ? ' [validated]' : '';
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}{who ? ' (for ' + who + ')' : ''}{done}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Water Availability</label>
              <select
                value={water}
                onChange={(e) => setWater(e.target.value)}
                className="w-full border-2 border-slate-900 rounded-lg p-3 text-base bg-white"
              >
                <option value="">Select...</option>
                <option>Sufficient</option>
                <option>Limited</option>
                <option>None</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Land Dispute Active</span>
              <button
                type="button"
                onClick={() => setDispute(!dispute)}
                className={'w-16 h-9 rounded-full p-1 transition ' + (dispute ? 'bg-red-600' : 'bg-slate-400')}
              >
                <span
                  className={'block w-7 h-7 bg-white rounded-full transition ' + (dispute ? 'translate-x-7' : '')}
                />
              </button>
            </div>

            <div>
              <label className="block w-full text-center bg-blue-700 text-white text-lg font-bold py-6 rounded-lg cursor-pointer">
                Take Ground Photo
                <input
                  key={fileKey}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPhoto}
                  className="hidden"
                />
              </label>
              {photo && (
                <img src={photo} alt="Ground" className="mt-3 w-full h-32 object-cover rounded-lg" />
              )}
            </div>
          </div>
        </div>

        {/* Sticky submit */}
        <div className="sticky bottom-0 p-4 bg-slate-950 border-t border-slate-700">
          <button
            onClick={submit}
            disabled={loading || !water || !siteId}
            className="w-full bg-green-600 disabled:bg-slate-600 text-white text-lg font-bold py-4 rounded-lg"
          >
            {loading ? 'Submitting...' : 'Submit Validation'}
          </button>
          {(!water || !siteId) && !loading && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Select a site and water availability to enable submit.
            </p>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-[2000]">
          Validation sent to District Collector
        </div>
      )}
    </div>
  );
}