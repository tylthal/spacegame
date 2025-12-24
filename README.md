# Orbital Defense

A gesture-controlled space shooter where you defend a space station from waves of incoming enemy drones using hand tracking.

## Game Concept

You are the last line of defense for a space station under attack. Enemy drones approach from deep space - use your hand to aim and pinch to fire. Any enemy that gets past you damages the station's hull. Survive as long as possible while protecting the station.

## Controls

- **Right Hand (Point)**: Aim your weapon - point at enemies to target them
- **Left Hand (Pinch)**: Fire your weapon - pinch thumb and index finger together to shoot
- **Both Hands**: Required for calibration before gameplay begins

## Quickstart

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Visit the Vite URL (defaults to `http://localhost:5173`)
4. Click "INITIALIZE_SYSTEM" to begin calibration
5. Follow the on-screen instructions to calibrate hand tracking
6. Defend the station!

## Tests

- `npm run test`: run the Vitest suite
- `npm run lint`: type-check the project

## Architecture

- **CombatLoop**: Core gameplay logic - enemy spawning, bullet physics, station damage
- **InputProcessor**: Hand tracking and gesture recognition
- **PhaseManager**: Game state management (Title → Calibration → Playing → GameOver)
- **ThreeRenderer**: 3D rendering with React Three Fiber
- **GameHUD**: Real-time display of score, station hull, heat, and kills

## Configuration

Key gameplay settings in `CombatLoop.ts`:
- `hull: 100` - Starting station hull integrity
- `maxEnemies: 6` - Maximum enemies on screen
- `fireIntervalMs: 125` - Rate of fire (8 shots/second)
- `enemyDamage` - Damage dealt to station when enemies get through

## Development

See `docs/` for detailed documentation:
- `ARCHITECTURE.md` - System design and layering
- `TECHNICAL_REFERENCE.md` - API and configuration details
- `DEVELOPER_GUIDE.md` - Contributing guidelines
