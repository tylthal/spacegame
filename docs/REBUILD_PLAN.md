# Spacegame Rebuild Plan

A phased plan for rebuilding the game from scratch with testing embedded throughout. Each issue is followed by a task stub of concrete steps to execute.

**Issue 1: Align docs with the rebuild strategy before coding** — **Status: Done**
:::task-stub{title="Refresh foundational docs for the rebuild"}
- Update `docs/ARCHITECTURE.md` and `docs/DEVELOPER_GUIDE.md` with a high-level phased rebuild plan (input, phase machine, rendering, gameplay, UI), including module boundaries and data contracts.
- Add a “Testing Strategy” section outlining unit (Vitest) and integration (playwright or Cypress, if available) layers, plus minimal smoke scripts (`npm run test:unit`, `npm run test:ci`).
- Ensure `README.md` references the phased rebuild/testing flow and any new scripts.
:::

**Issue 2: Establish a clean, testable core scaffold** — **Status: Done**
:::task-stub{title="Bootstrap core scaffold and testing harness"}
- Verify/initialize Vitest + Testing Library configuration; add `npm run test` and `npm run test:watch`.
- Add a lightweight CI script (e.g., `npm run lint && npm run test --runInBand`).
- Create a minimal `GameKernel` module that wires a tick loop with dependency injection for subsystems; include a contract test that the loop ticks and calls registered systems.
:::

**Issue 3: Remove legacy and broken implementations before rebuilding** — **Status: Done**
:::task-stub{title="Prune or quarantine historical code"}
- Identify legacy classes/modules that conflict with the new scaffold (e.g., obsolete gesture processors, outdated rendering shells) and either delete them or move them under a clearly labeled `legacy/` folder.
- Replace ad hoc globals with typed interfaces and dependency injection points to prevent hidden coupling.
- Add guard tests that fail fast if legacy modules are referenced from the new code paths (e.g., import checks or dependency graph assertions).
- Update documentation references to point to the new scaffold locations and remove mentions of deprecated paths.
  - _Result_: Removed the unused `LiquidMetalScene`, `WebcamOverlay`, and `handTracking` stubs; added `systems/__tests__/legacyGuards.test.ts` to enforce the quarantine and keep imports pointed at the new scaffold.
:::

**Issue 4: Rebuild input stack with deterministic tests**
:::task-stub{title="Implement and test HandTracker/InputProcessor"}
- Define `HandTracker` interface and mockable adapter for MediaPipe; create deterministic fixtures for landmark frames.
- Reintroduce `InputProcessor` with `OneEuroFilter` and gesture classification (Pinch/Fist/Palm); unit-test gesture detection and smoothing boundaries.
- Document calibration flow and virtual mousepad transform, including tolerance values, in `docs/TECHNICAL_REFERENCE.md`.
:::

**Issue 5: Reconstruct phase/state machine with guards**
:::task-stub{title="Phase manager with coverage"}
- Implement a pure-state `PhaseManager` with transitions (CALIBRATING → READY → PLAYING → PAUSED/HELP → GAMEOVER) and guard conditions.
- Add unit tests for every transition, including gesture/time-based triggers and invalid transition rejections.
- Expose a small event emitter or callback API; test that events fire with correct payloads.
:::

**Issue 6: Rendering shell and asset management**
:::task-stub{title="Three.js scene bootstrap with pooled assets"}
- Recreate scene setup (camera, lights, starfield) behind an interface that accepts injected clock and renderer for testing.
- Implement `AssetManager`/`EnemyFactory` stubs that return predictable mock meshes in tests; add pooling tests (reuse vs. allocate).
- Add a snapshot-like assertion for scene graph counts per spawn/despawn cycle.
:::

**Issue 7: Gameplay systems and difficulty curve**
:::task-stub{title="Enemy spawning and combat loop with deterministic RNG"}
- Rebuild spawn scheduler with the documented time-based difficulty curve; inject a seeded RNG for reproducible tests.
- Implement collision/raycast utilities with unit tests covering edge cases (high-speed projectiles).
- Add integration-style test simulating N seconds of gameplay to assert spawn distribution and hull damage rules.
:::

**Issue 8: UI/HUD and menu modules**
:::task-stub{title="Reassemble HUD and interactive menu targets"}
- Recreate HUD overlays (score, hull, lives) as isolated React components with Testing Library assertions.
- Implement 3D menu targets at `MENU_Z` with hit-detection glue; add unit tests for target selection via mocked ray hits.
- Ensure accessibility fallbacks and document in `docs/UI_STYLE_GUIDE.md`.
:::

**Issue 9: Telemetry, debugging, and developer ergonomics**
:::task-stub{title="Add observability and dev tooling hooks"}
- Add optional logging/debug panels gated by environment flags; include tests for configuration parsing.
- Provide a minimal “diagnostics” mode that runs input + phase + spawn subsystems without rendering; write a smoke test to validate the pipeline.
- Document troubleshooting steps in `docs/DEVELOPER_GUIDE.md` and `docs/USER_GUIDE.md` (tracking loss, gesture misfires).
:::

**Issue 10: Build, deploy, and regression safety**
:::task-stub{title="CI and deployment verification"}
- Validate `npm run build` and ensure assets (MediaPipe) are stubbed or fetched in a CI-friendly manner.
- Add a `npm run smoke` script that starts the app in headless mode (if feasible) or stubs rendering, then runs a basic health check.
- Update `docs/DEPLOYMENT.md` with the revised pipeline and any LFS prerequisites.
:::
