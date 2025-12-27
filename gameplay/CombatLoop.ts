import type { EnemyKind } from '../rendering/EnemyFactory';
import { segmentHitsSphere, type Vector3 } from './Collision';
import { SpawnScheduler } from './SpawnScheduler';
import type { RandomSource } from './Rng';
import { SoundEngine } from '../audio';
import { GAME_CONFIG } from '../config/gameConfig';

export interface EnemyInstance {
  id: number;
  kind: EnemyKind;
  position: Vector3;
  velocity: Vector3;
  // Weaver corkscrew movement parameters (randomized per enemy)
  wavePhase?: number;
  waveAmplitude?: number; // How far it spirals from trajectory
  waveFrequency?: number; // How fast it spirals
  // Health/Shield system
  health?: number;       // Core HP (default: 1)
  shield?: number;       // Shield HP (default: 0)
  maxShield?: number;    // For visual opacity calculation
  lastHitTime?: number;  // For hit flash effect timing
  // Status Effects
  lastShockwaveHit?: number; // Timestamp of last shockwave hit to prevent double-hits per wave
  lastFireTime?: number; // For bomber firing cooldown
  isCharging?: boolean;  // Visual cue for bomber firing
  shieldDownTime?: number; // Timestamp when shield broke
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
  detonationTriggeredAt?: number; // Timestamp when something entered trigger radius
}

// Enemy bullets (fired by bombers toward player)
export interface EnemyBullet {
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
  enemyRadius: { drone: 1.5, scout: 2.0, bomber: 2.5, weaver: 1.8, shieldedDrone: 1.8 },
  enemySpeedPerMs: { drone: 0.02, scout: 0.015, bomber: 0.008, weaver: 0.012, shieldedDrone: 0.012 },
  enemyDamage: { drone: 5, scout: 8, bomber: 15, weaver: 7, shieldedDrone: 15 },
  spawnRadius: 400, // Enemies spawn far in the distance
  bulletSpeed: 0.18, // Faster bullets = less lead required when aiming
  maxEnemies: 6, // Limit enemies on screen
};

// Enemy Type Limits & Progression - Strategy A "Slow Burn"
// Progressive caps that increase over time
interface SpawnTierCaps {
  maxDrones: number;
  maxWeavers: number;
  maxShielded: number;
  maxBombers: number;
  droneSpawnChance: number;   // 0-1 probability
  weaverSpawnChance: number;
  shieldedSpawnChance: number;
  bomberSpawnChance: number;
}

// Time thresholds in ms
const TIER_THRESHOLDS = [0, 45000, 90000, 150000, 210000]; // 0s, 45s, 1m30s, 2m30s, 3m30s

// Caps and spawn probabilities per tier
const TIER_CAPS: SpawnTierCaps[] = [
  // Tier 1: 0-45s - Drones only
  { maxDrones: 3, maxWeavers: 0, maxShielded: 0, maxBombers: 0, droneSpawnChance: 0.8, weaverSpawnChance: 0, shieldedSpawnChance: 0, bomberSpawnChance: 0 },
  // Tier 2: 45s-1m30s - Weavers introduced
  { maxDrones: 4, maxWeavers: 1, maxShielded: 0, maxBombers: 0, droneSpawnChance: 0.9, weaverSpawnChance: 0.3, shieldedSpawnChance: 0, bomberSpawnChance: 0 },
  // Tier 3: 1m30s-2m30s - Shielded introduced
  { maxDrones: 5, maxWeavers: 1, maxShielded: 1, maxBombers: 0, droneSpawnChance: 1.0, weaverSpawnChance: 0.5, shieldedSpawnChance: 0.2, bomberSpawnChance: 0 },
  // Tier 4: 2m30s-3m30s - Bombers introduced!
  { maxDrones: 6, maxWeavers: 2, maxShielded: 1, maxBombers: 1, droneSpawnChance: 1.0, weaverSpawnChance: 0.7, shieldedSpawnChance: 0.4, bomberSpawnChance: 0.2 },
  // Tier 5: 3m30s+ - Full intensity
  { maxDrones: 7, maxWeavers: 3, maxShielded: 2, maxBombers: 2, droneSpawnChance: 1.0, weaverSpawnChance: 0.85, shieldedSpawnChance: 0.6, bomberSpawnChance: 0.4 },
];

const WEAVER_SPAWN_COOLDOWN_MS = 3000; // 3 seconds between weaver spawns
const SHIELDED_DRONE_SPAWN_COOLDOWN_MS = 4000; // 4 seconds between shielded drone spawns
const BOMBER_SPAWN_COOLDOWN_MS = 5000; // 5 seconds between bomber spawns
const BOMBER_FIRE_INTERVAL_MS = 10000; // Bomber fires every 10 seconds (slower)
const BOMBER_BULLET_SPEED = 0.05; // Slower than player bullets

export interface CombatTickResult {
  timestamp: number;
  spawned: EnemyInstance[];
  destroyed: EnemyInstance[];
  interceptedEnemyBullets: Vector3[];
  hull: number;
}

export class CombatLoop {
  private readonly enemies: EnemyInstance[] = [];
  private readonly bullets: Bullet[] = [];
  private readonly missiles: Missile[] = [];
  private readonly enemyBullets: EnemyBullet[] = []; // Bullets fired BY enemies (bombers)
  private readonly kills: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0, weaver: 0, shieldedDrone: 0 };
  private readonly spawns: Record<EnemyKind, number> = { drone: 0, scout: 0, bomber: 0, weaver: 0, shieldedDrone: 0 };
  private intercepts = 0; // Track intercepted bullets for scoring

  // Public access for renderer
  public get activeEnemies(): ReadonlyArray<EnemyInstance> { return this.enemies; }
  public get activeBullets(): ReadonlyArray<Bullet> { return this.bullets; }
  public get activeMissiles(): ReadonlyArray<Missile> { return this.missiles; }
  public get activeEnemyBullets(): ReadonlyArray<EnemyBullet> { return this.enemyBullets; }

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
  private missileId = 0;
  private readonly missilePool: Missile[] = [];

  // Shockwave state (prayer gesture)
  private _isFiringShockwave = false;
  private shockwaveCooldownMs = 0; // Starts at 0 (ready)
  private shockwaveActive = false;
  private shockwaveRadius = 0;
  private shockwaveStartTime = 0;

  public get shockwaveReady(): boolean { return this.shockwaveCooldownMs <= 0; }
  public get shockwaveProgress(): number {
    if (this.shockwaveCooldownMs <= 0) return 1;
    return 1 - (this.shockwaveCooldownMs / GAME_CONFIG.shockwave.cooldownMs);
  }
  public get isShockwaveActive(): boolean { return this.shockwaveActive; }
  public get currentShockwaveRadius(): number { return this.shockwaveRadius; }

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

  // Difficulty speed multiplier
  private _speedMultiplier = 1.0;
  public setSpeedMultiplier(multiplier: number): void {
    this._speedMultiplier = multiplier;
  }
  public get speedMultiplier(): number { return this._speedMultiplier; }

  // Difficulty enemy cap multiplier (affects max enemies on screen)
  private _enemyCapMultiplier = 1.0;
  public setEnemyCapMultiplier(multiplier: number): void {
    this._enemyCapMultiplier = multiplier;
  }
  public get enemyCapMultiplier(): number { return this._enemyCapMultiplier; }

  // Difficulty-based bomber cap (overrides tier cap)
  private _maxBombersByDifficulty = 2; // Default: normal (2)
  public setMaxBombers(max: number): void { this._maxBombersByDifficulty = max; }

  // Practice Mode State
  private _practiceMode: EnemyKind | null = null;
  public setPracticeMode(kind: EnemyKind | null) { this._practiceMode = kind; }

  private hull: number;
  private elapsedMs = 0;
  private enemyId = 0;
  private bulletId = 0;
  private enemyBulletId = 0;
  private weaverSpawnCooldown = 0; // Stagger weaver spawns
  private shieldedDroneSpawnCooldown = 0; // Stagger shielded drone spawns
  private bomberSpawnCooldown = 0; // Stagger bomber spawns

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
    this.enemyBullets.length = 0;
    this.bulletPool.length = 0;
    this.missilePool.length = 0;
    this.hull = this.options.hull;
    this.elapsedMs = 0;
    this.enemyId = 0;
    this.bulletId = 0;
    this.enemyBulletId = 0;
    this.missileId = 0;
    this.missileId = 0;
    this.missileCooldownMs = 0;
    this.shockwaveCooldownMs = 0;
    this.shockwaveActive = false;
    this.shockwaveRadius = 0;
    this._heat = 0;
    this._isOverheated = false;
    this._isFiring = false;
    this._isFiringMissile = false;
    this.sinceLastShot = 450;
    this.kills.drone = 0;
    this.kills.scout = 0;
    this.kills.bomber = 0;
    this.kills.weaver = 0;
    this.kills.shieldedDrone = 0;
    this.spawns.drone = 0;
    this.spawns.scout = 0;
    this.spawns.bomber = 0;
    this.spawns.weaver = 0;
    this.spawns.shieldedDrone = 0;
    this.intercepts = 0;
    this.weaverSpawnCooldown = 0;
    this.shieldedDroneSpawnCooldown = 0;
    this.bomberSpawnCooldown = 0;
    this.scheduler.reset();
    // NOTE: We do NOT reset _practiceMode here, as reset() is called before start
  }

  public setFiring(firing: boolean) {
    this._isFiring = firing;
  }

  public setFiringMissile(firing: boolean) {
    this._isFiringMissile = firing;
  }

  public setFiringShockwave(firing: boolean) {
    this._isFiringShockwave = firing;
  }

  tick(deltaMs: number): CombatTickResult {
    if (deltaMs < 0) throw new Error('deltaMs must be non-negative');
    this.elapsedMs += deltaMs;

    // Update spawn cooldowns
    if (this.weaverSpawnCooldown > 0) {
      this.weaverSpawnCooldown = Math.max(0, this.weaverSpawnCooldown - deltaMs);
    }
    if (this.shieldedDroneSpawnCooldown > 0) {
      this.shieldedDroneSpawnCooldown = Math.max(0, this.shieldedDroneSpawnCooldown - deltaMs);
    }
    if (this.bomberSpawnCooldown > 0) {
      this.bomberSpawnCooldown = Math.max(0, this.bomberSpawnCooldown - deltaMs);
    }

    // Spawn Logic
    let spawnEvents: { kind: EnemyKind }[] = [];

    if (this._practiceMode) {
      // PRACTICE MODE: Generate synthetic events for the selected type
      // Rate: 1.5s interval roughly (scaled by rng/frame)
      // Actually, let's just use a simple frequency check since we have deltaMs
      // 2% chance per frame at 60fps ~ 1 spawn per 0.8s ... too fast?
      // Let's aim for 1 spawn every 2 seconds on average
      // 2000ms. delta is say 16ms. 16/2000 = 0.008 probability per tick
      const spawnProb = (deltaMs / 2000);
      if (this.rng.next() < spawnProb) {
        spawnEvents.push({ kind: this._practiceMode });
      }
    } else {
      // STANDARD MODE: Use Scheduler
      spawnEvents = this.scheduler.step(deltaMs);
    }

    const spawned: EnemyInstance[] = [];
    const interceptedEnemyBullets: Vector3[] = []; // Track intercepted bullets

    // Determine current tier based on elapsed time
    let tierIndex = 0;
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.elapsedMs >= TIER_THRESHOLDS[i]) {
        tierIndex = i;
        break;
      }
    }
    const tier = TIER_CAPS[tierIndex];

    for (const event of spawnEvents) {
      // 1. Check Global Limit (Safety Cap) - scaled by difficulty
      const scaledGlobalCap = Math.floor(15 * this._enemyCapMultiplier);
      if (this.enemies.length >= scaledGlobalCap) break;

      // Scale tier caps by difficulty
      const scaledMaxDrones = Math.max(1, Math.floor(tier.maxDrones * this._enemyCapMultiplier));
      const scaledMaxWeavers = Math.floor(tier.maxWeavers * this._enemyCapMultiplier);
      const scaledMaxShielded = Math.floor(tier.maxShielded * this._enemyCapMultiplier);
      // Bomber cap is overridden by difficulty setting (1/2/3 for easy/normal/hard)
      // Bomber cap is overridden by difficulty setting (1/2/3 for easy/normal/hard)
      const scaledMaxBombers = Math.min(tier.maxBombers, this._maxBombersByDifficulty);

      // 2. Check Specific Caps AND Probability
      if (this._practiceMode) {
        // PRACTICE MODE OVERRIDE
        // Only spawn the selected enemy type
        if (event.kind !== this._practiceMode) continue;

        // Simple fixed cap for practice
        const PRACTICE_CAP = 3;
        const currentCount = this.enemies.filter(e => e.kind === this._practiceMode).length;

        if (currentCount >= PRACTICE_CAP) continue;

        // Valid spawn
        this.bomberSpawnCooldown = BOMBER_SPAWN_COOLDOWN_MS; // Optional: respect cooldowns?
        // Actually for practice we might want faster feedback so ignore cooldowns or keep them short.
        // Let's just spawn it.
      } else {
        // NORMAL SPAWN LOGIC
        if (event.kind === 'drone') {
          const currentDrones = this.enemies.filter(e => e.kind === 'drone').length;
          if (currentDrones >= scaledMaxDrones) continue;
          // Probability check
          if (this.rng.next() > tier.droneSpawnChance) continue;
        }

        if (event.kind === 'weaver') {
          const currentWeavers = this.enemies.filter(e => e.kind === 'weaver').length;
          if (currentWeavers >= scaledMaxWeavers || this.weaverSpawnCooldown > 0) {
            continue;
          }
          // Probability check
          if (this.rng.next() > tier.weaverSpawnChance) continue;
          this.weaverSpawnCooldown = WEAVER_SPAWN_COOLDOWN_MS;
        }

        if (event.kind === 'shieldedDrone') {
          const currentShielded = this.enemies.filter(e => e.kind === 'shieldedDrone').length;
          if (currentShielded >= scaledMaxShielded || this.shieldedDroneSpawnCooldown > 0) {
            continue;
          }
          // Probability check
          if (this.rng.next() > tier.shieldedSpawnChance) continue;
          this.shieldedDroneSpawnCooldown = SHIELDED_DRONE_SPAWN_COOLDOWN_MS;
        }

        if (event.kind === 'bomber') {
          const currentBombers = this.enemies.filter(e => e.kind === 'bomber').length;
          if (currentBombers >= scaledMaxBombers || this.bomberSpawnCooldown > 0) {
            continue;
          }
          // Probability check
          if (this.rng.next() > tier.bomberSpawnChance) continue;
          this.bomberSpawnCooldown = BOMBER_SPAWN_COOLDOWN_MS;
        }
      }

      // 3. Spawn
      const enemy = this.createEnemy(event.kind);
      this.enemies.push(enemy);
      spawned.push(enemy);

      if (enemy.kind === 'weaver') {
        SoundEngine.play('weaverSpawn');
      } else if (enemy.kind === 'shieldedDrone') {
        SoundEngine.play('shieldedSpawn');
      } else if (enemy.kind === 'bomber') {
        SoundEngine.play('bomberSpawn');
      }
    }

    // Move Entities
    this.advanceEnemies(deltaMs);
    const bulletCollisions = this.advanceBullets(deltaMs);
    const missileCollisions = this.advanceMissiles(deltaMs);
    const destroyed = [...bulletCollisions, ...missileCollisions];

    // Bomber firing logic - fire at player every 2 seconds
    for (const enemy of this.enemies) {
      if (enemy.kind === 'bomber' && enemy.lastFireTime !== undefined) {
        if (this.elapsedMs - enemy.lastFireTime >= BOMBER_FIRE_INTERVAL_MS) {
          enemy.lastFireTime = this.elapsedMs;
          // Fire bullet toward camera (player is at z=0)
          const dx = 0 - enemy.position.x;
          const dy = 0 - enemy.position.y;
          const dz = 0 - enemy.position.z;
          const dist = Math.hypot(dx, dy, dz);
          if (dist > 0) {
            this.enemyBullets.push({
              id: this.enemyBulletId++,
              position: { ...enemy.position },
              velocity: {
                x: (dx / dist) * BOMBER_BULLET_SPEED,
                y: (dy / dist) * BOMBER_BULLET_SPEED,
                z: (dz / dist) * BOMBER_BULLET_SPEED,
              },
              active: true,
            });
            SoundEngine.play('enemyFire');
          }
        }
      }
    }

    // Advance enemy bullets and check for player hits
    this.advanceEnemyBullets(deltaMs, interceptedEnemyBullets);

    // Heat Logic
    if (this._isFiring && !this._isOverheated) {
      this.sinceLastShot += deltaMs;
    } else {
      const cooldownRate = this._isOverheated ? this.overheatCooldownPerMs : this.heatCooldownPerMs;
      this._heat = Math.max(0, this._heat - cooldownRate * deltaMs);
      if (this._isOverheated && this._heat <= this.overheatRecoveryThreshold) {
        this._isOverheated = false;
        SoundEngine.play('weaponReady');
      }
    }

    // Missile cooldown
    if (this.missileCooldownMs > 0) {
      this.missileCooldownMs = Math.max(0, this.missileCooldownMs - deltaMs);
    }

    // Shockwave cooldown & Activation
    if (this.shockwaveCooldownMs > 0) {
      this.shockwaveCooldownMs = Math.max(0, this.shockwaveCooldownMs - deltaMs);
    }

    if (this._isFiringShockwave && this.shockwaveReady && !this.shockwaveActive) {
      this.activateShockwave();
    }

    if (this.shockwaveActive) {
      this.updateShockwave(deltaMs);
    }

    this.spawnBullets();
    this.spawnMissiles();
    this.applyStationDamage();

    return {
      timestamp: this.elapsedMs,
      spawned,
      destroyed,
      interceptedEnemyBullets,
      hull: this.hull,
    };
  }

  summary() {
    // Calculate current tier index based on elapsed time
    let tierIndex = 0;
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.elapsedMs >= TIER_THRESHOLDS[i]) {
        tierIndex = i;
        break;
      }
    }

    return {
      hull: this.hull,
      kills: { ...this.kills },
      spawns: { ...this.spawns },
      intercepts: this.intercepts,
      active: this.enemies.length,
      elapsedMs: this.elapsedMs,
      heat: this._heat,
      isOverheated: this._isOverheated,
      missileReady: this.missileReady,
      missileCooldownProgress: this.missileCooldownProgress,
      shockwaveProgress: this.shockwaveProgress,
      currentTier: tierIndex,
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
      waveAmplitude = 0.5 + this.rng.next() * 1.5; // 0.5-2 units radius (very tight spiral)
      waveFrequency = 0.0005 + this.rng.next() * 0.001; // 0.0005-0.0015 cycles/ms (slower spin)
    }

    // Initialize shield for shielded drones
    let shield: number | undefined;
    let maxShield: number | undefined;
    let health: number | undefined;
    let lastFireTime: number | undefined;

    if (kind === 'shieldedDrone') {
      shield = 4;    // Takes 4 hits to overload shield
      maxShield = 4; // For visual opacity calculation
      health = 1;    // Then 1 more hit to destroy
    }

    if (kind === 'bomber') {
      health = 5;    // Bomber takes 5 hits to destroy
      lastFireTime = this.elapsedMs; // Start with fire cooldown
    }

    return {
      id: this.enemyId,
      kind,
      position: { x, y, z },
      velocity: { x: vx, y: vy, z: vz },
      wavePhase,
      waveAmplitude,
      waveFrequency,
      shield,
      maxShield,
      health,
      lastFireTime,
    };
  }

  private advanceEnemies(deltaMs: number): void {
    const adjustedDelta = deltaMs * this._speedMultiplier;
    for (const enemy of this.enemies) {
      // Base movement (scaled by difficulty)
      enemy.position.x += enemy.velocity.x * adjustedDelta;
      enemy.position.y += enemy.velocity.y * adjustedDelta;
      enemy.position.z += enemy.velocity.z * adjustedDelta;

      // Weaver corkscrew movement (spirals around trajectory line)
      if (enemy.kind === 'weaver' && enemy.wavePhase !== undefined &&
        enemy.waveAmplitude !== undefined && enemy.waveFrequency !== undefined) {
        // Update phase based on time (also scaled by difficulty)
        enemy.wavePhase += enemy.waveFrequency * adjustedDelta;

        // Calculate corkscrew offset (perpendicular to velocity in both X and Y)
        // This creates a helical spiral around the forward trajectory
        const spiralX = Math.cos(enemy.wavePhase) * enemy.waveAmplitude * 0.008 * adjustedDelta;
        const spiralY = Math.sin(enemy.wavePhase) * enemy.waveAmplitude * 0.008 * adjustedDelta;

        enemy.position.x += spiralX;
        enemy.position.y += spiralY;
      }

      // Shield Recharge Logic (3s delay)
      if (enemy.shield !== undefined && enemy.shield <= 0 && enemy.shieldDownTime !== undefined) {
        const now = this.elapsedMs;
        if (now - enemy.shieldDownTime >= 3000) {
          enemy.shield = enemy.maxShield; // Full recharge
          enemy.shieldDownTime = undefined; // Reset timer
          SoundEngine.play('shieldedSpawn'); // Audio feedback for recharge
        }
      }

      // Bomber logic: Fire bullets at player
      if (enemy.kind === 'bomber' && this.options.hull > 0) {
        const fireInterval = BOMBER_FIRE_INTERVAL_MS;
        const now = this.elapsedMs;

        // Initialize if new: Start at 50% cooldown (5s delay)
        if (enemy.lastFireTime === undefined) {
          enemy.lastFireTime = now - (fireInterval * 0.5);
        }

        const lastFire = enemy.lastFireTime!;
        const nextFireTime = lastFire + fireInterval;

        // Update charging status (flash 1.0s before firing)
        if (now >= nextFireTime - 1000 && now < nextFireTime) {
          enemy.isCharging = true;
        } else {
          enemy.isCharging = false;
        }

        if (now >= nextFireTime) {
          // FIRE!
          enemy.lastFireTime = now;
          enemy.isCharging = false; // Reset charge

          // Spawn enemy bullet
          this.spawnEnemyBullet(enemy.position);
        }
      }
    }
  }

  private spawnEnemyBullet(position: Vector3): void {
    const id = this.enemyId++; // Reuse enemy ID counter or separate? Separate is better but this works for unique IDs
    // Target player at (0, 0, 0) approx - actually player is at z=0, camera at z=4?
    // Player "Hitbox" for bullets is likely near z=0 or z=2.
    // Game logic says "z > -5" hits player. 
    // Let's aim at (0, -2, 4) - slightly below center

    const target = { x: 0, y: -2, z: 4 };
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const dz = target.z - position.z;
    const dist = Math.hypot(dx, dy, dz);

    const speed = 0.05; // BOMBER_BULLET_SPEED

    this.enemyBullets.push({
      id: id, // use simple id
      position: { ...position },
      velocity: {
        x: (dx / dist) * speed,
        y: (dy / dist) * speed,
        z: (dz / dist) * speed
      },
      active: true
    });

    SoundEngine.play('enemyFire');
  }

  // Advance enemy bullets and check for player hits AND player bullet interceptions
  private advanceEnemyBullets(deltaMs: number, interceptedEnemyBullets: Vector3[]): void {
    const BULLET_RADIUS = 0.5; // Collision radius

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      if (!bullet.active) {
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Move bullet
      bullet.position.x += bullet.velocity.x * deltaMs;
      bullet.position.y += bullet.velocity.y * deltaMs;
      bullet.position.z += bullet.velocity.z * deltaMs;

      // 1. Check collisions with PLAYER BULLETS (Interception)
      let isIntercepted = false;
      // Reverse loop to allow removal
      const INTERCEPT_RADIUS = 3.0; // Generous hitbox

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const pBullet = this.bullets[j];

        // SWEPT COLLISION CHECK
        // Calculate previous position of player bullet
        const prevPx = pBullet.position.x - pBullet.velocity.x * deltaMs;
        const prevPy = pBullet.position.y - pBullet.velocity.y * deltaMs;
        const prevPz = pBullet.position.z - pBullet.velocity.z * deltaMs;

        const hit = segmentHitsSphere(
          { x: prevPx, y: prevPy, z: prevPz },      // Start
          pBullet.position,                         // End
          bullet.position,                          // Sphere Center (Stationary-ish)
          INTERCEPT_RADIUS
        );

        if (hit) {
          // HIT!
          isIntercepted = true;

          // Remove player bullet
          this.bulletPool.push(pBullet);
          this.bullets.splice(j, 1);

          // Record interception (manual clone)
          interceptedEnemyBullets.push({ ...bullet.position });
          this.intercepts++; // Track for scoring
          break;
        }
      }

      if (isIntercepted) {
        // Remove enemy bullet and continue
        bullet.active = false; // logic flag
        this.enemyBullets.splice(i, 1);
        SoundEngine.play('explosionSmall'); // Audio feedback for interception
        continue;
      }

      // 2. Check collisions with PLAYER (Hull Damage)
      // Check if bullet reached player (z > -5 means it's past the camera/player)
      if (bullet.position.z > -5) {
        // Hit the player! Deal 5 damage to hull
        this.hull = Math.max(0, this.hull - 5);
        bullet.active = false;
        SoundEngine.play('bomberProjectileHit');
        this.enemyBullets.splice(i, 1);
        continue;
      }

      // Remove bullet if too far away (off screen or behind spawn)
      if (bullet.position.z > 50 || bullet.position.z < -500) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  /**
   * Apply damage to an enemy, handling shields and health.
   * Returns true if enemy is destroyed, false if still alive.
   */
  private applyDamage(enemy: EnemyInstance, damage: number = 1): boolean {
    const now = Date.now();

    // Invincibility frames: shield is invulnerable while flashing (150ms after hit)
    if (enemy.shield !== undefined && enemy.shield > 0 && enemy.lastHitTime !== undefined) {
      const timeSinceHit = now - enemy.lastHitTime;
      if (timeSinceHit < 150) {
        // Shield is still flashing - ignore damage
        return false;
      }
    }

    enemy.lastHitTime = now;

    // Check shield first
    if (enemy.shield !== undefined && enemy.shield > 0) {
      enemy.shield -= damage;
      SoundEngine.play('shieldHit');
      if (enemy.shield <= 0) {
        SoundEngine.play('shieldBreak');
        enemy.shieldDownTime = this.elapsedMs; // Mark time of break using Game Time (not Date.now)
      }
      return false; // Not destroyed, shield absorbed it
    }

    // Check health (most enemies have health=1 or undefined)
    const currentHealth = enemy.health ?? 1;
    if (currentHealth > damage) {
      enemy.health = currentHealth - damage;
      SoundEngine.play('explosion');
      return false; // Not destroyed yet
    }

    // Destroyed!
    this.kills[enemy.kind] += 1;
    if (enemy.kind === 'weaver' || enemy.kind === 'bomber') {
      SoundEngine.play('explosionLarge');
    } else {
      SoundEngine.play('explosionSmall');
    }
    return true;
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
          // Apply damage - may or may not destroy the enemy
          if (this.applyDamage(enemy)) {
            destroyed.push(enemy);
            this.enemies.splice(j, 1);
          }
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

  private activateShockwave(): void {
    this.shockwaveActive = true;
    this.shockwaveRadius = 0;
    this.shockwaveStartTime = this.elapsedMs;
    this.shockwaveCooldownMs = GAME_CONFIG.shockwave.cooldownMs;
    SoundEngine.play('shockwave'); // Need to add this sound type
  }

  private updateShockwave(deltaMs: number): void {
    this.shockwaveRadius += GAME_CONFIG.shockwave.speed * deltaMs;

    // Shockwave is a 2D screen wipe - hits everything regardless of Z depth
    // We check X/Y distance from center (0, 0) only
    const destroyed: EnemyInstance[] = [];

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Avoid double hits per wave
      if (enemy.lastShockwaveHit === this.shockwaveStartTime) continue;

      // 2D distance from screen center (ignoring Z - wave hits everything on screen)
      const dx = enemy.position.x;
      const dy = enemy.position.y;
      const dist2D = Math.hypot(dx, dy);

      // Also check if the wave has "passed" the enemy's Z position
      // Wave expands from Z=5 towards -Z. Enemy at Z=-100 is ~105 units away.
      // But we want a SCREEN wipe, so we use 2D + ensure wave is "far enough" in Z
      // Simplification: Just use 2D distance. Wave covers full screen depth.

      if (dist2D < this.shockwaveRadius) {
        // HIT!
        enemy.lastShockwaveHit = this.shockwaveStartTime;

        // Apply 5 damage
        let damage = GAME_CONFIG.shockwave.damage;

        // First strip shields
        if (enemy.shield !== undefined && enemy.shield > 0) {
          const shieldDamage = Math.min(enemy.shield, damage);
          enemy.shield -= shieldDamage;
          damage -= shieldDamage;

          if (enemy.shield <= 0) {
            enemy.shieldDownTime = this.elapsedMs;
            SoundEngine.play('shieldBreak');
          } else {
            SoundEngine.play('shieldHit');
          }
        }

        // Remaining damage to health
        if (damage > 0) {
          const currentHealth = enemy.health ?? 1;
          enemy.health = currentHealth - damage;
        }

        // Check if dead
        if ((enemy.health ?? 1) <= 0) {
          this.kills[enemy.kind]++;
          destroyed.push(enemy);
          this.enemies.splice(i, 1);
          SoundEngine.play('explosionLarge');
        } else if (damage > 0) {
          SoundEngine.play('hit');
        }
      }
    }

    // End wave when it's expanded past max radius
    if (this.shockwaveRadius > GAME_CONFIG.shockwave.maxRadius) {
      this.shockwaveActive = false;
    }
  }

  private readonly bulletPool: Bullet[] = [];

  private spawnBullets(): void {
    if (!this._isFiring || this._isOverheated) return;

    while (this.sinceLastShot >= this.options.fireIntervalMs) {
      this.sinceLastShot -= this.options.fireIntervalMs;
      const oldHeat = this._heat;
      this._heat += this.heatPerShot;

      // Heat warnings
      if (oldHeat < 70 && this._heat >= 70) SoundEngine.play('heatWarning');
      if (oldHeat < 90 && this._heat >= 90) SoundEngine.play('heatWarning');

      if (this._heat >= this.overheatThreshold) {
        this._heat = this.maxHeat;
        this._isOverheated = true;
        SoundEngine.play('overheat');
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
      SoundEngine.play('laser');

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
    SoundEngine.play('missileLaunch');
  }

  /**
   * Advance missiles and check for proximity detonation with area damage
   * Uses delayed detonation: trigger proximity starts countdown, explosion after delay
   */
  private advanceMissiles(deltaMs: number): EnemyInstance[] {
    const destroyed: EnemyInstance[] = [];
    const now = Date.now();
    const detonationDelay = GAME_CONFIG.missile.detonationDelayMs;

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      if (!missile.active) continue;

      // Move missile
      missile.position.x += missile.velocity.x * deltaMs;
      missile.position.y += missile.velocity.y * deltaMs;
      missile.position.z += missile.velocity.z * deltaMs;

      // Check if detonation was already triggered
      if (missile.detonationTriggeredAt !== undefined) {
        // Play seeking beep during countdown
        SoundEngine.play('missileBeep');

        // Check if delay has elapsed
        if (now - missile.detonationTriggeredAt >= detonationDelay) {
          // EXPLODE - apply area damage
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const enemy = this.enemies[j];
            const dx = missile.position.x - enemy.position.x;
            const dy = missile.position.y - enemy.position.y;
            const dz = missile.position.z - enemy.position.z;
            const dist = Math.hypot(dx, dy, dz);

            if (dist <= this.missileBlastRadius) {
              // Special missile damage logic
              enemy.lastHitTime = Date.now();

              if (enemy.shield !== undefined && enemy.shield > 0) {
                // Has shield: destroy shield completely, but don't damage core
                enemy.shield = 0;
                enemy.shieldDownTime = this.elapsedMs; // Enable recharge
                SoundEngine.play('shieldBreak');
                // Don't destroy the enemy - they survive with shield overloaded
              } else {
                // No shield: apply up to 4 damage (enough to kill most enemies)
                const currentHealth = enemy.health ?? 1;
                if (currentHealth <= 4) {
                  // Destroy enemy
                  destroyed.push(enemy);
                  this.enemies.splice(j, 1);
                  this.kills[enemy.kind] += 1;

                  if (enemy.kind === 'weaver' || enemy.kind === 'bomber' || enemy.kind === 'shieldedDrone') {
                    SoundEngine.play('explosionLarge');
                  } else {
                    SoundEngine.play('explosionSmall');
                  }
                } else {
                  // Survive with reduced health
                  enemy.health = currentHealth - 4;
                }
              }
            }
          }

          // Remove missile
          missile.active = false;
          missile.detonationTriggeredAt = undefined;
          this.missilePool.push(missile);
          this.missiles.splice(i, 1);
          SoundEngine.play('missileDetonate');
          continue;
        }
        // Still waiting for detonation
        continue;
      }

      // Check proximity to any enemy to trigger detonation countdown
      for (const enemy of this.enemies) {
        const dx = missile.position.x - enemy.position.x;
        const dy = missile.position.y - enemy.position.y;
        const dz = missile.position.z - enemy.position.z;
        const dist = Math.hypot(dx, dy, dz);

        if (dist <= this.missileProximityRadius) {
          // Start detonation countdown!
          missile.detonationTriggeredAt = now;
          break;
        }
      }

      // Despawn if too far
      const distSq = missile.position.x ** 2 + missile.position.y ** 2 + missile.position.z ** 2;
      if (distSq > (this.options.spawnRadius * 1.5) ** 2) {
        missile.active = false;
        missile.detonationTriggeredAt = undefined;
        this.missilePool.push(missile);
        this.missiles.splice(i, 1);
      }
    }

    return destroyed;
  }
}
