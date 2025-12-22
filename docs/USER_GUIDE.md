# User Guide

The application is currently a placeholder shell for the rebuild effort. There is no gameplay, camera access, or gesture input
in this version. Use it to preview the screens where future features will land.

## What you can do
- Open the app and click through the phase list (foundation, calibration, ready/menu, gameplay) to view placeholder guidance.
- Read the notes on each screen to understand what will be built next.

## What you cannot do yet
- Play the game, shoot targets, or see enemies.
- Use a webcam or gestures (MediaPipe support will return in later phases).
- Interact with Three.js scenes or HUD overlays.

This guide will expand once the rebuilt input, rendering, and gameplay systems are added.

## Early troubleshooting

- When hand tracking returns, enable the debug panels with the `VITE_DEBUG_PANELS` flag to confirm whether calibration and
  gesture events are flowing. The panels summarize the current phase, spawn counts, and hull state.
- If gestures feel jumpy or misfire, try rerunning the diagnostics mode (`VITE_DIAGNOSTICS_MODE=1`) to verify the pipeline with
  known-good frames before testing against a live camera feed.
- For tracking loss, re-run calibration in a stable, well-lit background and ensure your hand remains inside the virtual
  mousepad bounds noted in the technical reference.
