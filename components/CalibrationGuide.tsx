import React from 'react';
interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cameraReady: boolean;
}

const CalibrationGuide: React.FC<Props> = ({ open, onClose, onConfirm, cameraReady }) => {
  if (!open) return null;

  const handleBegin = () => onConfirm();

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="relative w-full max-w-3xl mx-auto bg-slate-950/90 border border-cyan-500/30 rounded-2xl shadow-2xl px-6 py-8 md:px-10 md:py-12 text-white/90">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-500">Preflight</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-[0.18em] text-cyan-200">Camera Calibration</h2>
          </div>
          <div className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-[0.2em] ${
            cameraReady ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40' : 'bg-amber-900/30 text-amber-200 border border-amber-400/30'
          }`}>
            {cameraReady ? 'Camera Connected' : 'Awaiting Camera Permission'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl shadow-inner">
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-500 mb-2">Alignment</p>
            <p className="text-sm text-white/80">Center your shoulders with the guide box. Keep both hands within the frame.</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl shadow-inner">
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-500 mb-2">Lighting</p>
            <p className="text-sm text-white/80">Use even, front-facing light. Avoid bright backlights that hide your hands.</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl shadow-inner">
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-500 mb-2">Calibration</p>
            <p className="text-sm text-white/80">When ready, pinch your left hand to lock the zero point and begin combat.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center md:justify-between">
          <p className="text-[11px] text-white/70 uppercase tracking-[0.22em]">
            We’ll show a live calibration overlay next. Confirm when your space is ready.
          </p>
          <div className="flex gap-2 md:gap-3 justify-end">
            <button
              className="px-4 py-2 rounded-lg border border-white/20 text-white/70 uppercase tracking-[0.2em] text-xs hover:border-white/40 transition"
              onClick={onClose}
            >
              Continue without guide
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-black uppercase tracking-[0.25em] text-xs shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:bg-cyan-400 transition"
              onClick={handleBegin}
            >
              Begin Live Calibration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalibrationGuide;
