# Orbital Sniper: Void Defense

A high-fidelity space combat simulator utilizing Three.js for 3D rendering and MediaPipe Hands for zero-latency gesture control.

## Quickstart

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open the provided localhost URL (Vite defaults to `5173`) in a Chromium-based browser. WebGL2/WebGPU and webcam access are required for gameplay.

For production-style checks, run `npm run build` to type-check and bundle the project.

## Project Architecture

### 1. Neural Link (Hand Tracking)
- **Engine**: MediaPipe Hands (`@mediapipe/tasks-vision`).
- **Input**: 320x240 optimized webcam stream (ideal for real-time tracking performance).
- **Processing**: A singleton `HandTracker` service initializes the GPU-accelerated model. Detection runs in the `App.tsx` loop, updating a shared reference used by the 3D scene.

### 2. Core Systems (`systems/*`)
- **Graphics**: Three.js Perspective Camera with a custom starfield and procedural enemy geometry (`EnemyFactory.ts`).
- **Asset Management**: `AssetManager.ts` handles geometry pooling and material recycling.
- **Visual Effects**: `ParticleSystem.ts` manages 12,000+ particles with **inverse-distance scaling**, ensuring explosions and engine trails maintain correct relative scale and density regardless of depth.
- **Input Logic**: `InputProcessor.ts` handles `OneEuroFilter` smoothing and gesture recognition (Pinch/Fist/Palm).
- **Physics**: Line-segment raycasting for high-speed bullet collisions.

## UI & Screen Setup

The application uses a layered rendering approach to maintain a "Cockpit HUD" feel:
- **Base Layer (3D)**: The starfield and enemy ships rendered in a deep Z-space.
- **Interactive Layer (3D)**: Target modules (Start, Resume, Database, etc.) positioned at `MENU_Z (-220)`. These are physical 3D objects that can be shot.
- **HUD Layer (2D/React)**: High-level tactical information (Score, Hull, Lives) rendered via Tailwind CSS on top of the canvas.
- **Overlay Layer (2D/React)**: Phase-specific screens (Calibration, Pause labels, Database, Game Over) that use backdrop blurs and CSS animations for holographic effects.

## Control System: The Virtual Mousepad

To resolve the "Gorilla Arm" fatigue issue common in spatial computing, the game abandons direct 1:1 mapping in favor of a **Virtual Mousepad** architecture.

- **Active Zone**: The user aims within a defined 40% center box of the camera view, visualized by a dashed holographic perimeter.
- **Input Sensitivity**: Hand movements are multiplied (approx 3.0x), allowing the user to reach screen corners with small, comfortable wrist movements rather than full arm extensions.
- **Hyperbolic Tangent (tanh) Smoothing**: 
  - Instead of exponential acceleration (which causes twitchiness at edges), we use a `tanh` sigmoid curve.
  - **Center**: Acts linearly (1:1) for precise sniping.
  - **Edges**: Applies a "Soft Clamp" (deceleration) as the reticle approaches the screen boundary. This makes holding aim at the edge significantly more stable and prevents the cursor from flying off-screen.

## Threat Assessment & Progression

The game features a dynamic difficulty system that scales based on survival time (configured in `config/constants.ts`).

### Difficulty Curve
- **Progression**: The spawn rate linearly increases from **0.6%** to **2.5%** over the first **300 seconds** (5 minutes) of gameplay.
- **Unlock System**: Advanced enemy types are added to the spawn pool at specific time thresholds.
- **Weighted Spawning**: Even after unlocking, powerful enemies (like Dreadnoughts) remain rarer than standard drones.

### Enemy Compendium
- **STANDARD**: Unlocked at 0s. Baseline drone.
- **SCOUT**: Unlocked at 30s. High speed, low health.
- **ELITE**: Unlocked at 60s. Red dome, increased durability.
- **INTERCEPTOR**: Unlocked at 120s. Corkscrew flight pattern.
- **WRAITH**: Unlocked at 180s. Ghostly drift, high value.
- **DREADNOUGHT**: Unlocked at 240s. Massive capital ship, high HP, rare spawn.

## State Machine (Phase System)

The game flows through six distinct states managed by `phaseRef`:
1. **CALIBRATING**: Initial state. Locks the user's "Zero Point". Requires 2.5s hold. Transitions to **READY**.
2. **READY**: Menu state. Displays the "Start" module. Shooting it transitions to **PLAYING**.
3. **PLAYING**: Combat state. Enemies spawn and advance. Manual "Palm Out" or "Tracking Loss" transitions to **PAUSED**. Hull reaching 0% transitions to **GAMEOVER**.
4. **PAUSED**: Tactical state. Time is effectively stopped for enemies. Displays Resume, Reset, Database, and Recalibrate modules.
5. **HELP**: Database state. Displays enemy intel and mechanics. Triggered from **PAUSED**.
6. **GAMEOVER**: Failure state. Displays final score and "Reboot" module. Shooting it returns to **READY**.

## Critical Behaviors & Gestures

### Calibration Protocol
- **Trigger**: Requires both hands present.
- **Action**: Hold a "Pinch" (Index + Thumb) on the **Left Hand** for 2.5 seconds.
- **Result**: Synchronizes the "Zero Point" for the aiming system based on the Right Hand's current position.

### Engagement Controls
- **Aiming**: Controlled by the **Right Hand** position relative to the calibration point.
- **Cannon Fire**: Triggered by a "Pinch" (Index + Thumb) gesture on the **Left Hand**. Rapid fire, moderate heat generation.
- **Missile Launch**: Triggered by a **Left Hand Fist**. Launches a proximity-detonated warhead with a massive blast radius (350u). High recoil, slower cooldown.

### Tactical Pause Protocols
- **Manual Pause**: Hold **Right Hand** palm-out (Index, Middle, Ring, and Pinky fingers extended vertically) for **0.6 seconds**. Gestures near the screen edge are ignored to prevent accidental triggering.
- **Resume**: Shoot the green "Resume Flight" module in the pause menu.

### Damage Mechanics
- **Void Breaches**: Enemies target the unrendered station below the camera. Upon impact, they explode and deal hull damage.
- **Neural Disconnect**: Reaching 0% Hull Integrity triggers a Game Over state. Shoot the red "Reboot" module to restart.

## Documentation Map

- **`docs/ARCHITECTURE.md`**: High-level system design and rendering/data-flow model.
- **`docs/TECHNICAL_REFERENCE.md`**: File-by-file structure, configuration references, and performance notes.
- **`docs/DEVELOPER_GUIDE.md`**: Practical walkthrough of the frame pipeline, phase management, and contribution tips.
- **`docs/UI_STYLE_GUIDE.md`**: Visual language, colors, and component styling conventions.
- **`docs/USER_GUIDE.md`**: Player-facing instructions and troubleshooting.
