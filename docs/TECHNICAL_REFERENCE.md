# Technical Reference Guide

## 1. Project Structure

```
/
├── index.tsx                 # Entry point
├── App.tsx                   # Main State Controller & MediaPipe Loop
├── config/
│   └── constants.ts          # Centralized Game Configuration
├── services/
│   └── handTracker.ts        # MediaPipe Singleton
├── systems/
│   ├── AssetManager.ts       # Geometry/Material Pooling & Management
│   ├── EnemyFactory.ts       # Enemy Mesh Assembly
│   ├── InputProcessor.ts     # Hand Gesture & Coordinate Logic
│   └── ParticleSystem.ts     # High-Performance Particle Rendering
├── components/
│   ├── GameScene.tsx         # Main Render Loop & System Orchestration
│   ├── SceneOverlays.tsx     # UI Overlay Manager
│   ├── WebcamFeed.tsx        # Hidden Video Element for Input
│   └── ui/                   # Modular 2D UI Screens
│       ├── CalibrationOverlay.tsx
│       ├── GameOverOverlay.tsx
│       ├── HelpOverlay.tsx
│       ├── PauseOverlay.tsx
│       ├── ReadyOverlay.tsx
│       └── WeaponStatus.tsx
├── utils/
│   └── filters.ts            # OneEuroFilter Implementation
├── types.ts                  # Shared TypeScript Interfaces
└── docs/                     # Documentation
    ├── ARCHITECTURE.md
    ├── USER_GUIDE.md
    └── UI_STYLE_GUIDE.md     # Visual standards & design tokens
```

## 2. Configuration Constants (`config/constants.ts`)

### `DIFFICULTY`
Controls the enemy spawn rate ramp-up.
- **RAMP_UP_DURATION**: 300s (5 minutes to max difficulty).
- **SPAWN_CHANCE**: Scales from 0.006 to 0.025 per frame.
- **ENEMIES**: Defines stats (speed, hp, unlock time) for all 6 ship types.

### `WEAPON` & `MISSILE`
Defines player firepower.
- **BULLET_SPEED**: 38.0 (World units per frame).
- **HEAT_PER_SHOT**: 14.0 (Gun overheats at 100).
- **MISSILE_BLAST**: 350.0 (Radius of damage).

### `SCENE_CONFIG`
- **MAX_PARTICLES**: 12,000.
- **CAMERA_Z**: 40.
- **FOG**: Starts at 500, ends at 5500.

## 3. The Particle System (`systems/ParticleSystem.ts`)
We utilize a single **BufferGeometry** with pre-allocated Float32Arrays to manage 12,000 particles without garbage collection overhead.

- **Ring Buffer**: The system maintains a `head` and `tail` pointer. New particles overwrite the oldest ones if the buffer is full.
- **Data Structure**:
  - `position`: Float32Array (x, y, z)
  - `velocity`: Float32Array (vx, vy, vz) - stored separately, added to position each frame.
  - `age/decay`: Float32Arrays to track lifecycle.
- **Optimization**: `frustumCulled = false` is set because manually updating bounding spheres for particles is more expensive than just drawing them.

## 4. Interaction Logic

### Raycasting
We use a hybrid approach for collision detection inside `GameScene.tsx`:
1.  **Bullets**: Use "Continuous Collision Detection" (CCD). We calculate a Line3 segment between the bullet's *previous* position and *current* position. If an enemy intersects this line, it's a hit. This prevents bullets from clipping through fast enemies.
2.  **Menu Objects**: Standard Three.js `Raycaster` from the camera to the 3D reticle position.

### Enemy Spawning (`systems/EnemyFactory.ts`)
- `GameScene` determines *when* to spawn based on difficulty.
- `EnemyFactory` constructs the Three.js groups using shared geometries from `AssetManager`.
- Enemies are spawned at `Z = -5000` with a random `X/Y` and assigned a velocity vector pointing towards a randomized target zone near the player.

## 5. Optimization Strategies

1.  **Asset Pooling (`systems/AssetManager.ts`)**:
    - All geometries (cylinders, spheres, etc.) and materials are created once at startup.
    - Enemy meshes are constructed by cloning references to these shared assets, drastically reducing GPU memory overhead.
2.  **Math Object Pooling**:
    - Vector3s and Quaternions used in the render loop are instantiated *outside* the component or as module-level constants to prevent Garbage Collection pauses.
3.  **Ref-Based Props**:
    - `propsRef` inside `GameScene` captures React props (lives, score) so the closure of the `animate` loop can access values without re-creating the loop function.

## 6. Responsive Design & UI Architecture
To support gameplay on smaller mobile screens while maintaining the cinematic experience on desktops, the UI employs a responsive strategy using Tailwind CSS breakpoints.

### Breakpoint Strategy
- **Default (Mobile)**: Elements are scaled down, padded less, or hidden if non-essential.
- **`md:` (Tablet/Desktop)**: Elements expand to their full cinematic size.

### Component Adaptations
- **HUD (`App.tsx`)**:
  - **Top Bar**: Reduced padding (`p-4` vs `p-8`).
  - **Score**: Text size reduced (`text-2xl` vs `text-4xl`).
  - **Webcam**: Preview shrinks significantly (`w-24` vs `w-48`) to maximize viewable game area.
  - **Legend**: Hidden on mobile to prevent obscuring enemies.
- **Overlays (`components/ui/*`)**:
  - **Weapon Bar**: Moved higher (`bottom-20`) on mobile to avoid conflict with iOS Home Indicator.
  - **Pause Menu**: Labels are scaled (`scale-75`) and positioned closer to center to fit within portrait aspect ratios.
  - **Typography**: Large headers (`text-9xl`) step down to (`text-5xl`) on mobile to prevent overflow.

## 7. Known Constraints
- **Lighting Limit**: Three.js default limit on lights. We use minimal dynamic lights; enemies use `emissive` materials to appear bright without requiring expensive light calculations.
- **Audio**: No audio implementation (browser autoplay policies require user interaction first).