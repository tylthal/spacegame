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

export interface Bullet {
  id: number;
  position: Vector2;
  velocity: Vector2;
  active: boolean;
}

export interface CombatOptions {
  hull: number;
  fireIntervalMs: number;
  enemyRadius: Record<EnemyKind, number>;
  enemySpeedPerMs: Record<EnemyKind, number>;
  enemyDamage: Record<EnemyKind, number>;
  baseY: number;
  bulletSpeed: number;
}

const DEFAULT_COMBAT_OPTIONS: CombatOptions = {
  hull: 100,
  fireIntervalMs: 125, // Much faster fire rate (approx 8 shots/sec)
  enemyRadius: { drone: 0.075, scout: 0.09, bomber: 0.12 },
  enemySpeedPerMs: { drone: 0.0006, scout: 0.00075, bomber: 0.0005 },
  enemyDamage: { drone: 5, scout: 8, bomber: 15 },
  baseY: 1,
  bulletSpeed: 0.008, // Faster projectiles for snappy feel
};

export interface CombatTickResult {
  timestamp: number;
  spawned: EnemyInstance[];
  destroyed: EnemyInstance[];
  hull: number;
}

export class CombatLoop {
  private readonly enemies: EnemyInstance[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly kills: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0 };
  private readonly spawns: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0 };

  // Public access for renderer
  public get activeEnemies(): ReadonlyArray<EnemyInstance> { return this.enemies; }
  public get activeBullets(): ReadonlyArray<Bullet> { return this.bullets; }

  // Player state
  private _playerX = 0;
  private _playerY = 0;
  public get playerX(): number { return this._playerX; }
  public get playerY(): number { return this._playerY; }

  // Firing state (controlled by pinch gesture)
  private _isFiring = false;
  public get isFiring(): boolean { return this._isFiring && !this._isOverheated; }

  // Heat system
  private _heat = 0;           // Current heat (0-100)
  private _isOverheated = false;
  private sinceLastShot = 450; // Start ready to fire immediately

  // Heat settings
  private readonly maxHeat = 100;
  private readonly heatPerShot = 5;            // Lower heat per shot for rapid fire
  private readonly heatCooldownPerMs = 0.08;   // Faster cooldown
  private readonly overheatCooldownPerMs = 0.03; // Slower cooldown when overheated
  private readonly overheatThreshold = 100;    // Heat level that triggers overheat
  private readonly overheatRecoveryThreshold = 30; // Must cool to this to recover

  public get heat(): number { return this._heat; }
  public get isOverheated(): boolean { return this._isOverheated; }

  private hull: number;
  private elapsedMs = 0;
  private enemyId = 0;
  private bulletId = 0;

  constructor(
    private readonly scheduler: SpawnScheduler,
    private readonly rng: RandomSource,
    private readonly options: CombatOptions = DEFAULT_COMBAT_OPTIONS,
  ) {
    this.hull = options.hull;
  }

  // Update player position (called by InputProcessor/App)
  public setPlayerPosition(x: number, y: number) {
    // Clamp to valid range [-1, 1] for X
    this._playerX = Math.max(-1, Math.min(1, x));
    // Y is roughly 0 (top) to 1 (base).
    this._playerY = Math.max(-1, Math.min(2, y)); // Allow some overflow?
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
    const bulletCollisions = this.advanceBullets(deltaMs);
    const destroyed = [...bulletCollisions];

    // Heat management
    if (this._isFiring && !this._isOverheated) {
      // While firing: accumulate shot timer and try to fire
      this.sinceLastShot += deltaMs;
    } else {
      // Not firing: cool down
      const cooldownRate = this._isOverheated ? this.overheatCooldownPerMs : this.heatCooldownPerMs;
      this._heat = Math.max(0, this._heat - cooldownRate * deltaMs);

      // Recover from overheat when cooled enough
      if (this._isOverheated && this._heat <= this.overheatRecoveryThreshold) {
        this._isOverheated = false;
      }
    }

    // Fire shots (auto-fire while holding, limited by overheat)
    this.spawnBullets();

    this.applyHullDamage();

    return {
      timestamp: this.elapsedMs,
      spawned,
      destroyed,
      hull: this.hull,
    };
  }

  summary(): { hull: number; kills: Record<EnemyKind, number>; spawns: Record<EnemyKind, number>; active: number; elapsedMs: number; heat: number; isOverheated: boolean } {
    return {
      hull: this.hull,
      kills: { ...this.kills },
      spawns: { ...this.spawns },
      active: this.enemies.length,
      elapsedMs: this.elapsedMs,
      heat: this._heat,
      isOverheated: this._isOverheated,
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

  private advanceBullets(deltaMs: number): EnemyInstance[] {
    const destroyed: EnemyInstance[] = [];

    // Iterate backwards so we can swap-remove without breaking indices
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      // Move bullet
      bullet.position.x += bullet.velocity.x * deltaMs;
      bullet.position.y += bullet.velocity.y * deltaMs;

      // Check for collisions
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dist = Math.hypot(bullet.position.x - enemy.position.x, bullet.position.y - enemy.position.y);

        // Simple point-circle collision for bullets
        if (dist < this.options.enemyRadius[enemy.kind]) {
          // Hit!
          destroyed.push(enemy);
          this.enemies.splice(j, 1);
          this.kills[enemy.kind] += 1;
          hit = true;
          break; // Bullet destroys only one enemy
        }
      }

      // Check bounds (off screen top) or hit
      if (hit || bullet.position.y < -1.5) {
        // Recycle bullet to pool
        bullet.active = false;
        this.bulletPool.push(bullet);

        // Swap-Pop Removal (O(1))
        // 1. Overwrite current element with the last element
        this.bullets[i] = this.bullets[this.bullets.length - 1];
        // 2. Remove the last element
        this.bullets.pop();
      }
    }

    return destroyed;
  }

  // Object pool for active bullets to reduce GC
  // We grow this on demand.
  private readonly bulletPool: Bullet[] = [];

  private spawnBullets(): void {
    // Only fire if pinching and not overheated
    if (!this._isFiring || this._isOverheated) {
      return;
    }

    // Auto-fire while holding (limited by fire rate)
    while (this.sinceLastShot >= this.options.fireIntervalMs) {
      this.sinceLastShot -= this.options.fireIntervalMs;

      // Add heat for this shot
      this._heat += this.heatPerShot;

      // Check for overheat
      if (this._heat >= this.overheatThreshold) {
        this._heat = this.maxHeat;
        this._isOverheated = true;
      }

      // console.log("FIRING BULLET", this.activeBullets.length + 1);


      // Fire from the Player's position UPWARDS (towards y=0 / depth)
      const startX = this._playerX;
      const startY = this._playerY;

      // Fire straight up in logic space (which becomes "forward" in 3D view)
      // Enemies are at y=0, Player is at y=1. Direction is negative Y.
      const speed = this.options.bulletSpeed;

      const velocity = {
        x: 0,          // No horizontal spread for now, precise shooting
        y: -speed,     // Negative Y = Up/Forward
      };

      this.bulletId++;

      // Try to reuse from pool
      let bullet = this.bulletPool.pop();
      if (!bullet) {
        // Pool empty, create new (allocate)
        bullet = {
          id: this.bulletId,
          position: { x: startX, y: startY },
          velocity: velocity, // This allocates a new object, could be optimized further with Vector2 pool
          active: true,
        };
      } else {
        // Reset pooled bullet
        bullet.id = this.bulletId;
        bullet.position.x = startX;
        bullet.position.y = startY;
        bullet.velocity = velocity; // Replaces ref, but old ref is garbage. Ideally copy x/y to avoid alloc.
        bullet.active = true;
      }

      this.bullets.push(bullet);

      // Stop firing more this frame if overheated
      if (this._isOverheated) break;
    }
  }

  // Legacy method placeholder
  private fireShots(): EnemyInstance[] {
    return [];
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
