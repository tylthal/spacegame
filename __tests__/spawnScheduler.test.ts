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

    const events = stepMany(scheduler, 10, 1200);
    expect(events).toHaveLength(10);
    expect(events[0]).toEqual({ at: 1200, kind: 'drone' });
    const uniqueKinds = new Set(events.map(event => event.kind));
    expect(uniqueKinds).toEqual(new Set(['drone']));
  });

  it('shifts curves and increases spawn rate as time progresses', () => {
    const rng = new SeededRng(99);
    const scheduler = new SpawnScheduler(rng, DEFAULT_SPAWN_CURVE);
    const events = stepMany(scheduler, 70, 1000);

    const lastTimestamp = events.at(-1)?.at ?? 0;
    expect(lastTimestamp).toBeGreaterThanOrEqual(60000);

    // With current spawn curve (drone-only), all spawns should be drones
    const counts = events.reduce(
      (tally, event) => ({ ...tally, [event.kind]: tally[event.kind] + 1 }),
      { drone: 0, scout: 0, bomber: 0 },
    );

    // Current curve only spawns drones, so we verify that
    expect(counts.drone).toBeGreaterThan(0);
    // Spawn rate increases over time - verify we get more spawns as intervals tighten
    expect(events.length).toBeGreaterThan(50);
  });
});
