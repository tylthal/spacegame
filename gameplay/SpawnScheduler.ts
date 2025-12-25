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

export const DEFAULT_SPAWN_CURVE: SpawnTier[] = [
  // Tier 1: Just drones (0-30s)
  { startMs: 0, intervalMs: 2000, weights: { drone: 10, scout: 0, bomber: 0, weaver: 0 } },
  // Tier 2: Drones and Weavers (30s+)
  // We use equal weights here and let the CombatLoop caps decide what can actually spawn
  { startMs: 30000, intervalMs: 1000, weights: { drone: 10, scout: 0, bomber: 0, weaver: 10 } },
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
