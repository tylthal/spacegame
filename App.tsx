import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameScene from './components/GameScene';
import WebcamFeed, { CameraDiagnostics, CameraError, CameraErrorCode } from './components/WebcamFeed';
import { HandTracker } from './services/handTracker';
import { perfTracer } from './telemetry/PerfTracer';
import { isDevFeatureEnabled } from './utils/devMode';

/**
 * App Component
 * Acts as the Central Command Unit, managing game state (score, health, lives)
 * and the high-frequency MediaPipe detection loop.
 */
const App: React.FC = () => {
  // --- Game State ---
  const [score, setScore] = useState(0);
  const [fps, setFps] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [useFallbackControls, setUseFallbackControls] = useState(false);
  const [handTrackingReady, setHandTrackingReady] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraInitError, setCameraInitError] = useState<CameraError | null>(null);
  const [cameraRequestPending, setCameraRequestPending] = useState(false);
  const [cameraRestartToken, setCameraRestartToken] = useState(0);
  const [cameraAccessRequestToken, setCameraAccessRequestToken] = useState(0);
  const [cameraErrorCode, setCameraErrorCode] = useState<CameraErrorCode | null>(null);
  const [cameraDiagnostics, setCameraDiagnostics] = useState<CameraDiagnostics | null>(null);
  const [hull, setHull] = useState(100);
  const [lives, setLives] = useState(3);

  const telemetryEnabled = isDevFeatureEnabled('benchmark');
  const cameraDiagnosticsOverlayEnabled = isDevFeatureEnabled('cameradiag');
  
  // --- Refs for Performance ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const handResultRef = useRef<any>(null); // Shared hand data reference
  const isDetecting = useRef(false);
  const lastDetectionTime = useRef(0);
  const frameCount = useRef(0);
  const lastFpsTime = useRef(performance.now());

  const initializeHandTracking = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);
    setUseFallbackControls(false);
    setCameraPermissionGranted(false);
    setCameraInitError(null);

    try {
      await HandTracker.init();
      setHandTrackingReady(true);
    } catch (error) {
      console.error('Hand tracking failed to initialize:', error);
      setHandTrackingReady(false);
      const message = error instanceof Error ? error.message : 'Failed to initialize hand tracking.';
      setInitError(message);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Initialization: Boot hand tracking engine
  useEffect(() => {
    initializeHandTracking();
  }, [initializeHandTracking]);

  useEffect(() => {
    if (!handTrackingReady || useFallbackControls || !cameraPermissionGranted) {
      handResultRef.current = null;
    }
  }, [handTrackingReady, useFallbackControls, cameraPermissionGranted]);

  // Neural Link Loop: High-frequency hand detection
  useEffect(() => {
    let animationId: number | null = null;

    const handTrackingActive = handTrackingReady && cameraPermissionGranted && !useFallbackControls;

    const detect = async () => {
      if (!handTrackingActive) return;
      if (videoRef.current && !isDetecting.current) {
        const now = performance.now();
        // Target ~30Hz detection to balance accuracy and CPU overhead
        if (now - lastDetectionTime.current >= 33) {
          isDetecting.current = true;
          const detectStart = telemetryEnabled ? perfTracer.startSpan('hand-detect') : null;
          const result = await HandTracker.detect(videoRef.current);
          perfTracer.endSpan('hand-detect', detectStart);
          if (result) {
            handResultRef.current = result;
          }
          isDetecting.current = false;
          lastDetectionTime.current = now;
        }
      }

      // Performance monitoring (Neural FPS)
      frameCount.current++;
      const time = performance.now();
      if (time - lastFpsTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastFpsTime.current = time;
      }

      animationId = requestAnimationFrame(detect);
    };

    if (!isInitializing && handTrackingActive) {
      animationId = requestAnimationFrame(detect);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isInitializing, telemetryEnabled, handTrackingReady, cameraPermissionGranted, useFallbackControls]);

  /**
   * handleDamage
   * Reduces hull integrity. If hull hits 0, subtracts a life and resets hull.
   * Memoized to prevent re-creating function on every render.
   */
  const handleDamage = useCallback((amount: number) => {
    setHull(prev => {
      const nextHull = prev - amount;
      if (nextHull <= 0) {
        setLives(l => Math.max(0, l - 1));
        return 100;
      }
      return nextHull;
    });
  }, []);

  /**
   * handleReset
   * Full system restart (Score 0, 3 lives, 100% hull).
   */
  const handleReset = useCallback(() => {
    setScore(0);
    setHull(100);
    setLives(3);
  }, []);

  const handleScoreUpdate = useCallback((p: number) => {
    setScore(s => s + p);
  }, []);

  const handleRetryCamera = useCallback(() => {
    setCameraPermissionGranted(false);
    setCameraInitError(null);
    setCameraErrorCode(null);
    setCameraDiagnostics(null);
    setUseFallbackControls(false);
    setCameraRestartToken(token => token + 1);
    setCameraAccessRequestToken(token => token + 1);
  }, []);

  const requestCameraAccess = useCallback(() => {
    setCameraRequestPending(true);
    setCameraInitError(null);
    setCameraErrorCode(null);
    setUseFallbackControls(false);
    setCameraAccessRequestToken(token => token + 1);
  }, []);

  const handleCameraDiagnostics = useCallback((info: CameraDiagnostics) => {
    setCameraDiagnostics(info);
    setCameraRequestPending(info.event === 'request');
  }, []);

  const handleCameraPermissionGranted = useCallback(() => {
    setCameraPermissionGranted(true);
    setCameraInitError(null);
    setCameraErrorCode(null);
    setCameraRequestPending(false);
    if (cameraInitError) {
      setUseFallbackControls(false);
    }
  }, [cameraInitError]);

  const handleCameraError = useCallback((error: CameraError) => {
    setCameraPermissionGranted(false);
    setCameraInitError(error);
    setCameraErrorCode(error.code);
    setCameraDiagnostics(prev => ({ ...prev, event: 'error', message: error.message }));
    setCameraRequestPending(false);
    setUseFallbackControls(true);
  }, []);

  const handTrackingActive = handTrackingReady && cameraPermissionGranted && !useFallbackControls;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-mono text-cyan-400 select-none">
      {cameraDiagnosticsOverlayEnabled && cameraDiagnostics && (
        <div className="absolute top-2 left-2 z-[120] bg-black/80 border border-cyan-500/40 rounded p-3 text-[10px] md:text-xs pointer-events-auto space-y-1 shadow-lg">
          <div className="font-black uppercase tracking-[0.2em] text-cyan-400">Camera Diagnostics</div>
          <div className="text-white/80">Device: {cameraDiagnostics.deviceLabel ?? 'Unknown'}</div>
          {cameraDiagnostics.constraints?.video && (
            <div className="text-white/60">
              Constraints: {JSON.stringify(cameraDiagnostics.constraints.video)}
            </div>
          )}
          {cameraDiagnostics.message && <div className="text-red-300">{cameraDiagnostics.message}</div>}
        </div>
      )}
      {isInitializing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-8" />
          <h1 className="text-xl md:text-2xl font-black tracking-[0.5em] uppercase animate-pulse text-center px-4">Initializing Neural Link...</h1>
          <p className="mt-4 text-cyan-700 uppercase tracking-widest text-xs">Loading Hand Tracking Engine</p>
        </div>
      )}
      {initError && !useFallbackControls && !isInitializing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="max-w-xl w-full bg-gray-900 border border-red-500/40 rounded-lg p-6 shadow-2xl text-center space-y-4">
            <h2 className="text-2xl font-black tracking-[0.3em] uppercase text-red-400">Hand Tracking Offline</h2>
            <p className="text-sm text-red-200/80">{initError}</p>
            <p className="text-xs text-white/50 uppercase tracking-[0.2em]">You can retry loading the model or continue with mouse + keyboard controls.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="px-4 py-2 rounded bg-red-600/80 text-white font-bold tracking-widest uppercase hover:bg-red-600 transition"
                onClick={initializeHandTracking}
              >
                Retry Hand Tracking
              </button>
              <button
                className="px-4 py-2 rounded border border-cyan-400 text-cyan-300 font-bold tracking-widest uppercase hover:bg-cyan-500/20 transition"
                onClick={() => setUseFallbackControls(true)}
              >
                Play with Mouse/Keyboard
              </button>
            </div>
          </div>
        </div>
      )}
      {!isInitializing && (
        <>
          <GameSceneMemo
            handResultRef={handResultRef}
            onScoreUpdate={handleScoreUpdate}
            onDamage={handleDamage}
            onReset={handleReset}
            score={score}
            hull={hull}
            lives={lives}
            handTrackingEnabled={handTrackingActive}
            cameraPermissionGranted={cameraPermissionGranted}
            cameraErrorCode={cameraErrorCode}
            onRetryCamera={handleRetryCamera}
          />

          {/* Top HUD: Tactical Information Display */}
          {/* Responsive: Reduced padding on mobile, stacked elements if needed */}
          <div className="absolute top-0 left-0 right-0 p-3 md:p-8 flex justify-between items-start pointer-events-none z-20">
            <div className="flex flex-col gap-2">
               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 md:px-6 md:py-2 rounded-sm backdrop-blur-md">
                    <span className="text-[9px] md:text-xs text-cyan-600 block mb-1 uppercase tracking-widest font-bold">Orbital Score</span>
                    <span className="text-xl md:text-4xl font-black tabular-nums leading-none">{score.toLocaleString()}</span>
                  </div>
                  <div className="hidden md:block bg-black/40 border border-white/10 px-4 py-2 rounded-sm backdrop-blur-md">
                    <span className="text-[10px] text-white/40 block uppercase tracking-widest">Neural FPS</span>
                    <span className="text-sm font-bold text-white/60 tabular-nums">{fps}</span>
                  </div>
               </div>
            </div>

            <div className="flex flex-col items-end gap-2 md:gap-4">
              <div className="bg-black/60 border-r-4 border-cyan-500 p-2 md:p-4 w-28 md:min-w-[300px] backdrop-blur-md shadow-2xl transition-all">
                <div className="flex justify-between items-center mb-1 md:mb-2">
                  <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em]">Integrity</span>
                  <span className="text-sm md:text-xl font-black tabular-nums">{hull}%</span>
                </div>
                <div className="w-full h-1.5 md:h-3 bg-cyan-950/50 relative overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_15px_#06b6d4]" 
                    style={{ width: `${hull}%` }}
                  />
                  {hull < 40 && (
                    <div className="absolute inset-0 bg-red-500/40 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="flex gap-1 md:gap-3">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2.5 h-2.5 md:w-6 md:h-6 rounded-full border md:border-2 transition-all duration-500 ${
                      i < lives 
                        ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_#06b6d4]' 
                        : 'bg-transparent border-white/10 shadow-none'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Engagement Protocol (Controls Legend) */}
          {/* Responsive: Hidden on small mobile screens to save space, visible on tablet/desktop */}
          <div className="hidden md:flex absolute bottom-8 left-8 flex-col gap-3 pointer-events-none z-20 opacity-40 hover:opacity-100 transition-opacity">
            <div className="bg-black/80 p-4 border border-cyan-500/20 rounded-md backdrop-blur-sm">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-cyan-600">Engagement Protocol</h3>
               <div className="flex flex-col gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                   <span>Aim: Right Hand</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                   <span>Fire: Left Hand Pinch</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                   <span>Missile: Left Hand Fist</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                   <span>Threat: Void Breaches</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Mini Webcam Preview: Visual feedback for neural alignment */}
          {/* Responsive: Smaller on mobile, standard on desktop. Moved higher on mobile to clear Weapon Status */}
          <div className="absolute bottom-24 right-4 md:bottom-8 md:right-8 w-20 h-14 md:w-48 md:h-36 border-2 border-cyan-500/30 rounded-lg overflow-hidden shadow-2xl z-[100] bg-black transition-all">
            <WebcamFeed
              key={cameraRestartToken}
              videoRef={videoRef}
              onPermissionGranted={handleCameraPermissionGranted}
              onDiagnostics={handleCameraDiagnostics}
              onError={handleCameraError}
              accessRequestToken={cameraAccessRequestToken}
            />
            {!cameraPermissionGranted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-[10px] md:text-xs font-bold uppercase tracking-widest text-red-300 text-center px-2">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div>
                      {cameraRequestPending
                        ? 'Requesting camera access — approve the browser prompt to link your webcam'
                        : 'Camera unavailable — mouse + keyboard fallback active'}
                    </div>
                    <p className="text-[9px] md:text-[10px] text-red-100/80 normal-case tracking-normal">
                      {cameraRequestPending
                        ? 'If you dismissed the prompt, use the button below after enabling permissions.'
                        : 'Reconnect or select a webcam, then press retry to reinitialize the feed.'}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-amber-100/80 normal-case tracking-normal">
                      {cameraInitError?.code === 'UNSUPPORTED'
                        ? cameraInitError.message
                        : 'Use HTTPS or localhost and confirm permissions before retrying.'}
                    </p>
                    {cameraInitError && cameraInitError.code !== 'UNSUPPORTED' && (
                      <div className="text-[9px] md:text-[10px] text-red-200/70 normal-case">
                        {cameraInitError.message}
                      </div>
                    )}
                  </div>
                  <button
                    className="mt-2 px-3 py-1 text-[9px] md:text-[10px] rounded bg-cyan-600/80 text-white uppercase tracking-widest hover:bg-cyan-500 transition"
                    onClick={requestCameraAccess}
                  >
                    Enable Camera
                  </button>
                  <button
                    className="mt-2 px-3 py-1 text-[9px] md:text-[10px] rounded bg-red-600/80 text-white uppercase tracking-widest hover:bg-red-500 transition"
                    onClick={handleRetryCamera}
                  >
                    Retry camera
                  </button>
                </div>
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 mix-blend-overlay opacity-50 bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            <div className="absolute top-1 left-1 md:top-2 md:left-2 flex items-center gap-1.5">
               <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-red-500 rounded-full animate-ping" />
               <span className="hidden md:inline text-[8px] font-black text-white/50 uppercase tracking-tighter">Live Neural Uplink</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Optimization: Memoize GameScene so it only updates when props strictly change
const GameSceneMemo = React.memo(GameScene);

export default App;