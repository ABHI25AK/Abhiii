import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';

export default function AuditTimeline({ plan }) {
  if (!plan) return null;

  const STAGES = [
    { id: 'created', label: 'Plan Created', time: plan.createdAt },
    { id: 'assigned', label: 'Field Officer Assigned', time: plan.createdAt }, // Usually immediate
    { id: 'validated', label: 'Field Validated', time: plan.fieldHabitationValidation === 'Validated' ? plan.updatedAt : null },
    { id: 'approved', label: 'Collector Approved', time: plan.collectorApprovalStatus === 'Approved' ? plan.updatedAt : null },
    { id: 'progress', label: 'In Progress', time: plan.status === 'Relocation In Progress' || plan.status === 'Completed' ? plan.updatedAt : null },
    { id: 'completed', label: 'Completed', time: plan.status === 'Completed' ? plan.updatedAt : null },
  ];

  // Determine current stage index based on plan status
  let currentStageIndex = 0;
  if (plan.status === 'Revision Required') {
    // We'll handle this separately
  } else if (plan.status === 'Completed') {
    currentStageIndex = 5;
  } else if (plan.status === 'Relocation In Progress') {
    currentStageIndex = 4;
  } else if (plan.collectorApprovalStatus === 'Approved') {
    currentStageIndex = 3;
  } else if (plan.status === 'Pending Collector Approval') {
    currentStageIndex = 2; // Validated
  } else if (plan.status === 'Pending Field Validation') {
    currentStageIndex = 1; // Assigned
  }

  const isRevision = plan.status === 'Revision Required';

  const formatDate = (ds) => {
    if (!ds) return '';
    try {
      return new Date(ds).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch { return ds; }
  };

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-slate-300 mb-4 text-sm border-b border-slate-700 pb-2">Audit Timeline</h3>
      <div className="relative pl-3 space-y-4">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-700"></div>
        
        {STAGES.map((stage, i) => {
          const isDone = i <= currentStageIndex && !isRevision;
          const isCurrent = i === currentStageIndex && !isRevision;
          const isPending = i > currentStageIndex && !isRevision;
          
          let icon = <Circle size={14} className="text-slate-600 bg-slate-800" />;
          let textColor = "text-slate-500";
          let timeText = "";

          if (isDone) {
            icon = <CheckCircle2 size={16} className="text-green-500 bg-slate-800" />;
            textColor = "text-slate-300";
            if (stage.time) timeText = formatDate(stage.time);
          }
          if (isCurrent && !isDone) {
             // actually isDone covers currentStageIndex too.
             // let's distinguish: if it's the exact current stage that we are waiting in?
             // Actually, the current active step might be Pending.
          }
          if (i === currentStageIndex && !isRevision && stage.id !== 'completed') {
             // Waiting for the next step. So the current step is "done" but the process is here.
             // Let's just use the blue dot for the active step if we want to show progress
             icon = <Clock size={16} className="text-blue-400 bg-slate-800" />;
             textColor = "text-blue-400 font-medium";
             timeText = "Current";
          }
          if (isRevision && i === currentStageIndex) {
            icon = <AlertTriangle size={16} className="text-amber-500 bg-slate-800" />;
            textColor = "text-amber-500 font-bold";
            timeText = formatDate(plan.updatedAt);
          }

          // Special override for revision state
          let label = stage.label;
          if (isRevision && i === 2) {
             label = "Revision Required";
             icon = <AlertTriangle size={16} className="text-amber-500 bg-slate-800" />;
             textColor = "text-amber-500 font-bold";
             timeText = formatDate(plan.updatedAt);
          } else if (isRevision && i > 2) {
             icon = <Circle size={14} className="text-slate-600 bg-slate-800" />;
             textColor = "text-slate-500";
             timeText = "";
          }

          return (
            <div key={stage.id} className="relative flex items-start gap-3">
              <div className="relative z-10 flex items-center justify-center w-3 pt-1">
                {icon}
              </div>
              <div className="flex-1">
                <div className={`text-xs ${textColor}`}>{label}</div>
                {timeText && <div className="text-[10px] text-slate-500">{timeText}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
