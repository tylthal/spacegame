import React from 'react';
import type { PhaseDescriptor, PhaseId } from './PhaseList';

interface PlaceholderScreenProps {
  phase: PhaseDescriptor;
  onAdvance: () => void;
  onReset: () => void;
  isLastPhase: boolean;
}

const headings: Record<PhaseId, string> = {
  foundation: 'Clean slate established',
  calibration: 'Calibration shell placeholder',
  ready: 'Ready screen placeholder',
  gameplay: 'Gameplay scaffold placeholder',
};

const messages: Record<PhaseId, string> = {
  foundation:
    'Legacy systems, assets, and GPU-heavy modules have been removed. This shell exists to host new work incrementally with test coverage.',
  calibration:
    'Drop in calibration UX here. For now this placeholder confirms that the new stack can swap screens without relying on MediaPipe.',
  ready:
    'Menu/ready state goes here. Use this panel to wire in the future phase manager and menu targets once rebuilt.',
  gameplay:
    'Gameplay loop placeholder. Reintroduce rendering, input processing, and spawning behind the new GameKernel after it exists.',
};

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ phase, onAdvance, onReset, isLastPhase }) => {
  return (
    <div className="border border-cyan-500/30 bg-slate-900/70 rounded-xl p-6 shadow-lg space-y-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">{phase.id}</p>
          <h2 className="text-2xl font-black text-white tracking-tight">{headings[phase.id]}</h2>
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-3 py-1">
          Placeholder
        </span>
      </div>
      <p className="text-base leading-relaxed text-slate-100/90">{messages[phase.id]}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700/70">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300 mb-2">What to build next</h3>
          <p className="text-sm text-slate-100/80 leading-relaxed">{phase.summary}</p>
        </div>
        <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700/70">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300 mb-2">Guardrails</h3>
          <ul className="list-disc list-inside text-sm text-slate-100/80 space-y-1">
            <li>No MediaPipe/Three.js hooks remain in this shell.</li>
            <li>Legacy scene/assets stay quarantined until rebuilt behind tests.</li>
            <li>Each screen stays swappable without global singletons.</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAdvance}
          className="px-4 py-2 rounded-md bg-cyan-500 text-slate-950 font-bold uppercase tracking-[0.25em] text-xs shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:bg-cyan-400 transition"
        >
          {isLastPhase ? 'Loop back to foundation' : 'Advance placeholder'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded-md border border-slate-600 text-slate-200 font-bold uppercase tracking-[0.25em] text-xs hover:border-cyan-400 hover:text-white transition"
        >
          Reset to foundation
        </button>
      </div>
    </div>
  );
};

export default PlaceholderScreen;
