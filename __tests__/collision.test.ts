import { describe, expect, it } from 'vitest';
import { segmentHitsCircle } from '../gameplay/Collision';

describe('segmentHitsCircle', () => {
  it('detects a fast-moving projectile passing through a target', () => {
    const hit = segmentHitsCircle({ x: 0, y: -5 }, { x: 0, y: 5 }, { x: 0.1, y: 0.2 }, 0.3);
    expect(hit).toBe(true);
  });

  it('handles tangential misses correctly', () => {
    const hit = segmentHitsCircle({ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, 0.5);
    expect(hit).toBe(false);
  });

  it('works when the projectile starts inside the target', () => {
    const hit = segmentHitsCircle({ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 0, y: 0 }, 0.5);
    expect(hit).toBe(true);
  });
});
