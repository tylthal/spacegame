# Developer Guide

This guide is a quick walkthrough of how the simulation is stitched together and how to extend it safely. It complements the high-level notes in `README.md` and `docs/ARCHITECTURE.md`.

## Phased Rebuild Checklist

1. **Input Stack** — stabilize MediaPipe ingestion before touching rendering.
   - **Modules**: `services/handTracker.ts`, `config/constants.ts` (calibration), `types.ts` (`HandResult`).
   - **Contract**: `handResultRef.current` always set to the latest `HandResult | null` plus calibration metadata so downstream reads never throw.
   - **Exit Criteria**: 30Hz input updates observed in logs; null-handling verified.

2. **Phase Machine** — codify transitions before layering visuals.
   - **Modules**: `App.tsx` (React state) and `components/GameScene.tsx` (imperative mirror) with timers in `config/constants.ts`.
   - **Contract**: `{ phase, phaseRef }` stay in sync; transition helpers emit hooks/callbacks for other systems.
   - **Exit Criteria**: Deterministic CALIBRATING → READY → PLAYING → PAUSED/HELP → GAMEOVER flows reproducible without renderer.

3. **Rendering Spine** — lock down WebGL lifecycle and shared assets.
   - **Modules**: `components/GameScene.tsx`, `systems/AssetManager.ts`, `systems/SceneComposer.ts`.
   - **Contract**: `SceneContext` with `camera`, `scene`, pooled meshes, and a `render(dt, inputState)` hook that gameplay systems can call.
   - **Exit Criteria**: Scene initializes/tears down without leaks; pooled meshes recycle correctly during phase resets.

4. **Gameplay & Simulation** — keep pure, frame-bounded logic.
   - **Modules**: `systems/InputProcessor.ts`, `systems/EnemyFactory.ts`, projectile pools, AI utilities in `utils/`.
   - **Contract**: Functions accept immutable `{ handResult, dt, phase }` snapshots and return `SimulationState` diffs (spawned enemies, despawns, score deltas).
   - **Exit Criteria**: Simulation can run headless with mocked input; deterministic test fixtures pass.

5. **UI & Overlays** — bind low-frequency summaries to React.
   - **Modules**: `components/SceneOverlays.tsx`, HUD helpers, telemetry emitters.
   - **Contract**: Consume summarized `UiModel` derived from simulation and phase machine; never subscribe to per-frame vectors.
   - **Exit Criteria**: Overlays update on phase/score changes without coupling to the render loop.

## Frame Pipeline

1. **Neural Input (App.tsx)**
   - `HandTracker` runs inside a `requestAnimationFrame` loop at ~30Hz to balance CPU/GPU load.
   - Results are written to the mutable `handResultRef` without triggering React renders.
2. **Render Loop (components/GameScene.tsx)**
   - Initializes Three.js once, then uses `renderer.setAnimationLoop` for a fixed 60fps target.
   - Each frame performs the following in order:
     1. Read `handResultRef` and interpret gestures via `InputProcessor` (aim, pinch, fist, pause).
     2. Update pooled particle buffers (`ParticleSystem.update`).
     3. Advance simulation logic (enemy AI, weapon cooldowns, state transitions).
     4. Position reticle/laser, handle menu raycasts, and render the scene.
   - React overlays (`SceneOverlays`) subscribe to low-frequency state like phase, hull, or help page.

## Phase & State Management

- The current phase is stored in both React state (`phase`) and an imperative mirror (`phaseRef`) so that the render loop can read instantly without waiting for React reconciliation.
- Phase transitions reset transient data:
  - **CALIBRATING → READY → PLAYING** clears enemies, bullet pool state, and weapon heat.
  - **PAUSED/HELP** shows the interactive 3D menu targets at `SCENE_CONFIG.MENU_Z`.
  - **GAMEOVER** clears active projectiles and offers a single reboot target.
- Time-based gates (calibration hold, pause hold, missile cooldown) are tracked with `performance.now()` timestamps to keep them independent of frame rate.

## Memory & Performance Patterns

- **Pooling**: `EnemyData`, bullets, and pooled Three.js geometries/materials are reused to avoid garbage collection spikes during combat.
- **Math Objects**: Frequently used vectors/quaternions are declared once at module scope (`const _v1 = new THREE.Vector3()`) and reused every frame.
- **Manual Matrix Updates**: Bullet meshes disable auto-updates and manually call `updateMatrix()` for straight-line projectiles.
- **Perf Logging**: Enable the `benchmark` dev flag (e.g. append `?benchmark=1` to the URL or set `localStorage.setItem('spacegame_dev_benchmark', '1')`) to log per-stage timing (input, particles, logic, render) averaged over 60 frames.

## UI & Menu Targets

- Pause/Help/GameOver menus are modeled as actual Three.js objects. The ray from the gun muzzle to the menu plane is calculated each frame to detect shots.
- Menu target positions are recomputed on window resize to align with the 2D overlay labels (using the visible width at `MENU_Z`).
- Health bars on enemies are billboarded toward the camera every frame and reuse materials from `AssetManager` for consistent colors.

## Adding New Features Safely

- **New Enemy Type**: Define stats in `config/constants.ts` (`DIFFICULTY.ENEMIES`), add geometry/material recipes in `systems/EnemyFactory.ts`, and ensure hit radius/behavior are set in `GameScene.spawnEnemy`.
- **New Gesture**: Extend `InputProcessor.detectGestures` with the condition, then read it inside the `animate` loop. Keep thresholds normalized to MediaPipe's 0..1 coordinate system.
- **New Overlay or HUD Element**: Prefer adding it to `components/SceneOverlays.tsx` and use the existing props/refs to avoid coupling it to the high-frequency render loop.
- **Configuration Changes**: Adjust constants in `config/constants.ts` so tuning remains centralized.

## Local Development Tips

- Keep the webcam preview visible when iterating on gesture logic; it is intentionally translucent to blend with the HUD.
- For hard-to-debug transforms, temporarily lower enemy counts by reducing `DIFFICULTY.MAX_ON_SCREEN` or disable fog in `GameScene.tsx`.
- If MediaPipe initialization fails, the fallback logs are printed from `services/handTracker.ts` to help diagnose WASM/GPU issues.

## Testing Strategy

- **Unit (Vitest)**: Target pure helpers (`utils/*`) and deterministic systems (`InputProcessor`, phase reducers) with fixtures. Prefer `vitest run` via `npm run test:unit` for rapid feedback.
- **Integration (Playwright/Cypress)**: When browser runners are available, script calibration → ready → playing and pause/overlay flows against `npm run dev` or `vite preview` to validate the phase machine plus render spine end-to-end.
- **Smoke Scripts**: `npm run test:unit` for local gating, `npm run test:ci` as the CI-friendly entry point that can expand to include headless browser specs.
