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

describe('Practice Mode', () => {
    it('only spawns bombers in bomber practice mode', () => {
        const rng = new SeededRng(123);
        const scheduler = new SpawnScheduler(rng);
        const loop = new CombatLoop(scheduler, rng);

        loop.setPracticeMode('bomber');

        // Simulate 10 seconds (enough for multiple spawns)
        simulateForMs(loop, 10000, 16);

        const summary = loop.summary();

        // Should have spawned at least 1 bomber
        expect(summary.spawns.bomber).toBeGreaterThan(0);

        // Should NOT have spawned any other type
        expect(summary.spawns.drone).toBe(0);
        expect(summary.spawns.weaver).toBe(0);
        expect(summary.spawns.shieldedDrone).toBe(0);
        expect(summary.spawns.scout).toBe(0);

        // Cap check (Practice Cap is 3)
        expect(summary.active).toBeLessThanOrEqual(3);
    });

    it('only spawns weavers in weaver practice mode', () => {
        const rng = new SeededRng(456);
        const scheduler = new SpawnScheduler(rng);
        const loop = new CombatLoop(scheduler, rng);

        loop.setPracticeMode('weaver');

        simulateForMs(loop, 10000, 16);
        const summary = loop.summary();

        expect(summary.spawns.weaver).toBeGreaterThan(0);
        expect(summary.spawns.drone).toBe(0);
        expect(summary.spawns.bomber).toBe(0);
    });
});
