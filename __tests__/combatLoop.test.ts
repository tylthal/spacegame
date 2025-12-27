import { describe, expect, it } from 'vitest';
import { CombatLoop } from '../gameplay/CombatLoop';
import { SeededRng } from '../gameplay/Rng';
import { SpawnScheduler } from '../gameplay/SpawnScheduler';

const simulateForMs = (loop: CombatLoop, totalMs: number, stepMs: number) => {
  const iterations = Math.floor(totalMs / stepMs);
  for (let i = 0; i < iterations; i += 1) {
    loop.tick(stepMs);
  }
};

describe('CombatLoop integration', () => {
  it('tracks spawn distribution and hull attrition over sustained play', () => {
    const rng = new SeededRng(7);
    const scheduler = new SpawnScheduler(rng);
    const loop = new CombatLoop(scheduler, rng);

    simulateForMs(loop, 65000, 100);
    const summary = loop.summary();

    expect(summary.elapsedMs).toBe(65000);
    // With max enemies limit (6), spawns are capped by active enemy count
    // Enemies spawn and get destroyed/fly past, so total spawns depend on turnover
    expect(summary.spawns.drone).toBeGreaterThan(0);
    // After 30s, weavers start spawning
    expect(summary.spawns.weaver).toBeGreaterThan(0);

    // Current curve spawns scouts (surveyors) but not bombers yet
    expect(summary.spawns.scout).toBeGreaterThan(0);
    expect(summary.spawns.bomber).toBe(0);
    // Max active enemies should never exceed the limit (6 drones + 2 weavers = 8)
    expect(summary.active).toBeLessThanOrEqual(8);
    // Enemies that reach the player are destroyed (not counted as kills)
    expect(summary.hull).toBeLessThanOrEqual(100);
    expect(summary.hull).toBeGreaterThanOrEqual(0);
  });
});
