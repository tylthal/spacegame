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

  private hull: number;
  private elapsedMs = 0;
  private sinceLastShot = 0;
  private enemyId = 0;

  constructor(
    private readonly scheduler: SpawnScheduler,
    private readonly rng: RandomSource,
    private readonly options: CombatOptions = DEFAULT_COMBAT_OPTIONS,
  ) {
    this.hull = options.hull;
  }

  tick(deltaMs: number): CombatTickResult {
    if (deltaMs < 0) throw new Error('deltaMs must be non-negative');

    this.elapsedMs += deltaMs;
    this.sinceLastShot += deltaMs;

    const spawned = this.scheduler.step(deltaMs).map(event => this.createEnemy(event.kind));
    spawned.forEach(enemy => this.enemies.push(enemy));

    this.advanceEnemies(deltaMs);
    const destroyed = this.fireShots();
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
    while (this.sinceLastShot >= this.options.fireIntervalMs) {
      this.sinceLastShot -= this.options.fireIntervalMs;
      if (this.enemies.length === 0) continue;

      const targetIndex = this.enemies.reduce((bestIndex, enemy, index, list) => {
        if (bestIndex === -1) return index;
        return list[index].position.y > list[bestIndex].position.y ? index : bestIndex;
      }, -1);

      const target = this.enemies[targetIndex];
      const shotStart = { x: target.position.x, y: this.options.baseY };
      const shotEnd = { x: target.position.x, y: -1 };

      if (segmentHitsCircle(shotStart, shotEnd, target.position, this.options.enemyRadius[target.kind])) {
        const [hit] = this.enemies.splice(targetIndex, 1);
        destroyed.push(hit);
        this.kills[hit.kind] += 1;
      }
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
