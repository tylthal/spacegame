import React, { useEffect, useRef } from 'react';
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
    videoStream?: MediaStream | null;
    videoRef?: React.RefObject<HTMLVideoElement>;
}

const CalibrationOverlay: React.FC<Props> = ({
  progress,
  trackingStatus,
  calibrationStatus,
  onStartWithoutTracking,
  onRetryCamera,
  onRestartCalibration,
  onContinue,
  videoStream,
  videoRef,
}) => {
    const stalled = calibrationStatus?.stalled ?? false;
    const cameraReady = calibrationStatus?.cameraReady ?? true;
    const permissionPending = calibrationStatus?.permissionPending ?? false;
    const waitingForCamera = !cameraReady;
    const showFallbackCta = !!onStartWithoutTracking && (waitingForCamera || calibrationStatus?.fallbackCta);
    const showRetryAction = !!onRetryCamera && waitingForCamera;
    const pointerEventsClass =
      showFallbackCta || showRetryAction || onRestartCalibration || onContinue
        ? 'pointer-events-auto'
        : 'pointer-events-none';

    const headerLabel = waitingForCamera ? 'Enable Camera Access' : 'Calibrating Neural Link';
    const progressValue = waitingForCamera ? '---' : `${Math.round(progress * 100)}%`;

    const guidanceText = (() => {
      if (waitingForCamera)
        return (
          calibrationStatus?.message ??
          (permissionPending
            ? 'Approve the camera permission prompt, then hit Retry if needed.'
            : 'Camera access required. Enable your webcam and allow permissions, then press Retry.')
        );
      if (stalled)
        return calibrationStatus?.message ?? 'We cannot see your hands. Move them into the guide box or adjust lighting.';
      if (progress > 0) return 'HOLD STEADY';
      return 'Pinch LEFT Index & Thumb to Align';
    })();

    const backgroundVideoRef = useRef<HTMLVideoElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const stream = videoStream ?? (videoRef?.current?.srcObject as MediaStream | null);
      const targets = [backgroundVideoRef.current, previewVideoRef.current];

      targets.forEach(target => {
        if (!target) return;

        if (stream) {
          if (target.srcObject !== stream) {
            target.srcObject = stream;
          }
          target.play().catch(() => undefined);
        } else {
          target.srcObject = null;
        }
      });
    }, [videoStream, videoRef]);

    return (
        <div
          className={`absolute inset-0 flex items-center justify-center ${pointerEventsClass} bg-black/70 backdrop-blur-md z-50 p-4`}
        >
          <div className="absolute inset-0 opacity-40 md:opacity-60">
            <div className="calibration-overlay-video">
              <video
                ref={backgroundVideoRef}
                className="h-full w-full object-cover scale-x-[-1]"
                autoPlay
                muted
                playsInline
                aria-hidden
              />
            </div>
          </div>

          <div className="relative w-full max-w-5xl grid md:grid-cols-[1.1fr_1fr] gap-6 items-center text-center md:text-left">
            <div className="hidden md:block shadow-2xl border border-cyan-500/30 rounded-xl overflow-hidden bg-black/50 backdrop-blur">
              <div className="relative h-full min-h-[280px]">
                <video
                  ref={previewVideoRef}
                  className="h-full w-full object-cover scale-x-[-1]"
                  autoPlay
                  muted
                  playsInline
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/70 mix-blend-multiply" />
                <div className="absolute bottom-4 left-4 text-sm font-bold uppercase tracking-[0.25em] text-white/70 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  Live Feed
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center md:items-start gap-4 md:gap-6">
              <div className="flex flex-col items-center md:items-start gap-3">
                <div className="px-3 py-1 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-[11px] uppercase tracking-[0.25em] text-cyan-100 flex items-center gap-2 shadow-lg shadow-cyan-900/40">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {headerLabel}
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70 bg-black/50 px-4 py-2 rounded-full border border-white/10">
                  Hold your left-hand pinch steady to lock in
                </p>
              </div>

              <div className="relative flex flex-col items-center justify-center w-full">
                 <div className="mb-6 md:mb-10 relative flex flex-col items-center justify-center scale-75 md:scale-100">
                    <svg viewBox="0 0 200 200" className="w-64 h-64 rotate-[-90deg] drop-shadow-[0_0_25px_rgba(6,182,212,0.35)]">
                       <circle cx="100" cy="100" r="85" fill="transparent" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="4" />
                       <circle cx="100" cy="100" r="85" fill="transparent" stroke="#00ffff" strokeWidth="8" strokeDasharray={2 * Math.PI * 85} strokeDashoffset={2 * Math.PI * 85 * (1 - progress)} className="transition-all duration-100 ease-linear" />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-black text-3xl">
                       {progressValue}
                    </div>
                 </div>

                 <h2 className="text-2xl md:text-4xl font-black italic text-cyan-200 mb-2 md:mb-4 uppercase tracking-tighter drop-shadow-[0_0_18px_rgba(6,182,212,0.35)]">Neural Sync Required</h2>

                 <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center md:justify-start mb-3 md:mb-6">
                    <div className={`px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-black/60 ${trackingStatus.trigger ? 'border-cyan-500 text-cyan-300' : 'border-red-500/50 text-red-400'}`}>
                       Left Hand: {trackingStatus.trigger ? 'LOCKED' : 'WAITING'}
                    </div>
                    <div className={`px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-black/60 ${trackingStatus.aimer ? 'border-cyan-500 text-cyan-300' : 'border-red-500/50 text-red-400'}`}>
                       Right Hand: {trackingStatus.aimer ? 'LOCKED' : 'WAITING'}
                    </div>
                    <div className={`px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-[0.3em] transition-colors bg-black/60 ${cameraReady ? 'border-emerald-400/60 text-emerald-200' : 'border-red-500/50 text-red-400'}`}>
                       Camera: {cameraReady ? 'ONLINE' : 'OFFLINE'}
                    </div>
                 </div>

                 <div className="bg-black/75 border border-cyan-500/30 px-4 md:px-6 py-4 rounded-xl w-full max-w-xl shadow-lg shadow-black/50">
                    <p className="text-white font-mono text-xs md:text-sm tracking-widest uppercase text-center md:text-left">
                       {guidanceText}
                    </p>
                 </div>

                 <div className="mt-6 flex flex-col md:flex-row justify-center md:justify-start gap-3 md:gap-4 items-center">
                   {onRestartCalibration && (
                     <button
                       className="px-4 py-2 bg-purple-800/80 hover:bg-purple-700 text-white font-bold uppercase tracking-[0.25em] rounded shadow-lg transition"
                       onClick={onRestartCalibration}
                     >
                       Restart Calibration
                     </button>
                   )}

                   {showRetryAction && (
                     <button
                       className="px-4 py-2 bg-cyan-700/80 hover:bg-cyan-600 text-white font-bold uppercase tracking-[0.25em] rounded shadow-lg transition"
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
                   <p className="mt-2 text-[10px] text-white/70 uppercase tracking-[0.25em] text-center md:text-left">
                     Update permissions or plug in a device, then tap to try again.
                   </p>
                 )}

                 {showFallbackCta && (
                   <div className="mt-6 flex flex-col gap-3 items-center md:items-start pointer-events-auto">
                     <button
                       className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded shadow-lg transition"
                       onClick={onStartWithoutTracking}
                     >
                       Start without hand tracking
                     </button>
                     <p className="text-[11px] text-white/70 uppercase tracking-[0.2em]">Mouse + keyboard controls will be enabled.</p>
                   </div>
                 )}

                 {/* Guide box to show where to hold hand */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] md:w-[55%] h-[45%] border-2 border-cyan-400/25 rounded-lg animate-pulse pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
    );
};

export default CalibrationOverlay;
