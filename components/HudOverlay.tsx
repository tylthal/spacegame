import React from 'react';

export interface HudOverlayProps {
  score: number;
  hull: number;
  lives: number;
  multiplier?: number;
  ariaLabel?: string;
}

const clampHull = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const formatNumber = (value: number) => value.toLocaleString('en-US');

const HullMeter: React.FC<{ value: number }> = ({ value }) => {
  const clamped = clampHull(value);
  const severity = clamped <= 25 ? 'danger' : clamped <= 60 ? 'warning' : 'ok';
  const barColor = {
    danger: 'bg-rose-500',
    warning: 'bg-amber-400',
    ok: 'bg-emerald-400',
  }[severity];

  return (
    <div className="space-y-1" aria-label="Hull integrity">
      <div className="flex items-center justify-between text-xs text-slate-300 uppercase tracking-[0.25em]">
        <span>Hull</span>
        <span aria-live="polite">{clamped}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
        <div
          className={`${barColor} h-full transition-all duration-300`}
          style={{ width: `${clamped}%` }}
          role="presentation"
        />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        Hull integrity at {clamped} percent.
      </p>
    </div>
  );
};

const StatBadge: React.FC<{ label: string; value: string | number; hint?: string; role?: 'status' }> = ({
  label,
  value,
  hint,
  role,
}) => (
  <div className="bg-slate-950/40 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-lg ring-1 ring-cyan-500/20">
    <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/80 font-bold">{label}</p>
    <p className="text-2xl font-black text-white leading-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" role={role} aria-label={`${label} ${value}`}>
      {value}
    </p>
    {hint ? <p className="text-xs text-slate-400 mt-1 font-mono">{hint}</p> : null}
  </div>
);

const HudOverlay: React.FC<HudOverlayProps> = ({ score, hull, lives, multiplier = 1, ariaLabel = 'Player HUD' }) => {
  return (
    <section
      className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10"
      aria-label={ariaLabel}
    >
      {/* Top Bar */}
      <header className="flex items-start justify-between">
        <div className="flex gap-4">
          <StatBadge label="Score" value={formatNumber(score)} role="status" />
          <StatBadge label="Multiplier" value={`x${multiplier.toFixed(1)}`} />
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-slate-950/60 backdrop-blur border border-red-500/30 px-4 py-2 rounded-full">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-red-400">Hull Integrity</span>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                  style={{ width: `${clampHull(hull)}%` }}
                />
              </div>
              <span className="font-mono text-red-200 text-xs">{hull}%</span>
            </div>
          </div>

          <div className="flex gap-1">
            {Array.from({ length: lives }).map((_, i) => (
              <div key={i} className="w-6 h-6 border border-cyan-500/50 bg-cyan-500/20 skew-x-[-12deg]" />
            ))}
          </div>
        </div>
      </header>

      {/* Bottom Area (Guidance or contextual info) */}
      <div className="self-start bg-slate-950/50 backdrop-blur-sm border border-white/5 p-4 rounded-xl max-w-sm pointer-events-auto">
        <p className="text-xs text-slate-300 leading-relaxed font-mono">
          <span className="text-cyan-400 block mb-1"> SYSTEM DIAGNOSTIC </span>
          Visual layer hydrated. Post-processing active.
          Input monitoring engaged.
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Score {formatNumber(score)}. Lives {lives}. Hull {clampHull(hull)} percent. Multiplier {multiplier.toFixed(1)}x.
      </p>
    </section>
  );
};

export default HudOverlay;
