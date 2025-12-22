# Technical Reference Guide

## Project structure (clean base)

```
/
├── index.tsx                  # React entry point
├── App.tsx                    # Placeholder shell and phase selector
├── components/
│   ├── PhaseList.tsx          # Lists placeholder phases and their status
│   └── PlaceholderScreen.tsx  # Panel describing the active placeholder screen
├── phase/
│   └── PhaseManager.ts        # Pure-state phase controller with guarded transitions and events
├── gameplay/
│   ├── CombatLoop.ts          # Tick-based combat simulation with deterministic RNG + hull attrition
│   ├── Collision.ts           # Ray/segment intersection helpers for high-speed projectiles
│   ├── Rng.ts                 # Seeded random generator interface and implementation
│   └── SpawnScheduler.ts      # Time-based difficulty curve with weighted enemy rolls
├── input/                     # New input stack (hand tracking + gesture classification)
│   ├── HandTracker.ts         # Interface + in-memory adapter for MediaPipe-like sources
│   ├── InputProcessor.ts      # One Euro smoothing + gesture classification + virtual pad mapping
│   ├── OneEuroFilter.ts       # Numeric smoothing utility
│   └── fixtures/handFrames.ts # Deterministic fixtures for unit tests
├── __tests__/legacyCleanup.test.ts   # Guard test confirming legacy modules are removed
├── __tests__/inputProcessor.test.ts  # Deterministic gesture + smoothing coverage
├── components/__tests__/AppShell.test.ts # UI sanity checks for the shell
└── docs/                      # Architecture, rebuild plan, and guides
```

## Design principles for the reset

- **No legacy dependencies**: MediaPipe, Three.js, and historical gameplay systems have been removed from the code surface.
- **Swappable screens**: Placeholder screens are lightweight React components so future input/render/phase systems can be
  integrated without refactoring the shell.
- **Guard tests**: The `legacyCleanup` test enforces that removed modules stay quarantined; add to its list if more legacy paths
  are identified.

## Next implementation steps

The rebuild will layer in new modules behind tests. Recommended order:

1. Add a new input adapter with deterministic fixtures.
2. Introduce a pure-state phase manager and connect it to the placeholder screens.
3. Reintroduce rendering and asset management behind injected dependencies.
4. Build gameplay loops and HUD components once the spine is stable.

## Phase/state machine (Issue 5)

- `PhaseManager` advances through `CALIBRATING → READY → PLAYING → PAUSED → GAMEOVER` using only timestamped samples and
  gestures; no DOM or global dependencies are required.
- Guardrails:
  - Calibration completes only after `requiredCalibrationStableMs` of stable samples accumulate without a gap.
  - Starting gameplay requires a recent stable sample (within `maxUnstableBeforeStartMs`) plus a start gesture (`pinch` or
    `fist` by default).
  - Holding a pause gesture (`palm`) for `pauseHoldMs` transitions to `PAUSED`; start gestures resume play.
  - A configurable `maxPlayTimeMs` automatically moves the state to `GAMEOVER`.
- Consumers can subscribe to transition/guard events to coordinate UI, audio, or analytics without coupling to the manager's
  internal state.

## Input stack (Issue 4)

### HandTracker contract and adapters

- `HandTracker` publishes frames shaped as `{ timestamp: number; handedness: 'Left'|'Right'; landmarks: HandLandmark[] }`.
- The in-memory adapter (`InMemoryHandTracker`) mirrors a MediaPipe callback by letting tests and runtime code `emit` frames while exposing `subscribe`/`unsubscribe` semantics used by downstream processors.
- Frames are timestamped in milliseconds and keep the standard 21-landmark ordering (wrist at index 0, fingertip indices 4, 8, 12, 16, 20).

### Gesture processing and smoothing

- `InputProcessor` wires to a `HandTracker`, applies One Euro smoothing per-axis/per-landmark, and emits processed events with:
  - `smoothedLandmarks`: filtered coordinates in the source space.
  - `gesture`: one of `palm`, `pinch`, `fist` based on thumb–index pinch distance and average fingertip curl toward the wrist.
  - `cursor`: normalized virtual mousepad coordinates derived from the index fingertip after smoothing.
  - `stable`: `true` when cursor delta is within the configured tolerance frame-to-frame.
- Default One Euro parameters: `minCutoff=1.2`, `beta=0.002`, `dCutoff=1` (configurable per processor instance).
- Gesture thresholds (normalized by the hand bounding-box diagonal):
  - **Pinch**: thumb–index distance ≤ `0.05`.
  - **Fist**: average (index/middle/ring/pinky) fingertip-to-wrist distance ≤ `0.16`.
  - **Palm**: fallback when neither threshold triggers.

### Virtual mousepad transform and calibration tolerance

- The virtual pad assumes a calibrated normalized viewport where the hand lives within `[0,1]` in both axes.
- Coordinates are cropped to a pad defined by `origin={x:0.05, y:0.05}` and `width/height=0.9`, trimming edge noise while preserving the bulk of the field of view.
- `stabilityTolerance` defaults to `0.01` (Euclidean cursor delta). Movements under this threshold are marked stable, which lets downstream phase/menu logic ignore micro-jitter during calibration or target locking.
- Calibration steps:
  1. Align the hand within the camera view so the centroid sits roughly mid-frame (ensuring landmarks fall inside the pad).
  2. Hold a flat palm to confirm baseline gesture detection (`palm`) and cursor centering near the pad midpoint.
  3. Perform deliberate pinches/fists to verify thresholds; adjust `pinchThreshold`/`fistThreshold` if hardware scale differs.

## Gameplay systems (Issue 7)

- `SeededRng` offers deterministic random values for repeatable simulations and weighted rolls.
- `SpawnScheduler` advances a time-based difficulty curve:
  - 0–20s: interval 1200ms, drones only.
  - 20–40s: interval 900ms, drones with a light scout mix.
  - 40–60s: interval 700ms, drones/scouts plus occasional bombers.
  - 60s+: interval 550ms, balanced drones/scouts with heavier bomber representation.
- `Collision.segmentHitsCircle` handles fast projectiles by clamping closest-point math on the shot segment, covering tangential
  misses and shots fired from inside the target volume.
- `CombatLoop` orchestrates deterministic ticks:
  - Spawns via `SpawnScheduler` with per-kind radius, speed, and hull damage budgets.
  - Fires a cadence-based vertical shot (default 450ms) using `segmentHitsCircle` to cull targets.
  - Advances enemies toward the base (`baseY=1`), deducting hull (`drone=5`, `scout=8`, `bomber=15`) when they breach.
  - Exposes summary stats for hull, spawns, kills, and elapsed time to keep integration tests deterministic.
