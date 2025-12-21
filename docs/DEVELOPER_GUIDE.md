# Developer Guide

This guide is a quick walkthrough of how the simulation is stitched together and how to extend it safely. It complements the high-level notes in `README.md` and `docs/ARCHITECTURE.md`.

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
- **Perf Logging**: Toggle `DEBUG_PERF` in `GameScene.tsx` to log per-stage timing (input, particles, logic, render) averaged over 60 frames.

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
