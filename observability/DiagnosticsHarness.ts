import { CombatLoop } from '../gameplay/CombatLoop';
import { SeededRng } from '../gameplay/Rng';
import { SpawnEvent, SpawnScheduler, type SpawnTier } from '../gameplay/SpawnScheduler';
import { HandFrame, InMemoryHandTracker } from '../input/HandTracker';
import { InputProcessor, type ProcessedHandEvent } from '../input/InputProcessor';
import { fistFrame, jitteredOpenPalm, openPalmFrame, pinchFrame } from '../input/fixtures/handFrames';
import { PhaseEvent, PhaseManager, type Phase } from '../phase/PhaseManager';

export interface DiagnosticsOptions {
  durationMs?: number;
  stepMs?: number;
  rngSeed?: number;
  spawnCurve?: SpawnTier[];
  frames?: HandFrame[];
}

export interface DiagnosticsReport {
  finalPhase: Phase;
  phaseEvents: PhaseEvent[];
  processedInputs: ProcessedHandEvent[];
  spawns: SpawnEvent[];
  summary: ReturnType<CombatLoop['summary']>;
}

function retime(frame: HandFrame, timestamp: number): HandFrame {
  return { ...frame, timestamp };
}

export function defaultDiagnosticsFrames(startMs = 0): HandFrame[] {
  const base = startMs + openPalmFrame.timestamp;
  return [
    retime(openPalmFrame, base),
    jitteredOpenPalm(0.001, base - openPalmFrame.timestamp + 600),
    jitteredOpenPalm(0.0015, base - openPalmFrame.timestamp + 1200),
    retime(pinchFrame, base + 1600),
    retime(fistFrame, base + 2000),
  ];
}

export function runDiagnosticsPipeline(options: DiagnosticsOptions = {}): DiagnosticsReport {
  const durationMs = options.durationMs ?? 5500;
  const stepMs = options.stepMs ?? 100;
  const rngSeed = options.rngSeed ?? 1337;
  const frames = [...(options.frames ?? defaultDiagnosticsFrames())].sort((a, b) => a.timestamp - b.timestamp);

  const tracker = new InMemoryHandTracker();
  const input = new InputProcessor(tracker);
  const phaseManager = new PhaseManager();
  const rng = new SeededRng(rngSeed);
  const scheduler = new SpawnScheduler(rng, options.spawnCurve);
  const combat = new CombatLoop(scheduler, rng);

  const processedInputs: ProcessedHandEvent[] = [];
  const phaseEvents: PhaseEvent[] = [];
  const spawns: SpawnEvent[] = [];

  const unsubscribeInput = input.subscribe(event => {
    processedInputs.push(event);
    phaseManager.ingest({ timestamp: event.raw.timestamp, stable: event.stable, gesture: event.gesture });
  });
  const unsubscribePhase = phaseManager.subscribe(event => phaseEvents.push(event));

  let elapsedMs = 0;
  let frameIndex = 0;
  const timelineStart = frames[0]?.timestamp ?? 0;

  while (elapsedMs < durationMs) {
    elapsedMs += stepMs;
    const wallclock = timelineStart + elapsedMs;

    while (frameIndex < frames.length && frames[frameIndex].timestamp <= wallclock) {
      tracker.emit(frames[frameIndex]);
      frameIndex += 1;
    }

    if (phaseManager.phase === 'PLAYING') {
      const result = combat.tick(stepMs);
      spawns.push(...result.spawned.map(enemy => ({ at: result.timestamp, kind: enemy.kind })));
    }
  }

  unsubscribeInput();
  unsubscribePhase();
  input.dispose();

  return {
    finalPhase: phaseManager.phase,
    phaseEvents,
    processedInputs,
    spawns,
    summary: combat.summary(),
  };
}
