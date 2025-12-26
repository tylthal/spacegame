import type { EnemyKind } from '../rendering/EnemyFactory';
import type { RandomSource } from './Rng';

export interface SpawnTier {
  startMs: number;
  intervalMs: number;
  weights: Record<EnemyKind, number>;
}

export interface SpawnEvent {
  at: number;
  kind: EnemyKind;
}

/**
 * Strategy A: "Slow Burn" - Gradual difficulty progression
 * 
 * Spawn probabilities increase over time:
 * - Drones: 80% → 100%
 * - Weavers: 0% → 85%  
 * - Shielded: 0% → 60%
 * 
 * Weights represent relative spawn probabilities when the scheduler picks an enemy.
 * Max caps are enforced in CombatLoop.
 */
export const DEFAULT_SPAWN_CURVE: SpawnTier[] = [
  // Tier 1: 0-45s - Drones only, slow spawn rate
  { startMs: 0, intervalMs: 2500, weights: { drone: 8, scout: 0, bomber: 0, weaver: 0, shieldedDrone: 0 } },

  // Tier 2: 45s-1m30s - Weavers introduced at low rate
  { startMs: 45000, intervalMs: 2000, weights: { drone: 9, scout: 0, bomber: 0, weaver: 3, shieldedDrone: 0 } },

  // Tier 3: 1m30s-2m30s - Shielded drones introduced at low rate
  { startMs: 90000, intervalMs: 1500, weights: { drone: 10, scout: 0, bomber: 0, weaver: 5, shieldedDrone: 2 } },

  // Tier 4: 2m30s-3m30s - Increasing pressure
  { startMs: 150000, intervalMs: 1200, weights: { drone: 10, scout: 0, bomber: 0, weaver: 7, shieldedDrone: 4 } },

  // Tier 5: 3m30s+ - Full intensity
  { startMs: 210000, intervalMs: 1000, weights: { drone: 10, scout: 0, bomber: 0, weaver: 8, shieldedDrone: 6 } },
];

export class SpawnScheduler {
  private elapsedMs = 0;
  private nextSpawnAt: number;
  private readonly tiers: SpawnTier[];

  constructor(
    private readonly rng: RandomSource,
    tiers: SpawnTier[] = DEFAULT_SPAWN_CURVE,
  ) {
    if (tiers.length === 0) {
      throw new Error('SpawnScheduler requires at least one tier');
    }

    this.tiers = [...tiers].sort((a, b) => a.startMs - b.startMs);
    this.nextSpawnAt = this.tiers[0].startMs + this.tiers[0].intervalMs;
  }

  /** Reset scheduler to initial state for game restart */
  reset(): void {
    this.elapsedMs = 0;
    this.nextSpawnAt = this.tiers[0].startMs + this.tiers[0].intervalMs;
  }

  step(deltaMs: number): SpawnEvent[] {
    if (deltaMs < 0) throw new Error('deltaMs must be non-negative');
    this.elapsedMs += deltaMs;
    const events: SpawnEvent[] = [];

    while (this.elapsedMs >= this.nextSpawnAt) {
      const spawnTime = this.nextSpawnAt;
      const tier = this.tierForTime(spawnTime);
      const kind = this.pickKind(tier.weights);
      events.push({ kind, at: spawnTime });
      const nextTier = this.tierForTime(spawnTime + tier.intervalMs);
      const interval = nextTier.startMs > spawnTime ? nextTier.intervalMs : tier.intervalMs;
      this.nextSpawnAt = spawnTime + interval;
    }

    return events;
  }

  private tierForTime(timeMs: number): SpawnTier {
    let current = this.tiers[0];
    for (const tier of this.tiers) {
      if (tier.startMs <= timeMs) {
        current = tier;
      } else {
        break;
      }
    }
    return current;
  }

  private pickKind(weights: Record<EnemyKind, number>): EnemyKind {
    const entries = Object.entries(weights) as [EnemyKind, number][];
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
    if (total <= 0) {
      return 'drone';
    }
    const roll = this.rng.next() * total;
    let acc = 0;
    for (const [kind, weight] of entries) {
      acc += Math.max(0, weight);
      if (roll < acc) return kind;
    }
    return entries[entries.length - 1][0];
  }
}
