
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HudOverlay from './components/HudOverlay';
import DebugPanel from './components/DebugPanel';
import { resolveDebugConfig } from './observability/DebugConfig';
import { runDiagnosticsPipeline } from './observability/DiagnosticsHarness';
import { BrowserHandTracker } from './infrastructure/mediapipe/BrowserHandTracker';
import { HandTracker, InMemoryHandTracker } from './input/HandTracker';
import { ThreeRenderer } from './infrastructure/three/ThreeRenderer';
import { CombatLoop } from './gameplay/CombatLoop';
import { SpawnScheduler } from './gameplay/SpawnScheduler';
import { SeededRng } from './gameplay/Rng';
import { TitleScreen } from './components/TitleScreen';
import { CalibrationScreen } from './components/CalibrationScreen';
import { ReadyScreen } from './components/ReadyScreen';
import { WebcamPreview } from './components/WebcamPreview';
import { CRTOverlay } from './components/CRTOverlay';
import { InputProcessor } from './input/InputProcessor';
import { PhaseManager, Phase, PhaseEvent } from './phase/PhaseManager';

const USE_REAL_INPUT = import.meta.env.VITE_USE_REAL_INPUT === '1' || import.meta.env.VITE_USE_REAL_INPUT === 'true';

const App: React.FC = () => {
  // Core Systems
  const phaseManager = useMemo(() => new PhaseManager(), []);
  const [phase, setPhase] = useState<Phase>('TITLE'); // Mirror phase manager state

  const [tracker, setTracker] = useState<HandTracker | null>(null);
  const [inputProcessor, setInputProcessor] = useState<InputProcessor | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Calibration Progress visual (0-1)
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Game Kernel State
  const combatLoop = useMemo(() => {
    const seed = 12345;
    const rng = new SeededRng(seed);
    const scheduler = new SpawnScheduler(rng);
    return new CombatLoop(scheduler, rng);
  }, []);

  // Sync Phase Manager -> React State
  useEffect(() => {
    // Initial sync
    setPhase(phaseManager.phase);

    // Subscribe to changes
    return phaseManager.subscribe((event: PhaseEvent) => {
      if (event.type === 'transition') {
        setPhase(event.to);
        console.log('[Phase] Transition:', event.from, '->', event.to, 'Reason:', event.reason);
      }
    });
  }, [phaseManager]);

  // Tick the loop only when PLAYING
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    let lastTime = performance.now();
    let frameId = 0;

    const tick = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      combatLoop.tick(delta);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [phase, combatLoop]);


  // Initialize HandTracker & InputProcessor
  useEffect(() => {
    let t: HandTracker;
    if (USE_REAL_INPUT) {
      t = new BrowserHandTracker();
    } else {
      t = new InMemoryHandTracker();
    }
    setTracker(t);

    const proc = new InputProcessor(t);
    setInputProcessor(proc);

    return () => {
      console.log('Cleaning up tracker/processor');
      proc.dispose();
      if (t instanceof BrowserHandTracker) t.stop();
    };
  }, []);

  // Wire InputProcessor -> PhaseManager + CombatLoop
  useEffect(() => {
    if (!inputProcessor) return;

    return inputProcessor.subscribe(event => {
      // 1. Feed PhaseManager
      phaseManager.ingest({
        timestamp: event.raw.timestamp,
        stable: event.stable,
        gesture: event.gesture
      });

      // 2. Feed CombatLoop (Input Mapping)
      // Cursor X is 0..1. Map to -1..1 for game
      const gameX = (event.cursor.x * 2) - 1;
      // Invert X because camera is mirrored? Usually mirrors are intuitive (Left is Left).
      // But webcams often mirror image. 
      // If I move right, image moves right. 
      // Let's stick to direct mapping for now.
      combatLoop.setPlayerX(gameX);

    });
  }, [inputProcessor, phaseManager, combatLoop]);


  const handleStreamReady = useCallback((video: HTMLVideoElement) => {
    if (tracker instanceof BrowserHandTracker) {
      tracker.initialize(video).catch(err => {
        console.error('Failed to init MediaPipe', err);
        setCameraError('Failed to load hand tracking. Check console.');
      });
    }
  }, [tracker]);

  const handleCameraError = useCallback((err: Error) => {
    setCameraError(err.message);
  }, []);

  const debugConfig = useMemo(() => resolveDebugConfig(), []);
  const diagnostics = useMemo(
    () => (debugConfig.diagnosticsMode ? runDiagnosticsPipeline() : undefined),
    [debugConfig.diagnosticsMode],
  );

  // HUD STATE
  const [hudState, setHudState] = useState({
    score: 0,
    hull: 100,
    lives: 3,
    multiplier: 1.0
  });

  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const interval = setInterval(() => {
      const summary = combatLoop.summary();
      setHudState({
        score: summary.kills.drone * 100 + summary.kills.scout * 200 + summary.kills.bomber * 500,
        hull: summary.hull,
        lives: 3,
        multiplier: 1.0
      });
    }, 100);
    return () => clearInterval(interval);
  }, [phase, combatLoop]);

  return (
    <div
      className="fixed inset-0 bg-slate-950 text-cyan-50 overflow-hidden font-sans select-none touch-none"
      style={{ width: '100%', height: '100%', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <CRTOverlay />

      {/* 3D BACKGROUND - ALWAYS ACTIVE */}
      {/* Note: In Title Screen, combatLoop isn't ticking, so enemies won't move unless we separate Sim vs Render.
          For now, let's allow it to 'idle' or just show static starfield if loop paused.
          Actually, we want the starfield to move. The starfield animation is in GameScene/ParticleSystem based on 'delta'.
          useFrame still runs even if combatLoop doesn't tick, so Stars WILL animate. 
          Enemies won't move/spawn, which is perfect for Title Screen (Safety). */}
      <ThreeRenderer combatLoop={combatLoop} />

      {/* FOREGROUND UI LAYERS */}


      {/* PHASE RENDERING SWITCH */}
      {phase === 'TITLE' && (
        <TitleScreen onStart={() => phaseManager.startSession()} />
      )}

      {/* Override Phase Rendering */}

      {phase === 'CALIBRATING' && (
        <CalibrationScreen
          tracker={tracker}
          onComplete={(offset) => {
            // Apply the calibrated 'Zero Point' (now 2D)
            if (inputProcessor) {
              inputProcessor.setCalibration(offset);
            }
            // Transition to game
            setPhase('READY');
          }}
        />
      )}

      {phase === 'READY' && (
        <ReadyScreen onStart={() => console.log('Manual Start Clicked? PhaseManager needs a trigger? No, gesture trigger.')} />
      )}

      {phase === 'PLAYING' && (
        <>
          <HudOverlay {...hudState} />

          {/* Exit Button */}
          <div className="absolute top-4 left-4 z-50 pointer-events-auto">
            <button
              onClick={() => {
                phaseManager.reset(); // Go back to start
              }}
              className="bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-500/50 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition"
            >
              Abort
            </button>
          </div>

          <div className="absolute bottom-4 right-4 z-50 pointer-events-auto">
            {debugConfig.debugPanels && <DebugPanel config={debugConfig} diagnostics={diagnostics} />}
          </div>
        </>
      )}

      {/* Camera Error Toast */}
      {cameraError && (
        <div className="absolute top-0 w-full bg-red-900/90 text-red-100 text-center p-2 text-xs font-mono z-50">
          FATAL: {cameraError}
        </div>
      )}

      {/* 
          Input Note: 
          If Phase == CALIBRATING, CalibrationScreen handles WebcamPreview rendering.
          If Phase == PLAYING/READY, we still need WebcamPreview to keep the stream alive?
          BrowserHandTracker keeps the stream? 
          Actually, if CalibrationScreen unmounts, WebcamPreview unmounts?
          WebcamPreview handles the <video> tag. 
          If we unmount it, does the stream die? 
          Inside WebcamPreview: useMediaStream...
          If unmounted, we likely lose the video-element ref.
          We should keep WebcamPreview mounted ALWAYS, just hidden when not Calibrating.
      */}

      {/* GLOBAL WEBCAM PREVIEW - ALWAYS VISIBLE */}
      {/* Fixed Bottom Right Window */}
      {/* Using inline styles to guarantee positioning */}
      {USE_REAL_INPUT && (
        <div
          className="fixed w-64 aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl z-50 pointer-events-none animate-in fade-in duration-1000 slide-in-from-bottom-4"
          style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '300px', height: '170px', zIndex: 100 }}
        >
          <WebcamPreview onStreamReady={handleStreamReady} onError={() => { }} />

          {/* Minimal Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 right-2 flex space-x-1">
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-red-500 font-mono">LIVE</span>
            </div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,40,60,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />
        </div>
      )}

    </div>
  );
};

export default App;
