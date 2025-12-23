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
import { WebcamPreview } from './components/WebcamPreview'; // Added for real input

const USE_REAL_INPUT = import.meta.env.VITE_USE_REAL_INPUT === '1' || import.meta.env.VITE_USE_REAL_INPUT === 'true';

type GameState = 'TITLE' | 'PLAYING';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [tracker, setTracker] = useState<HandTracker | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Game Kernel State
  const combatLoop = useMemo(() => {
    const seed = 12345;
    const rng = new SeededRng(seed);
    const scheduler = new SpawnScheduler(rng);
    return new CombatLoop(scheduler, rng);
  }, []);

  // Tick the loop only when PLAYING
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

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
  }, [gameState, combatLoop]);


  // Initialize HandTracker
  useEffect(() => {
    if (USE_REAL_INPUT) {
      const browserTracker = new BrowserHandTracker();
      setTracker(browserTracker);
      return () => browserTracker.stop();
    } else {
      setTracker(new InMemoryHandTracker());
    }
  }, []);

  const handleStreamReady = useCallback((video: HTMLVideoElement) => {
    if (tracker instanceof BrowserHandTracker) {
      tracker.initialize(video).catch(err => {
        console.error('Failed to init MediaPipe', err);
        setCameraError('Failed to load hand tracking. Check console.');
      });
    }
  }, [tracker]);

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
    if (gameState !== 'PLAYING') return;
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
  }, [gameState, combatLoop]);

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50 relative overflow-hidden font-sans select-none">

      {/* 3D BACKGROUND - ALWAYS ACTIVE */}
      {/* Note: In Title Screen, combatLoop isn't ticking, so enemies won't move unless we separate Sim vs Render.
          For now, let's allow it to 'idle' or just show static starfield if loop paused.
          Actually, we want the starfield to move. The starfield animation is in GameScene/ParticleSystem based on 'delta'.
          useFrame still runs even if combatLoop doesn't tick, so Stars WILL animate. 
          Enemies won't move/spawn, which is perfect for Title Screen (Safety). */}
      <ThreeRenderer combatLoop={combatLoop} />

      {/* FOREGROUND UI LAYERS */}

      {gameState === 'TITLE' && (
        <TitleScreen
          onStart={() => setGameState('PLAYING')}
          inputReady={!!tracker}
        />
      )}

      {gameState === 'PLAYING' && (
        <>
          <HudOverlay {...hudState} />

          {/* Exit Button */}
          <div className="absolute top-4 left-4 z-50 pointer-events-auto">
            <button
              onClick={() => setGameState('TITLE')}
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

      {/* Hidden webcam for processing (if needed for debugging, usually BrowserHandTracker keeps it internal 
          but we passed handleStreamReady? BrowserHandTracker doesn't attach video to DOM by itself?
          Wait, BrowserHandTracker needs a video element passed to initialize(). 
          We need to render <WebcamPreview> somewhere to get that video element if we want it on screen or processed.
          If we hid RebuildShell, we lost WebcamPreview!
          We must render WebcamPreview (hidden or visible) to drive the input.
      */}
      {USE_REAL_INPUT && (
        <div className="absolute top-4 right-4 w-32 opacity-50 hover:opacity-100 transition-opacity z-40 pointer-events-auto">
          {/* Mini preview for validation */}
          <div className="aspect-video bg-black rounded border border-cyan-900 overflow-hidden">
            {/* We reuse the component to get the stream and ref, even if small */}
            {/* It handles getUserMedia and calls onStreamReady */}
            {/* Pass simplified error handler since we toast it above */}
            <WebcamPreview onStreamReady={handleStreamReady} onError={err => setCameraError(err.message)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
