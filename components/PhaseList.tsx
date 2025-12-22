import React from 'react';

export type PhaseId = 'foundation' | 'calibration' | 'ready' | 'gameplay';

export interface PhaseDescriptor {
  id: PhaseId;
  title: string;
  summary: string;
}

interface PhaseListProps {
  phases: PhaseDescriptor[];
  activePhase: PhaseId;
  onSelect: (phase: PhaseId) => void;
}

const statusFor = (phaseId: PhaseId, activePhase: PhaseId, phases: PhaseDescriptor[]) => {
  const order = phases.map(phase => phase.id);
  const activeIndex = order.indexOf(activePhase);
  const index = order.indexOf(phaseId);

  if (index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'pending';
};

const statusClassname = (status: 'done' | 'active' | 'pending') => {
  switch (status) {
    case 'done':
      return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
    case 'active':
      return 'bg-cyan-500/20 text-cyan-100 border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.15)]';
    default:
      return 'bg-slate-800/80 text-slate-200 border-slate-600/60';
  }
};

const PhaseList: React.FC<PhaseListProps> = ({ phases, activePhase, onSelect }) => {
  return (
    <ol className="space-y-3" aria-label="Rebuild phases">
      {phases.map(phase => {
        const status = statusFor(phase.id, activePhase, phases);

        return (
          <li key={phase.id}>
            <button
              type="button"
              onClick={() => onSelect(phase.id)}
              className={`w-full text-left border rounded-lg px-4 py-3 transition ${statusClassname(status)}`}
              aria-current={status === 'active'}
              data-phase-status={status}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{phase.id}</p>
                  <p className="text-lg font-semibold text-white">{phase.title}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                  {status === 'done' && 'Done'}
                  {status === 'active' && 'In Progress'}
                  {status === 'pending' && 'Pending'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-200/80 leading-relaxed">{phase.summary}</p>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default PhaseList;
