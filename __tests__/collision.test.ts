import { describe, expect, it } from 'vitest';
import { segmentHitsSphere } from '../gameplay/Collision';

describe('segmentHitsSphere', () => {
  it('detects a fast-moving projectile passing through a target', () => {
    // 3D version: segment from (0, -5, 0) to (0, 5, 0), sphere at (0.1, 0.2, 0) with radius 0.3
    const hit = segmentHitsSphere({ x: 0, y: -5, z: 0 }, { x: 0, y: 5, z: 0 }, { x: 0.1, y: 0.2, z: 0 }, 0.3);
    expect(hit).toBe(true);
  });

  it('handles tangential misses correctly', () => {
    // Segment from (-1, 0, 0) to (1, 0, 0), sphere at (0, 1, 0) with radius 0.5
    const hit = segmentHitsSphere({ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 0.5);
    expect(hit).toBe(false);
  });

  it('works when the projectile starts inside the target', () => {
    // Segment starts at sphere center
    const hit = segmentHitsSphere({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, { x: 0, y: 0, z: 0 }, 0.5);
    expect(hit).toBe(true);
  });
});
