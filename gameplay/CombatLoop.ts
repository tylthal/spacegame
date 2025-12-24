import type { EnemyKind } from '../rendering/EnemyFactory';
import { segmentHitsCircle, type Vector2 } from './Collision';
import { SpawnScheduler } from './SpawnScheduler';
import type { RandomSource } from './Rng';

export interface EnemyInstance {
  id: number;
  kind: EnemyKind;
  position: Vector2;
  velocity: Vector2;
}

export interface CombatOptions {
  hull: number;
  fireIntervalMs: number;
  enemyRadius: Record<EnemyKind, number>;
  enemySpeedPerMs: Record<EnemyKind, number>;
  enemyDamage: Record<EnemyKind, number>;
  baseY: number;
}

export interface CombatTickResult {
  timestamp: number;
  spawned: EnemyInstance[];
  destroyed: EnemyInstance[];
  hull: number;
}

const DEFAULT_COMBAT_OPTIONS: CombatOptions = {
  hull: 100,
  fireIntervalMs: 450,
  enemyRadius: { drone: 0.075, scout: 0.09, bomber: 0.12 },
  enemySpeedPerMs: { drone: 0.0006, scout: 0.00075, bomber: 0.0005 },
  enemyDamage: { drone: 5, scout: 8, bomber: 15 },
  baseY: 1,
};

export class CombatLoop {
  private readonly enemies: EnemyInstance[] = [];
  private readonly kills: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0 };
  private readonly spawns: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0 };

  // Public access for renderer
  public get activeEnemies(): ReadonlyArray<EnemyInstance> { return this.enemies; }

  // Player state
  private _playerX = 0;
  public get playerX(): number { return this._playerX; }

  // Firing state (controlled by pinch gesture)
  private _isFiring = false;
  private _wasFiring = false;
  public get isFiring(): boolean { return this._isFiring; }

  private hull: number;
  private elapsedMs = 0;
  private enemyId = 0;

  constructor(
    private readonly scheduler: SpawnScheduler,
    private readonly rng: RandomSource,
    private readonly options: CombatOptions = DEFAULT_COMBAT_OPTIONS,
  ) {
    this.hull = options.hull;
  }

  // Update player position (called by InputProcessor/App)
  public setPlayerX(x: number) {
    // Clamp to valid range [-1, 1]
    this._playerX = Math.max(-1, Math.min(1, x));
  }

  // Set firing state (true = pinching/firing)
  public setFiring(firing: boolean) {
    this._isFiring = firing;
  }

  tick(deltaMs: number): CombatTickResult {
    if (deltaMs < 0) throw new Error('deltaMs must be non-negative');

    this.elapsedMs += deltaMs;

    const spawned = this.scheduler.step(deltaMs).map(event => this.createEnemy(event.kind));
    spawned.forEach(enemy => this.enemies.push(enemy));

    this.advanceEnemies(deltaMs);

    // Fire only on pinch START (edge trigger)
    const destroyed = this.fireShots();
    this._wasFiring = this._isFiring;

    this.applyHullDamage();

    return {
      timestamp: this.elapsedMs,
      spawned,
      destroyed,
      hull: this.hull,
    };
  }

  summary(): { hull: number; kills: Record<EnemyKind, number>; spawns: Record<EnemyKind, number>; active: number; elapsedMs: number } {
    return {
      hull: this.hull,
      kills: { ...this.kills },
      spawns: { ...this.spawns },
      active: this.enemies.length,
      elapsedMs: this.elapsedMs,
    };
  }

  private createEnemy(kind: EnemyKind): EnemyInstance {
    this.enemyId += 1;
    this.spawns[kind] += 1;
    return {
      id: this.enemyId,
      kind,
      position: { x: this.randomX(), y: 0 },
      velocity: { x: 0, y: this.options.enemySpeedPerMs[kind] },
    };
  }

  private randomX(): number {
    return -0.9 + this.rng.next() * 1.8;
  }

  private advanceEnemies(deltaMs: number): void {
    for (const enemy of this.enemies) {
      enemy.position = {
        x: enemy.position.x + enemy.velocity.x * deltaMs,
        y: enemy.position.y + enemy.velocity.y * deltaMs,
      };
    }
  }

  private fireShots(): EnemyInstance[] {
    const destroyed: EnemyInstance[] = [];

    // Only fire on pinch START (rising edge - was not firing, now firing)
    if (!this._isFiring || this._wasFiring) {
      return destroyed;
    }

    // Fire from base (y=1) toward cursor aim (y=-1)
    // Shot goes from bottom center (0, 1) toward the cursor X position
    const shotStart = { x: 0, y: this.options.baseY }; // Origin: bottom center
    const shotEnd = { x: this._playerX, y: -1 };       // Target: cursor position extended

    // Simple collision check against all enemies
    let hitEnemyIndex = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (segmentHitsCircle(shotStart, shotEnd, enemy.position, this.options.enemyRadius[enemy.kind])) {
        // Find closest hit to the base (highest Y value)
        const dist = this.options.baseY - enemy.position.y;
        if (dist < closestDist) {
          closestDist = dist;
          hitEnemyIndex = i;
        }
      }
    }

    if (hitEnemyIndex !== -1) {
      const [hit] = this.enemies.splice(hitEnemyIndex, 1);
      destroyed.push(hit);
      this.kills[hit.kind] += 1;
    }

    return destroyed;
  }

  private applyHullDamage(): void {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.position.y >= this.options.baseY) {
        this.hull = Math.max(0, this.hull - this.options.enemyDamage[enemy.kind]);
        this.enemies.splice(i, 1);
      }
    }
  }
}
