import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PhaseList, { PhaseDescriptor, PhaseId } from './components/PhaseList';
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
import { RebuildShell } from './components/RebuildShell';

const phases: PhaseDescriptor[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    summary: 'Keep the repository stripped to the new shell so rebuilt systems land on a clean base.',
  },
  {
    id: 'calibration',
    title: 'Calibration placeholder',
    summary: 'Add the new calibration UX and input plumbing once the input stack is rebuilt.',
  },
  {
    id: 'ready',
    title: 'Ready/menu placeholder',
    summary: 'Wire the future phase manager and menu targets here after the phase system is reconstructed.',
  },
  {
    id: 'gameplay',
    title: 'Gameplay placeholder',
    summary: 'Reintroduce the render loop, spawning, and HUD after new kernels and tests exist.',
  },
];

const USE_REAL_INPUT = import.meta.env.VITE_USE_REAL_INPUT === '1' || import.meta.env.VITE_USE_REAL_INPUT === 'true';

const App: React.FC = () => {
  const [activePhase, setActivePhase] = useState<PhaseId>('foundation');
  const [tracker, setTracker] = useState<HandTracker | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Game Kernel State
  const combatLoop = useMemo(() => {
    // Determine seed (could be from URL or fixed for consistency)
    const seed = 12345;
    const rng = new SeededRng(seed);
    const scheduler = new SpawnScheduler(rng);
    return new CombatLoop(scheduler, rng);
  }, []);

  // Tick the loop (placeholder tick)
  useEffect(() => {
    if (activePhase !== 'gameplay') return;

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
  }, [activePhase, combatLoop]);


  // Initialize HandTracker strategy
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

  // HUD STATE mapped from CombatLoop for gameplay? 
  // For now we use the static preview props OR map them if possible.
  // Let's create a live hud state if we are in gameplay.
  const [hudState, setHudState] = useState({
    score: 0,
    hull: 100,
    lives: 3,
    multiplier: 1.0
  });

  // Sync HUD with loop (simple poller for React state)
  useEffect(() => {
    if (activePhase !== 'gameplay') return;
    const interval = setInterval(() => {
      const summary = combatLoop.summary();
      setHudState({
        score: summary.kills.drone * 100 + summary.kills.scout * 200 + summary.kills.bomber * 500, // naive score
        hull: summary.hull,
        lives: 3, // Logic not in CombatLoop yet
        multiplier: 1.0 // Logic not in loop yet
      });
    }, 100); // 10fps UI update
    return () => clearInterval(interval);
  }, [activePhase, combatLoop]);

  const advance = () => {
    const index = phases.findIndex(phase => phase.id === activePhase);
    const next = phases[index + 1];
    if (!next) {
      setActivePhase('foundation');
      return;
    }
    setActivePhase(next.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50 relative overflow-hidden">

      {activePhase === 'gameplay' ? (
        <>
          {/* GAMEPLAY VIEW */}
          <ThreeRenderer combatLoop={combatLoop} />
          <HudOverlay {...hudState} />

          {/* Temp Exit Button */}
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={() => setActivePhase('foundation')}
              className="bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-500/50 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition"
            >
              Exit Sim
            </button>
          </div>

          {/* Debug Panel Overlay during Gameplay */}
          <div className="absolute bottom-4 right-4 z-50">
            {debugConfig.debugPanels && <DebugPanel config={debugConfig} diagnostics={diagnostics} />}
          </div>
        </>
      ) : (
        /* REBUILD SHELL VIEW */
        <RebuildShell
          phases={phases}
          activePhase={activePhase}
          onPhaseSelect={setActivePhase}
          onAdvance={advance}
          onReset={() => setActivePhase('foundation')}
          tracker={tracker}
          cameraError={cameraError}
          onStreamReady={handleStreamReady}
          debugConfig={debugConfig}
          diagnostics={diagnostics}
        />
      )}
    </div>
  );
};

export default App;
