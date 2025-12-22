# Technical Reference Guide

## Project structure (clean base)

```
/
├── index.tsx                  # React entry point
├── App.tsx                    # Placeholder shell and phase selector
├── components/
│   ├── PhaseList.tsx          # Lists placeholder phases and their status
│   └── PlaceholderScreen.tsx  # Panel describing the active placeholder screen
├── __tests__/legacyCleanup.test.ts   # Guard test confirming legacy modules are removed
├── components/__tests__/AppShell.test.tsx # UI sanity checks for the shell
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
