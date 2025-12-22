# Architecture Overview

The codebase has been reset to a thin React shell so the rebuild can progress without legacy coupling.

## Current state

- **Rendering/input removed**: No Three.js or MediaPipe code remains. The app is a simple React UI that swaps placeholder
  screens representing the future calibration, ready/menu, and gameplay flows.
- **No global singletons**: The placeholder screens are plain components with local state, keeping the surface ready for future
  dependency-injected systems.
- **Guardrails**: Tests fail if legacy modules or paths (old scenes, services, telemetry) reappear.

## Near-term layering strategy

1. **Input stack**: Introduce a new hand/input adapter behind a deterministic contract and unit tests.
2. **Phase manager**: Add a pure-state phase controller and wire the placeholder screens to it.
3. **Rendering spine**: Reintroduce the render loop and asset management as isolated modules with pooled resources and tests.
4. **Gameplay + UI**: Layer gameplay systems and HUD components after the spine stabilizes.

## File layout (clean base)

- `App.tsx`: Top-level shell that renders the placeholder screens and foundation checklist.
- `components/PhaseList.tsx`: Shows rebuild checkpoints and their status.
- `components/PlaceholderScreen.tsx`: Placeholder panel describing what will be built in each phase and the guardrails in place.
- `__tests__/legacyCleanup.test.ts`: Ensures removed legacy modules stay quarantined.
- `components/__tests__/AppShell.test.tsx`: UI sanity checks for the placeholder shell.

This minimal architecture is intentionally small; each upcoming phase should add new modules behind tests without reintroducing
legacy assets or untyped globals.
