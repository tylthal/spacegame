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
    expect(summary.spawns.drone).toBeGreaterThan(25);
    expect(summary.spawns.scout).toBeGreaterThanOrEqual(6);
    expect(summary.spawns.bomber).toBeGreaterThanOrEqual(2);
    expect(summary.kills.drone + summary.kills.scout + summary.kills.bomber).toBeGreaterThan(30);
    expect(summary.hull).toBeLessThanOrEqual(100);
    expect(summary.hull).toBeGreaterThan(0);
  });
});
