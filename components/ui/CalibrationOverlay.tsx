import React from 'react';
import { TrackingStatus } from '../../types';
import { CalibrationStatus } from './OverlayStateAdapter';

interface Props {
    progress: number;
    trackingStatus: TrackingStatus;
    calibrationStatus?: CalibrationStatus;
    onStartWithoutTracking?: () => void;
    onRetryCamera?: () => void;
    onRestartCalibration?: () => void;
    onContinue?: () => void;
}

const CalibrationOverlay: React.FC<Props> = ({
  progress,
  trackingStatus,
  calibrationStatus,
  onStartWithoutTracking,
  onRetryCamera,
  onRestartCalibration,
  onContinue,
}) => {
    const stalled = calibrationStatus?.stalled ?? false;
    const cameraReady = calibrationStatus?.cameraReady ?? true;
    const showFallbackCta = !!onStartWithoutTracking && (!cameraReady || calibrationStatus?.fallbackCta);
    const showRetryAction = !!onRetryCamera && !cameraReady;
    const pointerEventsClass =
      showFallbackCta || showRetryAction || onRestartCalibration || onContinue
        ? 'pointer-events-auto'
        : 'pointer-events-none';

    const guidanceText = (() => {
      if (!cameraReady)
        return (
          calibrationStatus?.message ??
          'Camera access required. Enable your webcam and allow permissions, then press Retry.'
        );
      if (stalled)
        return calibrationStatus?.message ?? 'We cannot see your hands. Move them into the guide box or adjust lighting.';
      if (progress > 0) return 'HOLD STEADY';
      return 'Pinch LEFT Index & Thumb to Align';
    })();

    return (
        <div
          className={`absolute inset-0 flex items-center justify-center ${pointerEventsClass} bg-black/60 backdrop-blur-md z-50 p-4`}
        >
          <div className="text-center relative w-full max-w-2xl">
            <div className="flex flex-col items-center gap-3 mb-6 md:mb-8">
              <div className="px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-500/40 text-[11px] uppercase tracking-[0.25em] text-cyan-200 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Calibrating Neural Link
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Hold your left-hand pinch steady to lock in</p>
            </div>

            <div className="mb-8 md:mb-12 relative flex flex-col items-center justify-center scale-75 md:scale-100">
               <svg viewBox="0 0 200 200" className="w-64 h-64 rotate-[-90deg]">
                  <circle cx="100" cy="100" r="85" fill="transparent" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="4" />
                  <circle cx="100" cy="100" r="85" fill="transparent" stroke="#00ffff" strokeWidth="8" strokeDasharray={2 * Math.PI * 85} strokeDashoffset={2 * Math.PI * 85 * (1 - progress)} className="transition-all duration-100 ease-linear" />
               </svg>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-black text-3xl">
                  {Math.round(progress * 100)}%
               </div>
            </div>

            <h2 className="text-2xl md:text-4xl font-black italic text-cyan-400 mb-4 md:mb-8 uppercase tracking-tighter">Neural Sync Required</h2>

            <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center mb-4 md:mb-8">
               <div className={`px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors ${trackingStatus.trigger ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                  Left Hand: {trackingStatus.trigger ? 'LOCKED' : 'WAITING'}
               </div>
               <div className={`px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors ${trackingStatus.aimer ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                  Right Hand: {trackingStatus.aimer ? 'LOCKED' : 'WAITING'}
               </div>
               <div className={`px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-[0.3em] transition-colors ${cameraReady ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  Camera: {cameraReady ? 'ONLINE' : 'OFFLINE'}
               </div>
            </div>

            <div className="bg-black/40 border border-cyan-500/30 px-4 md:px-6 py-4 rounded-xl mx-4">
               <p className="text-white font-mono text-xs md:text-sm tracking-widest uppercase">
                  {guidanceText}
               </p>
            </div>

            <div className="mt-6 flex flex-col md:flex-row justify-center gap-3 md:gap-4 items-center">
              {onRestartCalibration && (
                <button
                  className="px-4 py-2 bg-purple-800/70 hover:bg-purple-700 text-white font-bold uppercase tracking-[0.25em] rounded shadow-lg transition"
                  onClick={onRestartCalibration}
                >
                  Restart Calibration
                </button>
              )}

              {showRetryAction && (
                <button
                  className="px-4 py-2 bg-cyan-700/80 hover:bg-cyan-500 text-white font-bold uppercase tracking-[0.25em] rounded shadow-lg transition"
                  onClick={onRetryCamera}
                >
                  Re-request camera access
                </button>
              )}

              {onContinue && (
                <button
                  className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold uppercase tracking-[0.25em] rounded shadow-lg transition"
                  onClick={onContinue}
                >
                  Continue to Launch
                </button>
              )}
            </div>

            {showRetryAction && (
              <p className="mt-2 text-[10px] text-white/60 uppercase tracking-[0.25em] text-center">
                Update permissions or plug in a device, then tap to try again.
              </p>
            )}

            {showFallbackCta && (
              <div className="mt-6 flex flex-col gap-3 items-center pointer-events-auto">
                <button
                  className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded shadow-lg transition"
                  onClick={onStartWithoutTracking}
                >
                  Start without hand tracking
                </button>
                <p className="text-[11px] text-white/60 uppercase tracking-[0.2em]">Mouse + keyboard controls will be enabled.</p>
              </div>
            )}

            {/* Guide box to show where to hold hand */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] md:w-[40%] h-[40%] border-2 border-cyan-500/30 rounded-lg animate-pulse" />
          </div>
        </div>
    );
};

export default CalibrationOverlay;
