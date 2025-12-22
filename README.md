# Spacegame rebuild shell

The repository has been reset to a minimal, testable shell. Legacy gameplay code, assets, and MediaPipe/Three.js wiring have
been removed so the rebuild can proceed in small, well-tested steps.

## Quickstart

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Visit the Vite URL (defaults to `http://localhost:5173`) to see the placeholder screens that will host the rebuilt features.

## Tests

- `npm run test`: run the Vitest suite.
- `npm run lint`: type-check the project.

## What is in the repo now

- A React shell with placeholder screens for the upcoming calibration, ready/menu, and gameplay flows.
- A11y-first HUD overlay component (score, hull, lives) previewed in the shell with Testing Library coverage.
- MENU_Z menu target math and hit-detection helpers with deterministic unit tests.
- Guard tests that fail if legacy modules or assets are reintroduced.
- Documentation updated to describe the clean foundation and phased rebuild plan.

## What is intentionally missing

- MediaPipe camera/gesture handling.
- Three.js rendering, scene composition, and gameplay visuals beyond HUD/menu placeholders.
- Legacy assets; new art/UI will return alongside the rebuilt systems.

Each missing piece will return gradually as the rebuild plan is implemented with tests and clear module boundaries.
