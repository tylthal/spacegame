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
  <div className="bg-slate-900/80 border border-cyan-500/30 rounded-lg p-3 shadow-[0_0_25px_rgba(34,211,238,0.08)]">
    <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200/90">{label}</p>
    <p className="text-2xl font-black text-white leading-tight" role={role} aria-label={`${label} ${value}`}>
      {value}
    </p>
    {hint ? <p className="text-xs text-slate-300 mt-1">{hint}</p> : null}
  </div>
);

const HudOverlay: React.FC<HudOverlayProps> = ({ score, hull, lives, multiplier = 1, ariaLabel = 'Player HUD' }) => {
  return (
    <section
      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 md:p-5 text-slate-50 space-y-4"
      aria-label={ariaLabel}
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-cyan-300">HUD Overlay</p>
          <h3 className="text-lg font-semibold text-white">In-flight status</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-200 bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
          Text-safe fallback
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-[1.4fr,1fr] items-start">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3" role="list" aria-label="Core stats">
            <div role="listitem">
              <StatBadge label="Score" value={formatNumber(score)} role="status" hint="Total points" />
            </div>
            <div role="listitem">
              <StatBadge label="Lives" value={lives} role="status" hint="Escape pods" />
            </div>
          </div>
          <HullMeter value={hull} />
        </div>

        <div className="space-y-3">
          <StatBadge label="Multiplier" value={`x${multiplier.toFixed(1)}`} hint="Damage + score" />
          <p className="text-sm text-slate-200/80 leading-relaxed">
            Screen-reader fallback text keeps the HUD legible without the visual overlay. Announcements for score, lives, and
            hull use polite aria-live regions.
          </p>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Score {formatNumber(score)}. Lives {lives}. Hull {clampHull(hull)} percent. Multiplier {multiplier.toFixed(1)}x.
      </p>
    </section>
  );
};

export default HudOverlay;
