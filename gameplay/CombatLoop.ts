import type { EnemyKind } from '../rendering/EnemyFactory';
import { segmentHitsSphere, type Vector3 } from './Collision';
import { SpawnScheduler } from './SpawnScheduler';
import type { RandomSource } from './Rng';

export interface EnemyInstance {
  id: number;
  kind: EnemyKind;
  position: Vector3;
  velocity: Vector3;
}

export interface Bullet {
  id: number;
  position: Vector3;
  velocity: Vector3;
  active: boolean;
}

/**
 * Combat configuration options.
 * The player defends a space station from incoming enemy drones.
 * "hull" represents the station's hull integrity - enemies that reach
 * or fly past the player deal damage to the station.
 */
export interface CombatOptions {
  hull: number; // Space station hull integrity (0-100)
  fireIntervalMs: number;
  enemyRadius: Record<EnemyKind, number>;
  enemySpeedPerMs: Record<EnemyKind, number>;
  enemyDamage: Record<EnemyKind, number>; // Damage dealt to station when enemy gets through
  spawnRadius: number; // Distance at which enemies spawn
  bulletSpeed: number;
  maxEnemies: number; // Maximum enemies on screen at once
}

const DEFAULT_COMBAT_OPTIONS: CombatOptions = {
  hull: 100,
  fireIntervalMs: 125,
  enemyRadius: { drone: 1.5, scout: 2.0, bomber: 2.5 }, // Increased for 3D scale
  enemySpeedPerMs: { drone: 0.02, scout: 0.015, bomber: 0.01 }, // Faster to cover distance
  enemyDamage: { drone: 5, scout: 8, bomber: 15 },
  spawnRadius: 250, // Increased from 150 - enemies spawn farther away
  bulletSpeed: 0.08, // Slowed from 0.2 - visible travel time, requires leading targets
  maxEnemies: 6, // Limit enemies on screen
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

  // Player state - Raw cursor position (0..1 range)
  // Used for inverse projection targeting
  private _cursorX = 0.5; // 0=left, 1=right
  private _cursorY = 0.5; // 0=top, 1=bottom

  // Expose for external use (renderer crosshair, etc.)
  public get cursorX(): number { return this._cursorX; }
  public get cursorY(): number { return this._cursorY; }


  // Firing state
  private _isFiring = false;
  public get isFiring(): boolean { return this._isFiring && !this._isOverheated; }

  // Heat system
  private _heat = 0;
  private _isOverheated = false;
  private sinceLastShot = 450;
  private readonly maxHeat = 100;
  private readonly heatPerShot = 1.67; // Reduced from 5 (takes 3x longer to overheat)
  private readonly heatCooldownPerMs = 0.08;
  private readonly overheatCooldownPerMs = 0.03;
  private readonly overheatThreshold = 100;
  private readonly overheatRecoveryThreshold = 30;

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

  // Set Aim from Input (0..1 range)
  // Stores raw cursor position for inverse projection targeting
  public setPlayerPosition(x: number, y: number) {
    this._cursorX = Math.max(0, Math.min(1, x));
    this._cursorY = Math.max(0, Math.min(1, y));
  }

  public reset(): void {
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.bulletPool.length = 0;
    this.hull = this.options.hull;
    this.elapsedMs = 0;
    this.enemyId = 0;
    this.bulletId = 0;
    this._heat = 0;
    this._isOverheated = false;
    this._isFiring = false;
    this.sinceLastShot = 450;
    this.kills.drone = 0;
    this.kills.scout = 0;
    this.kills.bomber = 0;
    this.spawns.drone = 0;
    this.spawns.scout = 0;
    this.spawns.bomber = 0;
    this.scheduler.reset();
  }

  public setFiring(firing: boolean) {
    this._isFiring = firing;
  }

  tick(deltaMs: number): CombatTickResult {
    if (deltaMs < 0) throw new Error('deltaMs must be non-negative');
    this.elapsedMs += deltaMs;

    // Spawn Logic - respect max enemies limit
    const spawnEvents = this.scheduler.step(deltaMs);
    const spawned: EnemyInstance[] = [];
    for (const event of spawnEvents) {
      if (this.enemies.length >= this.options.maxEnemies) break;
      const enemy = this.createEnemy(event.kind);
      this.enemies.push(enemy);
      spawned.push(enemy);
    }

    // Move Entities
    this.advanceEnemies(deltaMs);
    const bulletCollisions = this.advanceBullets(deltaMs);
    const destroyed = [...bulletCollisions];

    // Heat Logic
    if (this._isFiring && !this._isOverheated) {
      this.sinceLastShot += deltaMs;
    } else {
      const cooldownRate = this._isOverheated ? this.overheatCooldownPerMs : this.heatCooldownPerMs;
      this._heat = Math.max(0, this._heat - cooldownRate * deltaMs);
      if (this._isOverheated && this._heat <= this.overheatRecoveryThreshold) {
        this._isOverheated = false;
      }
    }

    this.spawnBullets();
    this.applyStationDamage();

    return {
      timestamp: this.elapsedMs,
      spawned,
      destroyed,
      hull: this.hull,
    };
  }

  summary() {
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

    // Spawn in Forward Cone (Sector) - CONSTRAINED TO CAMERA FOV
    // Camera FOV: 60° vertical, ~90° horizontal (16:9 aspect)
    // Spawn slightly inside FOV edges to ensure enemies are always visible
    const SPAWN_YAW = Math.PI / 4; // 45 degrees width (+/- 22.5) - fits in ~90° horizontal FOV
    const SPAWN_PITCH = Math.PI / 6; // 30 degrees height - fits in 60° vertical FOV

    // Yaw: Random across width (-0.5 to 0.5)
    const u = this.rng.next() - 0.5;
    // Pitch: Biased upward (spawn in upper portion of screen)
    const v = this.rng.next() * 0.7 + 0.1; // Range: 0.1 to 0.8 (top-biased, within FOV)

    const yaw = u * SPAWN_YAW;
    const pitch = v * SPAWN_PITCH; // Positive = above center, within FOV

    const r = this.options.spawnRadius;

    // Euler to Cartesian (Forward is -Z)
    // x = r * sin(yaw) * cos(pitch)
    // y = r * sin(pitch)
    // z = -r * cos(yaw) * cos(pitch)

    const x = r * Math.sin(yaw) * Math.cos(pitch);
    const y = r * Math.sin(pitch);
    const z = -r * Math.cos(yaw) * Math.cos(pitch);

    // Velocity: Target is area below/behind player
    // Base Target: (0, -5, 2)
    // Add variance to make paths distinct
    const targetX = (this.rng.next() - 0.5) * 15; // +/- 7.5 width variance
    const targetY = -8 + (this.rng.next() - 0.5) * 4; // -10 to -6 height
    const targetZ = 10 + (this.rng.next() - 0.5) * 10; // 5 to 15 depth (fly past player)

    const dx = targetX - x;
    const dy = targetY - y;
    const dz = targetZ - z;

    const dist = Math.hypot(dx, dy, dz);
    const speed = this.options.enemySpeedPerMs[kind];
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    const vz = (dz / dist) * speed;

    return {
      id: this.enemyId,
      kind,
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
    };
  }

  private advanceEnemies(deltaMs: number): void {
    for (const enemy of this.enemies) {
      enemy.position.x += enemy.velocity.x * deltaMs;
      enemy.position.y += enemy.velocity.y * deltaMs;
      enemy.position.z += enemy.velocity.z * deltaMs;
    }
  }

  private advanceBullets(deltaMs: number): EnemyInstance[] {
    const destroyed: EnemyInstance[] = [];
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      const px = bullet.position.x;
      const py = bullet.position.y;
      const pz = bullet.position.z;

      // Update Pos
      bullet.position.x += bullet.velocity.x * deltaMs;
      bullet.position.y += bullet.velocity.y * deltaMs;
      bullet.position.z += bullet.velocity.z * deltaMs;

      const nextPx = bullet.position.x;
      const nextPy = bullet.position.y;
      const nextPz = bullet.position.z;

      // Check Collision with all Enemies
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (segmentHitsSphere(
          { x: px, y: py, z: pz },
          { x: nextPx, y: nextPy, z: nextPz },
          enemy.position,
          this.options.enemyRadius[enemy.kind]
        )) {
          destroyed.push(enemy);
          this.enemies.splice(j, 1);
          this.kills[enemy.kind] += 1;
          hit = true;
          break;
        }
      }

      // Despawn if too far (Range check > Spawn Radius + Buffer)
      const distSq = nextPx * nextPx + nextPy * nextPy + nextPz * nextPz;
      if (hit || distSq > (this.options.spawnRadius * 1.5) ** 2) {
        bullet.active = false;
        this.bulletPool.push(bullet);
        this.bullets[i] = this.bullets[this.bullets.length - 1];
        this.bullets.pop();
      }
    }
    return destroyed;
  }

  private readonly bulletPool: Bullet[] = [];

  private spawnBullets(): void {
    if (!this._isFiring || this._isOverheated) return;

    while (this.sinceLastShot >= this.options.fireIntervalMs) {
      this.sinceLastShot -= this.options.fireIntervalMs;
      this._heat += this.heatPerShot;
      if (this._heat >= this.overheatThreshold) {
        this._heat = this.maxHeat;
        this._isOverheated = true;
      }

      const speed = this.options.bulletSpeed;

      // ===== TARGETING OVERHAUL =====
      // Fixed muzzle at VISUAL bottom-center of screen, bullets travel to target point

      // Camera properties (must match Three.js camera)
      const VERTICAL_FOV = 60 * (Math.PI / 180); // 60 degrees
      const ASPECT_RATIO = typeof window !== 'undefined'
        ? window.innerWidth / window.innerHeight
        : 16 / 9;

      // 1. MUZZLE: Fixed at visual BOTTOM-CENTER of screen
      // At MUZZLE_DISTANCE, the bottom of the screen is at Y = -distance * tan(FOV/2)
      const MUZZLE_DISTANCE = 5; // Small distance in front of camera
      const muzzleHalfHeight = MUZZLE_DISTANCE * Math.tan(VERTICAL_FOV / 2);
      const MUZZLE_X = 0;
      const MUZZLE_Y = -muzzleHalfHeight;
      const MUZZLE_Z = -MUZZLE_DISTANCE;

      // 2. TARGET: Calculate using inverse projection (camera FOV)
      const TARGET_DISTANCE = 100;

      // Half-extents of virtual screen at TARGET_DISTANCE
      const halfHeight = TARGET_DISTANCE * Math.tan(VERTICAL_FOV / 2);
      const halfWidth = halfHeight * ASPECT_RATIO;

      // Convert cursor (0..1) to world coordinates
      // cursorX: 0=left, 1=right -> targetX: -halfWidth to +halfWidth
      // cursorY: 0=top, 1=bottom -> targetY: +halfHeight to -halfHeight
      const targetX = (this._cursorX - 0.5) * 2 * halfWidth;
      const targetY = (0.5 - this._cursorY) * 2 * halfHeight;
      const targetZ = -TARGET_DISTANCE; // Forward is -Z

      // 3. BULLET DIRECTION: Parallel ray from origin to target
      // Direction is calculated from camera origin (0,0,0), NOT from muzzle
      // This ensures bullets travel parallel to the camera ray at all distances
      // Fixes: far enemies were easier to hit due to bullet convergence at Z=-100
      const dx = targetX; // targetX - 0 (origin)
      const dy = targetY; // targetY - 0 (origin)
      const dz = targetZ; // targetZ - 0 (origin)
      const dist = Math.hypot(dx, dy, dz);

      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
      const vz = (dz / dist) * speed;

      // 4. SPAWN: At muzzle with calculated velocity
      this.bulletId++;
      let bullet = this.bulletPool.pop();
      if (!bullet) {
        bullet = {
          id: this.bulletId,
          position: { x: MUZZLE_X, y: MUZZLE_Y, z: MUZZLE_Z },
          velocity: { x: vx, y: vy, z: vz },
          active: true,
        };
      } else {
        bullet.id = this.bulletId;
        bullet.position.x = MUZZLE_X; bullet.position.y = MUZZLE_Y; bullet.position.z = MUZZLE_Z;
        bullet.velocity.x = vx; bullet.velocity.y = vy; bullet.velocity.z = vz;
        bullet.active = true;
      }
      this.bullets.push(bullet);

      if (this._isOverheated) break;
    }
  }

  /**
   * Check for enemies that reached/passed the player and apply station damage.
   * The player is positioned in front of a space station - any enemy that
   * gets past the player's defensive position damages the station.
   */
  private applyStationDamage(): void {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];

      // Check 1: Enemy collided with the player position (within 2 meter radius)
      const distSq = enemy.position.x ** 2 + enemy.position.y ** 2 + enemy.position.z ** 2;
      if (distSq < 2 * 2) {
        this.hull = Math.max(0, this.hull - this.options.enemyDamage[enemy.kind]);
        this.enemies.splice(i, 1);
        continue;
      }

      // Check 2: Enemy flew past the player and reached the station (Z > 20)
      // These enemies bypassed defenses and hit the station directly
      if (enemy.position.z > 20) {
        this.hull = Math.max(0, this.hull - this.options.enemyDamage[enemy.kind]);
        this.enemies.splice(i, 1);
        continue;
      }
    }
  }
}
