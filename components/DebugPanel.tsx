import React from 'react';
import type { DebugConfig } from '../observability/DebugConfig';
import type { DiagnosticsReport } from '../observability/DiagnosticsHarness';

interface DebugPanelProps {
  config: DebugConfig;
  diagnostics?: DiagnosticsReport;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ config, diagnostics }) => {
  return (
    <div className="border border-cyan-500/40 bg-cyan-950/40 rounded-xl p-4 text-sm text-cyan-50 space-y-3 shadow-lg">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300">Debug</p>
          <h3 className="text-lg font-semibold text-white">Developer signals</h3>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 text-cyan-100">
          {config.traceLogging ? 'Tracing on' : 'Tracing off'}
        </span>
      </header>

      <ul className="grid gap-2 md:grid-cols-3" aria-label="Debug configuration flags">
        <li className="rounded-lg bg-slate-900/70 border border-slate-700/60 p-3">
          <p className="text-xs text-cyan-200/80">Panels</p>
          <p className="font-semibold text-white">{config.debugPanels ? 'Enabled' : 'Disabled'}</p>
        </li>
        <li className="rounded-lg bg-slate-900/70 border border-slate-700/60 p-3">
          <p className="text-xs text-cyan-200/80">Tracing</p>
          <p className="font-semibold text-white">{config.traceLogging ? 'Enabled' : 'Disabled'}</p>
        </li>
        <li className="rounded-lg bg-slate-900/70 border border-slate-700/60 p-3">
          <p className="text-xs text-cyan-200/80">Diagnostics mode</p>
          <p className="font-semibold text-white">{config.diagnosticsMode ? 'Enabled' : 'Disabled'}</p>
        </li>
      </ul>

      {diagnostics && (
        <div className="border border-cyan-500/30 rounded-lg p-3 bg-cyan-900/40 space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Diagnostics</p>
          <p className="text-sm text-cyan-50">
            Phase settled on <span className="font-semibold">{diagnostics.finalPhase}</span> after{' '}
            {diagnostics.phaseEvents.filter(event => event.type === 'transition').length} transitions.
          </p>
          <p className="text-sm text-cyan-50">
            Spawned <span className="font-semibold">{diagnostics.spawns.length}</span> enemies and preserved hull at{' '}
            <span className="font-semibold">{diagnostics.summary.hull}%</span>.
          </p>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
