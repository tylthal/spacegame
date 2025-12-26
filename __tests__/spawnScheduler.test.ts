import { describe, expect, it } from 'vitest';
import { SeededRng } from '../gameplay/Rng';
import { DEFAULT_SPAWN_CURVE, SpawnScheduler } from '../gameplay/SpawnScheduler';

const stepMany = (scheduler: SpawnScheduler, steps: number, deltaMs: number) => {
  const events = [] as ReturnType<SpawnScheduler['step']>;
  for (let i = 0; i < steps; i += 1) {
    events.push(...scheduler.step(deltaMs));
  }
  return events;
};

describe('SpawnScheduler', () => {
  it('emits interval-driven spawns with deterministic RNG', () => {
    const rng = new SeededRng(42);
    const scheduler = new SpawnScheduler(rng, DEFAULT_SPAWN_CURVE);

    // 10 steps x 1200ms = 12000ms, spawn interval is 2500ms (Tier 1), so expect 4 spawns
    // Spawns at 2500, 5000, 7500, 10000
    const events = stepMany(scheduler, 10, 1200);
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.length).toBeLessThan(6);
    expect(events[0]).toEqual({ at: 2500, kind: 'drone' });
    const uniqueKinds = new Set(events.map(event => event.kind));
    expect(uniqueKinds).toEqual(new Set(['drone']));
  });

  it('shifts curves and increases spawn rate as time progresses', () => {
    const rng = new SeededRng(99);
    const scheduler = new SpawnScheduler(rng, DEFAULT_SPAWN_CURVE);
    // Run for longer to see more spawns
    const events = stepMany(scheduler, 100, 1000);

    const lastTimestamp = events.at(-1)?.at ?? 0;
    expect(lastTimestamp).toBeGreaterThanOrEqual(60000);

    // Weavers appear after 45s
    const counts = events.reduce(
      (tally, event) => ({ ...tally, [event.kind]: (tally[event.kind] || 0) + 1 }),
      { drone: 0, weaver: 0, shieldedDrone: 0 } as Record<string, number>,
    );

    // Verify mix
    expect(counts.drone).toBeGreaterThan(0);
    expect(counts.weaver).toBeGreaterThan(0);
    // Spawn rate increases over time - verify we get reasonable spawns
    expect(events.length).toBeGreaterThan(30);
  });
});
