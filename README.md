# Orbital Defense

A gesture-controlled space shooter where you defend a space station from waves of incoming enemy drones using hand tracking.

## Game Concept

You are the last line of defense for a space station under attack. Enemy drones approach from deep space - use your hand to aim and pinch to fire. Any enemy that gets past you damages the station's hull. Survive as long as possible while protecting the station.

## Controls

- **Right Hand (Point)**: Aim your weapon - point at enemies to target them
- **Left Hand (Pinch)**: Fire your laser - pinch thumb and index finger together to shoot
- **Left Hand (Fist)**: Launch missile - close your fist to fire a homing missile with area damage
- **Both Hands (Power Slam)**: Shockwave - clench both fists to release a defensive shockwave
- **Both Hands (Palm)**: Pause - hold both palms open to pause the game

## Quickstart

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Visit the Vite URL (defaults to `http://localhost:5173`)
4. Click "START" to begin
5. Select difficulty (Easy/Normal/Hard)
6. Follow the on-screen instructions to calibrate hand tracking
7. Defend the station!

## Tests

- `npm run test`: run the Vitest suite
- `npm run lint`: type-check the project

## Architecture

- **CombatLoop**: Core gameplay logic - enemy spawning, bullet physics, station damage
- **InputProcessor**: Hand tracking and gesture recognition (MediaPipe)
- **PhaseManager**: Game state management (Title → Calibration → Difficulty → Playing → GameOver)
- **GameScene**: 3D rendering with React Three Fiber
- **GameHUD**: Real-time display of score, station hull, heat, kills, and weapon cooldowns

## Configuration

Key gameplay settings are centralized in `config/gameConfig.ts`:
- `combat.hull: 100` - Starting station hull integrity
- `combat.maxEnemies: 6` - Maximum enemies on screen
- `combat.fireIntervalMs: 125` - Rate of fire (8 shots/second)
- `heat` - Weapon overheat system settings
- `missile` - Missile cooldown and blast radius
- `shockwave` - Shockwave cooldown and damage
- `difficulty` - Easy/Normal/Hard multipliers

## Enemy Types

| Type | Description | Points |
|------|-------------|--------|
| Drone | Basic enemy, flies straight | 100 |
| Weaver | Spirals toward you, harder to hit | 300 |
| Shielded | Energy shield requires sustained fire | 500 |
| Bomber | Fires back at you - priority target | 750 |

## Development

See `docs/` for detailed documentation:
- `ARCHITECTURE.md` - System design and module structure
- `TECHNICAL_REFERENCE.md` - API and configuration details
- `DEVELOPER_GUIDE.md` - Contributing guidelines
- `USER_GUIDE.md` - How to play
