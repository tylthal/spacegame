# Architecture Overview: Orbital Sniper

## 1. High-Level Concept
The application is a hybrid **React/Three.js** system. Unlike standard React Three Fiber applications, this project manages the Three.js render loop manually within a `useEffect` hook to ensure maximum performance and absolute control over the frame timing, essential for synchronizing with the asynchronous MediaPipe inference.

## 2. Core Components

### A. The React Shell (`App.tsx`)
Acts as the state container and "Central Command".
- **Responsibilities**:
  - Manages high-level game state (Score, Hull, Lives, Game Phase).
  - Runs the **MediaPipe Loop** (Neural FPS).
  - Renders the 2D HUD (Tailwind CSS layers).
  - Passes mutable Refs to the Game Scene.

### B. The Render Core (`GameScene.tsx`)
A component that initializes the WebGL context and orchestrates specialized systems.
- **Role**: Conductor/Orchestrator.
- **Responsibilities**:
  - Sets up Three.js (Scene, Camera, Renderer).
  - Manages the **Game Loop** (`requestAnimationFrame`).
  - Coordinates data flow between Systems (Input -> Logic -> Rendering).
  - Handles high-level game flow (Phase transitions, Scoring).

### C. The Neural Engine (`handTracker.ts`)
A static singleton service wrapping `@mediapipe/tasks-vision`.
- **Pattern**: Singleton to prevent model reloading on React re-renders.
- **Configuration**: GPU Delegate, Video Mode, 2 Hands Max.

## 3. Modular Systems
To maintain code cleanliness and separation of concerns, logic is split into specialized classes in the `systems/` directory:

1.  **`AssetManager`**: Handles the creation, storage, and disposal of shared Three.js Geometries and Materials (Kitbashing resources). It also owns pooled menu target prefabs and a reusable starfield geometry so resets and mode switches can recycle objects without reallocating WebGL resources.
2.  **`EnemyFactory`**: Uses the AssetManager to assemble complex enemy ships from primitive shapes based on `EnemyType`.
3.  **`ParticleSystem`**: Manages a high-performance, ring-buffered point cloud for explosions, trails, and shockwaves.
4.  **`InputProcessor`**: Translates raw MediaPipe landmarks into smoothed game controls (Yaw/Pitch) and gesture flags (Fire, Missile, Pause).

### Resource Pooling & Lifecycle

The render core leans on pooling to keep allocations predictable and frame times stable:

- **Geometries/Materials**: `AssetManager` builds all reusable primitives once (including menu targets and the starfield) and exposes methods to acquire/release instances instead of constructing on demand.
- **Dynamic Objects**: `EnemyFactory`, `BulletPool`, `MissilePool`, and the menu targets retrieved in `SceneComposer` return meshes back to their pools when removed from the scene.
- **Lifecycle Hooks**: `ResourceLifecycle` tracks disposables; unmounting or mode switches trigger asset releases before geometries/materials are finally disposed, ensuring GPU buffers are reclaimed cleanly.

## 4. Data Flow: The "Ref Bridge" Pattern

To avoid React's reconciliation overhead (which causes stutter in 60fps games), we do **not** pass high-frequency data (like hand coordinates or particle positions) via React Props.

Instead, we use **Mutable References**:

1.  **Detection**: `App.tsx` detects hands and writes the result to `handResultRef.current`.
2.  **Read**: `GameScene.tsx` reads `handResultRef.current` inside its `animate()` loop (60 times per second).
3.  **Processing**: `InputProcessor` converts this raw data into Aim Vectors and Action Flags.
4.  **Result**: Zero-latency access to the latest hand data without triggering React re-renders.

Only "Low Frequency" events (Score updates, Damage taken, Phase changes) trigger React state updates.

## 5. Input Processing: The Virtual Mousepad

Raw MediaPipe coordinates (0.0 to 1.0) are not mapped 1:1 to the screen. To prevent arm fatigue, we implement a specific mathematical model:

1.  **OneEuroFilter**: Raw inputs are smoothed to remove camera jitter.
2.  **Calibration Offset**: The position is calculated *relative* to a calibrated "Zero Point".
3.  **Tanh Transfer Function**:
    - `x_screen = tanh(x_hand * sensitivity) * max_yaw`
    - This creates a curve that is linear in the center (precise aiming) but tapers off at the edges (soft clamp), preventing the reticle from getting stuck at the screen border.

## 6. Rendering Layers (Z-Order)

The visual stack is composed as follows (Back to Front):

1.  **Starfield**: `Z = 5000+`. PointsMaterial. Fog disabled.
2.  **Enemies**: `Z = -5000 to 0`. Standard meshes. Affected by fog.
3.  **Menu Modules**: `Z = -220`. Interactive 3D objects (Start, Resume, Database).
4.  **Particles**: `Z = Variable`. Additive blending, no depth write.
5.  **Weapon/Reticle**: `Z = 0 to 15`. Attached to the camera group.
6.  **2D HUD**: HTML/CSS Overlay (Score, Health).
7.  **2D Overlays**: HTML/CSS Overlay (Pause Menu, Calibration, Webcam, Help).
