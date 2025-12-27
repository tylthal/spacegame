import React from 'react';

export interface HudOverlayProps {
  score: number;
  hull: number;
  lives: number;
  multiplier?: number;
  shockwaveProgress?: number; // 0..1 (1 = ready)
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

const HudOverlay: React.FC<HudOverlayProps> = ({ score, hull, lives, multiplier = 1, shockwaveProgress = 1, ariaLabel = 'Player HUD' }) => {
  return (
    <section
      className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between z-10"
      aria-label={ariaLabel}
    >
      {/* Top Bar - Responsive Layout */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">

        {/* Mobile: Compact Header Row */}
        <div className="flex items-center justify-between w-full md:w-auto md:justify-start md:gap-4">
          <StatBadge label="Score" value={formatNumber(score)} role="status" />

          {/* Mobile-only Multiplier (shown next to score on small screens if space permits, or we keep standard layout) */}
          <div className="md:hidden">
            <StatBadge label="Mult" value={`x${multiplier.toFixed(1)}`} />
          </div>

          {/* Desktop Multiplier */}
          <div className="hidden md:block">
            <StatBadge label="Multiplier" value={`x${multiplier.toFixed(1)}`} />
          </div>
        </div>

        {/* Right Side / Bottom-on-mobile Status */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start w-full md:w-auto gap-2 md:gap-2">

          {/* Hull Bar */}
          <div className="bg-slate-950/60 backdrop-blur border border-red-500/30 px-3 py-1.5 md:px-4 md:py-2 rounded-full flex-1 md:flex-none">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-[10px] uppercase tracking-widest text-red-400 whitespace-nowrap">Hull Integrity</span>
              <div className="w-full md:w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                  style={{ width: `${clampHull(hull)}%` }}
                />
              </div>
              <span className="font-mono text-red-200 text-xs">{hull}%</span>
            </div>
          </div>

          {/* Lives */}
          <div className="flex gap-1">
            {Array.from({ length: lives }).map((_, i) => (
              <div key={i} className="w-5 h-5 md:w-6 md:h-6 border border-cyan-500/50 bg-cyan-500/20 skew-x-[-12deg]" />
            ))}
          </div>
        </div>

        {/* Shockwave Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/60 backdrop-blur border border-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full">
          <span className="text-[10px] uppercase tracking-widest text-indigo-400">Ult</span>
          <div className="w-5 h-5 relative">
            <svg viewBox="0 0 24 24" className="w-full h-full -rotate-90">
              <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="3" className="text-slate-800" />
              <circle
                cx="12" cy="12" r="10"
                stroke="currentColor"
                fill="none"
                strokeWidth="3"
                className={`${shockwaveProgress >= 1 ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-indigo-500'}`}
                strokeDasharray="63"
                strokeDashoffset={63 * (1 - shockwaveProgress)}
              />
            </svg>
          </div>
        </div>
      </header>

      {/* Bottom Area (Guidance or contextual info) */}
      <div className="hidden md:block self-start bg-slate-950/50 backdrop-blur-sm border border-white/5 p-4 rounded-xl max-w-sm pointer-events-auto">
        <p className="text-xs text-slate-300 leading-relaxed font-mono">
          <span className="text-cyan-400 block mb-1"> SYSTEM DIAGNOSTIC </span>
          Visual layer hydrated. Post-processing active.
          Input monitoring engaged.
          <span className="block mt-2 text-indigo-300">ULTIMATE: PRAYER GESTURE (HANDS TOGETHER)</span>
        </p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Score {formatNumber(score)}. Lives {lives}. Hull {clampHull(hull)} percent. Multiplier {multiplier.toFixed(1)}x.
      </p>
    </section >
  );
};

export default HudOverlay;
