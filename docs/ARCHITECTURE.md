# Architecture Overview

Orbital Defense is a gesture-controlled space shooter built with React, Three.js, and MediaPipe hand tracking.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  (Top-level orchestrator, phase routing, game loop)         │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   Input     │     │   Gameplay  │     │  Rendering  │
    │   Stack     │     │   Systems   │     │   Layer     │
    └─────────────┘     └─────────────┘     └─────────────┘
```

## Module Structure

### Input Layer (`input/`)
- **HandTracker.ts**: Interface for MediaPipe hand landmark data
- **InputProcessor.ts**: Gesture classification, One Euro smoothing, cursor mapping
- **CursorMapper.ts**: Transforms hand position to screen coordinates
- **HandSignature.ts**: Player identification via hand proportions
- **Gestures.ts**: Gesture detection utilities

### Gameplay Layer (`gameplay/`)
- **CombatLoop.ts**: Core tick-based simulation - spawning, physics, damage
- **SpawnScheduler.ts**: Time-based difficulty progression (5 tiers)
- **Collision.ts**: Swept sphere collision for fast projectiles
- **Rng.ts**: Seeded random for deterministic testing

### Rendering Layer (`infrastructure/three/`)
- **GameScene.tsx**: Main 3D scene with enemies, bullets, effects
- **EnemyMeshes.tsx**: Visual models for each enemy type
- **Starmap.tsx**: Parallax star background
- **ShieldBubble.tsx**: Energy shield rendering

### UI Layer (`components/`)
- **GameHUD.tsx**: Score, hull, heat, cooldowns overlay
- **TitleScreen.tsx**: Main menu with 3D station
- **CalibrationScreen.tsx**: Hand tracking setup
- **DifficultyScreen.tsx**: Easy/Normal/Hard selection
- **PauseScreen.tsx / GameOverScreen.tsx**: Game state overlays
- **HelpScreen.tsx**: Controls and enemy reference

### Phase Management (`phase/`)
- **PhaseManager.ts**: State machine for game flow

### Audio (`audio/`)
- **SoundEngine.ts**: Procedural sound effects (Web Audio API)
- **MusicEngine.ts**: Background music management

### Configuration (`config/`)
- **gameConfig.ts**: Centralized gameplay tuning values

## Data Flow

1. **MediaPipe** → HandTracker → InputProcessor → ProcessedHandEvent
2. **ProcessedHandEvent** → App.tsx → CombatLoop.tick()
3. **CombatLoop** updates enemies, bullets, checks collisions
4. **GameScene** reads CombatLoop state, renders frame
5. **GameHUD** displays current stats

## Key Design Decisions

- **No global singletons**: Components receive dependencies via props/hooks
- **Deterministic simulation**: CombatLoop uses seeded RNG for testing
- **Config centralization**: All tuning in `gameConfig.ts` and `inputConfig.ts`
- **Guard tests**: `legacyCleanup.test.ts` prevents reintroduction of removed code
