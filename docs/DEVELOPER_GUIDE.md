# Developer Guide

This guide explains how to work with the cleaned-up rebuild shell.

## Working in the placeholder shell

- The app currently renders placeholder screens plus an accessible HUD overlay preview. There is still no MediaPipe or
  Three.js renderer, and no legacy gameplay logic.
- Use the phase list in the UI to view the scaffolding for calibration, ready/menu, and gameplay; each is intentionally simple
  so future modules can be slotted in. The ready/menu view demonstrates MENU_Z target helpers used by the renderer.

## Guardrails

- `__tests__/legacyCleanup.test.ts` fails if removed legacy modules (old scenes, services, telemetry, MediaPipe hooks) are
  reintroduced.
- Keep new modules behind explicit interfaces and tests; avoid adding global singletons or implicit refs.

## Adding the next slice of work

1. Add a new module with a focused contract (e.g., input adapter, phase manager) and unit tests.
2. Wire it to the shell via props and local state rather than global refs.
3. Update the rebuild plan and architecture notes to point to the new module locations.

## Commands

- `npm run dev` — start the Vite dev server to view the placeholder shell.
- `npm run test` — run the Vitest suite (including guardrails and UI checks).
- `npm run lint` — type-check the project.
