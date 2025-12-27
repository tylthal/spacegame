# Technical Reference Guide

## Project structure (clean base)

```
/
├── index.tsx                  # React entry point
├── App.tsx                    # Placeholder shell, HUD preview, and phase selector
├── components/
│   ├── HudOverlay.tsx         # Accessible HUD badges + hull meter with sr-only fallbacks
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
├── rendering/MenuTargets.ts          # MENU_Z plane math + hit-detection helpers
├── __tests__/legacyCleanup.test.ts   # Guard test confirming legacy modules are removed
├── __tests__/inputProcessor.test.ts  # Deterministic gesture + smoothing coverage
├── __tests__/menuTargets.test.ts     # MENU_Z target selection tests
├── components/__tests__/AppShell.test.ts # UI sanity checks for the shell
├── components/__tests__/HudOverlay.test.tsx # HUD accessibility + render assertions
└── docs/                      # Architecture, rebuild plan, and guides
```

## Design principles for the reset

- **No legacy dependencies**: MediaPipe, Three.js, and historical gameplay systems have been removed from the code surface.
- **Swappable screens**: Placeholder screens are lightweight React components so future input/render/phase systems can be
  integrated without refactoring the shell.
- **Guard tests**: The `legacyCleanup` test enforces that removed modules stay quarantined; add to its list if more legacy paths
  are identified.

## HUD overlay (Issue 8)

- `HudOverlay` renders score, hull, and lives as text-first badges with `aria-live` updates and a visible hull meter.
- Screen-reader fallbacks summarize hull state when the meter is not visible; default props keep the overlay deterministic in
  tests.
- The component is showcased inside `App.tsx` to preview the rebuilt HUD in isolation from the yet-to-be-added renderer.

## Menu targets at `MENU_Z` (Issue 8)

- `rendering/MenuTargets.ts` models the menu plane at z = `MENU_Z` with helpers to build target points and detect ray hits.
- `projectMenuPlane` translates screen x/y into plane coordinates; `hitTestTargets` selects the nearest interactive target
  within a configurable radius.
- Unit tests cover projection math and tie-breaking when multiple targets fall inside the hit radius.

## Next implementation steps

The rebuild will continue layering modules behind tests. Remaining work focuses on diagnostics and deployment:

1. Add observability/diagnostics toggles for input/phase/render systems.
2. Provide a headless-friendly smoke test pipeline before shipping builds.

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
  - `gesture`: one of `palm`, `pinch`, `fist`, `prayer` based on thumb–index pinch distance and average fingertip curl toward the wrist.
  - `cursor`: normalized virtual mousepad coordinates derived from the index fingertip after smoothing.
  - `stable`: `true` when cursor delta is within the configured tolerance frame-to-frame.
- Default One Euro parameters: `minCutoff=1.2`, `beta=0.002`, `dCutoff=1` (configurable per processor instance).
- Gesture thresholds (normalized by the hand bounding-box diagonal):
  - **Pinch**: thumb–index distance ≤ `0.05`.
  - **Fist**: average (index/middle/ring/pinky) fingertip-to-wrist distance ≤ `0.16`.
  - **Prayer**: both hands detected with palms facing each other, triggers shockwave.
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
- `SpawnScheduler` advances a time-based difficulty curve (Strategy A "Slow Burn"):

### Spawn Tiers

| Tier | Time | Interval | Enemies |
|------|------|----------|---------|
| 1 | 0-45s | 2.5s | Drones only |
| 2 | 45s-1m30s | 2.0s | + Weavers |
| 3 | 1m30s-2m30s | 1.5s | + Shielded Drones |
| 4 | 2m30s-3m30s | 1.2s | Increasing pressure |
| 5 | 3m30s+ | 1.0s | Full intensity |

### Progressive Max Caps

| Tier | Drones | Weavers | Shielded |
|------|--------|---------|----------|
| 1 | 3 | 0 | 0 |
| 2 | 4 | 1 | 0 |
| 3 | 5 | 1 | 1 |
| 4 | 6 | 2 | 1 |
| 5 | 7 | 3 | 2 |

### Spawn Probabilities

Even when below the max cap, each enemy type has a probability check:

| Tier | Drones | Weavers | Shielded |
|------|--------|---------|----------|
| 1 | 80% | 0% | 0% |
| 2 | 90% | 30% | 0% |
| 3 | 100% | 50% | 20% |
| 4 | 100% | 70% | 40% |
| 5 | 100% | 85% | 60% |

### Enemy Types

| Type | HP | Shield | Damage | Points | Speed |
|------|-----|--------|--------|--------|-------|
| Drone | 1 | 0 | 5 | 100 | 0.02 |
| Weaver | 1 | 0 | 7 | 300 | 0.012 |
| Shielded Drone | 1 | 4 | 15 | 500 | 0.012 |
| Bomber | 3 | 0 | 15 | 750 | 0.008 |

- **Shielded Drone**: Protected by energy shield (4 hits to overload, then 1 hit to destroy). Shield flashes white when hit with 150ms invincibility frames. Missiles strip shield completely but don't damage core.
- **Weaver**: Moves in corkscrew/spiral pattern, harder to hit.
- **Bomber**: Fires projectiles at the player. High priority target due to return fire capability.

- `Collision.segmentHitsSphere` handles fast projectiles with swept collision detection covering both current and previous positions.
- `CombatLoop` orchestrates deterministic ticks:
  - Spawns via `SpawnScheduler` with per-kind radius, speed, and hull damage budgets.
  - `applyDamage()` handles shields → health → destruction flow.
  - Fires a cadence-based shot (default 125ms) using `segmentHitsSphere` to detect hits.
  - Missiles detonate with area damage: max 4 damage to normal enemies, strips shields on shielded enemies.
  - Shockwave deals damage to all enemies on screen, 60-second cooldown.
  - Advances enemies toward the base, deducting hull when they breach.
  - Exposes summary stats for hull, spawns, kills, and elapsed time.

## 3D Rendering (Three.js / React Three Fiber)

### Enemy Orientation System

Enemy meshes need to face the direction they're flying. This is handled by:

1. **Mesh Convention** (in `EnemyMeshes.tsx`):
   - NOSE / FRONT: Positioned at +Z
   - ENGINE / BACK: Positioned at -Z
   - This is intuitive for artists creating new enemy types

2. **Runtime Orientation** (in `GameScene.tsx`):
   - Each enemy's velocity vector determines flight direction
   - `lookAt(position + velocity)` orients the enemy to face ahead
   - Due to Three.js conventions, this makes the nose lead and engine trail

**Important**: This was empirically tested. The math seems counterintuitive (lookAt makes -Z face the target, so engine should lead), but the combination of world coordinates and camera setup makes it work correctly. **Do not change without visual testing.**

### Enemy Visual Design

Each enemy type has distinct visual characteristics for quick identification:

- **Drone**: Compact body, red nose cone, cyan engine glow, swept wings
- **Weaver**: Flat disc with spinning blades, orange accents
- **Shielded Drone**: Dark green body, green accents, translucent green energy shield that pulses and flashes white when hit

### Shield Visual System

- `ShieldBubble.tsx` renders translucent energy shields around shielded enemies
- Uses getter function for `lastHitTime` to avoid React stale closure issues
- Shield flashes white for 150ms on hit with scale pulse
- Opacity decreases as shield HP drops
- Materials use emissive properties for visibility in dark space environments.


