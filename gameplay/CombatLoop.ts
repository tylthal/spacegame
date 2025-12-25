import type { EnemyKind } from '../rendering/EnemyFactory';
import { segmentHitsSphere, type Vector3 } from './Collision';
import { SpawnScheduler } from './SpawnScheduler';
import type { RandomSource } from './Rng';

export interface EnemyInstance {
  id: number;
  kind: EnemyKind;
  position: Vector3;
  velocity: Vector3;
  // Weaver corkscrew movement parameters (randomized per enemy)
  wavePhase?: number;
  waveAmplitude?: number; // How far it spirals from trajectory
  waveFrequency?: number; // How fast it spirals
}

export interface Bullet {
  id: number;
  position: Vector3;
  velocity: Vector3;
  active: boolean;
}

export interface Missile {
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
  enemyRadius: { drone: 1.5, scout: 2.0, bomber: 2.5, weaver: 1.8 }, // Weaver is medium-sized
  enemySpeedPerMs: { drone: 0.02, scout: 0.015, bomber: 0.01, weaver: 0.012 }, // Weaver moves slower
  enemyDamage: { drone: 5, scout: 8, bomber: 15, weaver: 7 }, // Medium damage
  spawnRadius: 400, // Enemies spawn far in the distance
  bulletSpeed: 0.18, // Faster bullets = less lead required when aiming
  maxEnemies: 6, // Limit enemies on screen
};

// Weaver spawn limits
const MAX_WEAVERS = 2;
const WEAVER_SPAWN_COOLDOWN_MS = 3000; // 3 seconds between weaver spawns

export interface CombatTickResult {
  timestamp: number;
  spawned: EnemyInstance[];
  destroyed: EnemyInstance[];
  hull: number;
}

export class CombatLoop {
  private readonly enemies: EnemyInstance[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly missiles: Missile[] = [];
  private readonly kills: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0, weaver: 0 };
  private readonly spawns: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0, weaver: 0 };

  // Public access for renderer
  public get activeEnemies(): ReadonlyArray<EnemyInstance> { return this.enemies; }
  public get activeBullets(): ReadonlyArray<Bullet> { return this.bullets; }
  public get activeMissiles(): ReadonlyArray<Missile> { return this.missiles; }

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

  // Missile state (fist gesture)
  private _isFiringMissile = false;
  private missileCooldownMs = 0;
  private readonly missileCooldownDuration = 5000; // 5 seconds between missiles
  private readonly missileSpeed = 0.08; // Slower than bullets (0.18)
  private readonly missileProximityRadius = 8; // Detonation proximity
  private readonly missileBlastRadius = 15; // Area damage radius
  private missileId = 0;
  private readonly missilePool: Missile[] = [];

  // Public missile state for UI
  public get missileReady(): boolean { return this.missileCooldownMs <= 0; }
  public get missileCooldownProgress(): number {
    if (this.missileCooldownMs <= 0) return 1;
    return 1 - (this.missileCooldownMs / this.missileCooldownDuration);
  }

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
  private weaverSpawnCooldown = 0; // Stagger weaver spawns

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
    this.missiles.length = 0;
    this.bulletPool.length = 0;
    this.missilePool.length = 0;
    this.hull = this.options.hull;
    this.elapsedMs = 0;
    this.enemyId = 0;
    this.bulletId = 0;
    this.missileId = 0;
    this.missileCooldownMs = 0;
    this._heat = 0;
    this._isOverheated = false;
    this._isFiring = false;
    this._isFiringMissile = false;
    this.sinceLastShot = 450;
    this.kills.drone = 0;
    this.kills.scout = 0;
    this.kills.bomber = 0;
    this.kills.weaver = 0;
    this.spawns.drone = 0;
    this.spawns.scout = 0;
    this.spawns.bomber = 0;
    this.spawns.weaver = 0;
    this.weaverSpawnCooldown = 0;
    this.scheduler.reset();
  }

  public setFiring(firing: boolean) {
    this._isFiring = firing;
  }

  public setFiringMissile(firing: boolean) {
    this._isFiringMissile = firing;
  }

  tick(deltaMs: number): CombatTickResult {
    if (deltaMs < 0) throw new Error('deltaMs must be non-negative');
    this.elapsedMs += deltaMs;

    // Update weaver spawn cooldown
    if (this.weaverSpawnCooldown > 0) {
      this.weaverSpawnCooldown = Math.max(0, this.weaverSpawnCooldown - deltaMs);
    }

    // Spawn Logic - respect max enemies and weaver limits
    const spawnEvents = this.scheduler.step(deltaMs);
    const spawned: EnemyInstance[] = [];
    for (const event of spawnEvents) {
      if (this.enemies.length >= this.options.maxEnemies) break;

      // Weaver spawn limits: max 2 at a time, staggered spawns
      if (event.kind === 'weaver') {
        const currentWeavers = this.enemies.filter(e => e.kind === 'weaver').length;
        if (currentWeavers >= MAX_WEAVERS || this.weaverSpawnCooldown > 0) {
          continue; // Skip this weaver spawn
        }
        this.weaverSpawnCooldown = WEAVER_SPAWN_COOLDOWN_MS;
      }

      const enemy = this.createEnemy(event.kind);
      this.enemies.push(enemy);
      spawned.push(enemy);
    }

    // Move Entities
    this.advanceEnemies(deltaMs);
    const bulletCollisions = this.advanceBullets(deltaMs);
    const missileCollisions = this.advanceMissiles(deltaMs);
    const destroyed = [...bulletCollisions, ...missileCollisions];

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

    // Missile cooldown
    if (this.missileCooldownMs > 0) {
      this.missileCooldownMs = Math.max(0, this.missileCooldownMs - deltaMs);
    }

    this.spawnBullets();
    this.spawnMissiles();
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
      missileReady: this.missileReady,
      missileCooldownProgress: this.missileCooldownProgress,
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

    // Initialize weaver corkscrew parameters (randomized per enemy)
    let wavePhase: number | undefined;
    let waveAmplitude: number | undefined;
    let waveFrequency: number | undefined;

    if (kind === 'weaver') {
      wavePhase = this.rng.next() * Math.PI * 2; // Random starting angle
      waveAmplitude = 4 + this.rng.next() * 8; // 4-12 units radius
      waveFrequency = 0.0005 + this.rng.next() * 0.001; // 0.0005-0.0015 cycles/ms (slower spin)
    }

    return {
      id: this.enemyId,
      kind,
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
      wavePhase,
      waveAmplitude,
      waveFrequency,
    };
  }

  private advanceEnemies(deltaMs: number): void {
    for (const enemy of this.enemies) {
      // Base movement
      enemy.position.x += enemy.velocity.x * deltaMs;
      enemy.position.y += enemy.velocity.y * deltaMs;
      enemy.position.z += enemy.velocity.z * deltaMs;

      // Weaver corkscrew movement (spirals around trajectory line)
      if (enemy.kind === 'weaver' && enemy.wavePhase !== undefined &&
        enemy.waveAmplitude !== undefined && enemy.waveFrequency !== undefined) {
        // Update phase based on time
        enemy.wavePhase += enemy.waveFrequency * deltaMs;

        // Calculate corkscrew offset (perpendicular to velocity in both X and Y)
        // This creates a helical spiral around the forward trajectory
        const spiralX = Math.cos(enemy.wavePhase) * enemy.waveAmplitude * 0.008 * deltaMs;
        const spiralY = Math.sin(enemy.wavePhase) * enemy.waveAmplitude * 0.008 * deltaMs;

        enemy.position.x += spiralX;
        enemy.position.y += spiralY;
      }
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
      // Use swept collision: check against enemy's previous AND current position
      // This prevents enemies slipping through bullets between frames
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const baseRadius = this.options.enemyRadius[enemy.kind];

        // Distance-scaled hitbox: closer enemies have larger effective hitbox
        // At distance 0-50: up to 2x base radius
        // At distance 50+: normal radius
        const enemyDist = Math.abs(enemy.position.z);
        const CLOSE_RANGE = 50;
        const MAX_SCALE = 2.0;
        const distanceScale = enemyDist < CLOSE_RANGE
          ? 1 + (MAX_SCALE - 1) * (1 - enemyDist / CLOSE_RANGE)
          : 1.0;
        const radius = baseRadius * distanceScale;

        // Calculate enemy's previous position (before advanceEnemies moved them)
        const prevEnemyX = enemy.position.x - enemy.velocity.x * deltaMs;
        const prevEnemyY = enemy.position.y - enemy.velocity.y * deltaMs;
        const prevEnemyZ = enemy.position.z - enemy.velocity.z * deltaMs;

        // Check both: current position AND previous position
        const hitsCurrent = segmentHitsSphere(
          { x: px, y: py, z: pz },
          { x: nextPx, y: nextPy, z: nextPz },
          enemy.position,
          radius
        );

        const hitsPrevious = segmentHitsSphere(
          { x: px, y: py, z: pz },
          { x: nextPx, y: nextPy, z: nextPz },
          { x: prevEnemyX, y: prevEnemyY, z: prevEnemyZ },
          radius
        );

        if (hitsCurrent || hitsPrevious) {
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

      // ===== TARGETING SYSTEM =====
      // Muzzle at bottom of screen (camera-local), target at crosshair (world space)

      // Camera properties (must match Three.js camera in ThreeRenderer.tsx)
      const VERTICAL_FOV = 60 * (Math.PI / 180); // 60 degrees
      const ASPECT_RATIO = typeof window !== 'undefined'
        ? window.innerWidth / window.innerHeight
        : 16 / 9;

      // Camera position (from ThreeRenderer.tsx: camera={{ position: [0, 3, 5] }})
      const CAMERA_Y = 3;
      const CAMERA_Z = 5;

      // 1. MUZZLE: At bottom of screen, a few units in front of camera
      // Camera looks toward -Z, so muzzle Z should be less than CAMERA_Z
      const MUZZLE_DISTANCE = 8; // Distance in front of camera (along -Z)
      const muzzleHalfHeight = MUZZLE_DISTANCE * Math.tan(VERTICAL_FOV / 2);
      const MUZZLE_X = 0;
      const MUZZLE_Y = CAMERA_Y - muzzleHalfHeight * 0.95; // 95% down = near bottom of screen
      const MUZZLE_Z = CAMERA_Z - MUZZLE_DISTANCE; // In front of camera

      // 2. TARGET: Where crosshair is pointing in world space (far away)
      const TARGET_DISTANCE = 100;
      const targetHalfHeight = TARGET_DISTANCE * Math.tan(VERTICAL_FOV / 2);
      const targetHalfWidth = targetHalfHeight * ASPECT_RATIO;

      // Convert cursor (0..1) to world position at target distance
      const targetX = (this._cursorX - 0.5) * 2 * targetHalfWidth;
      const targetY = CAMERA_Y + (0.5 - this._cursorY) * 2 * targetHalfHeight;
      const targetZ = CAMERA_Z - TARGET_DISTANCE;

      // 3. BULLET DIRECTION: From MUZZLE to target
      const dx = targetX - MUZZLE_X;
      const dy = targetY - MUZZLE_Y;
      const dz = targetZ - MUZZLE_Z;
      const dist = Math.hypot(dx, dy, dz);
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;
      const vz = (dz / dist) * speed;

      // 4. SPAWN: At muzzle position
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

  /**
   * Spawn missiles when fist gesture is detected and cooldown allows
   */
  private spawnMissiles(): void {
    if (!this._isFiringMissile || this.missileCooldownMs > 0) return;

    // Fire one missile and start cooldown
    this.missileCooldownMs = this.missileCooldownDuration;
    const speed = this.missileSpeed;

    // Use same targeting system as bullets
    const VERTICAL_FOV = 60 * (Math.PI / 180);
    const ASPECT_RATIO = typeof window !== 'undefined'
      ? window.innerWidth / window.innerHeight
      : 16 / 9;

    // Camera offset (must match ThreeRenderer.tsx)
    const CAMERA_Y = 3;
    const CAMERA_Z = 5;

    // Muzzle at bottom of visible screen
    const MUZZLE_DISTANCE = 8;
    const muzzleHalfHeight = MUZZLE_DISTANCE * Math.tan(VERTICAL_FOV / 2);
    const MUZZLE_X = 0;
    const MUZZLE_Y = CAMERA_Y - muzzleHalfHeight * 0.95;
    const MUZZLE_Z = CAMERA_Z - MUZZLE_DISTANCE;

    const TARGET_DISTANCE = 100;
    const targetHalfHeight = TARGET_DISTANCE * Math.tan(VERTICAL_FOV / 2);
    const targetHalfWidth = targetHalfHeight * ASPECT_RATIO;

    const targetX = (this._cursorX - 0.5) * 2 * targetHalfWidth;
    const targetY = CAMERA_Y + (0.5 - this._cursorY) * 2 * targetHalfHeight;
    const targetZ = CAMERA_Z - TARGET_DISTANCE;

    const dx = targetX - MUZZLE_X;
    const dy = targetY - MUZZLE_Y;
    const dz = targetZ - MUZZLE_Z;
    const dist = Math.hypot(dx, dy, dz);
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    const vz = (dz / dist) * speed;

    this.missileId++;
    let missile = this.missilePool.pop();
    if (!missile) {
      missile = {
        id: this.missileId,
        position: { x: MUZZLE_X, y: MUZZLE_Y, z: MUZZLE_Z },
        velocity: { x: vx, y: vy, z: vz },
        active: true,
      };
    } else {
      missile.id = this.missileId;
      missile.position.x = MUZZLE_X; missile.position.y = MUZZLE_Y; missile.position.z = MUZZLE_Z;
      missile.velocity.x = vx; missile.velocity.y = vy; missile.velocity.z = vz;
      missile.active = true;
    }
    this.missiles.push(missile);
  }

  /**
   * Advance missiles and check for proximity detonation with area damage
   */
  private advanceMissiles(deltaMs: number): EnemyInstance[] {
    const destroyed: EnemyInstance[] = [];

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      if (!missile.active) continue;

      // Move missile
      missile.position.x += missile.velocity.x * deltaMs;
      missile.position.y += missile.velocity.y * deltaMs;
      missile.position.z += missile.velocity.z * deltaMs;

      // Check proximity to any enemy
      let detonated = false;
      for (const enemy of this.enemies) {
        const dx = missile.position.x - enemy.position.x;
        const dy = missile.position.y - enemy.position.y;
        const dz = missile.position.z - enemy.position.z;
        const dist = Math.hypot(dx, dy, dz);

        if (dist <= this.missileProximityRadius) {
          // DETONATE - area damage
          detonated = true;
          break;
        }
      }

      if (detonated) {
        // Apply area damage to all enemies in blast radius
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const dx = missile.position.x - enemy.position.x;
          const dy = missile.position.y - enemy.position.y;
          const dz = missile.position.z - enemy.position.z;
          const dist = Math.hypot(dx, dy, dz);

          if (dist <= this.missileBlastRadius) {
            destroyed.push(enemy);
            this.enemies.splice(j, 1);
            this.kills[enemy.kind] += 1;
          }
        }

        // Remove missile
        missile.active = false;
        this.missilePool.push(missile);
        this.missiles.splice(i, 1);
        continue;
      }

      // Despawn if too far
      const distSq = missile.position.x ** 2 + missile.position.y ** 2 + missile.position.z ** 2;
      if (distSq > (this.options.spawnRadius * 1.5) ** 2) {
        missile.active = false;
        this.missilePool.push(missile);
        this.missiles.splice(i, 1);
      }
    }

    return destroyed;
  }
}
