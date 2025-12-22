import { describe, expect, it } from 'vitest';
import { MENU_Z, MenuTargetField, hitTestTarget, projectRayToPlane } from '../rendering/MenuTargets';

describe('Menu target hit detection', () => {
  it('projects a ray to the menu plane and returns hit details', () => {
    const ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } };
    const projection = projectRayToPlane(ray);

    expect(projection).not.toBeNull();
    expect(projection?.point).toEqual({ x: 0, y: 0, z: MENU_Z });
    expect(projection?.distance).toBeCloseTo(2);
  });

  it('returns the nearest target intersected by the ray', () => {
    const targets = MenuTargetField.defaultLayout();
    const field = new MenuTargetField(targets);
    const ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: -1 } };

    const hit = field.select(ray);

    expect(hit?.target.id).toBe('quit');
    expect(hit?.point.z).toBe(MENU_Z);
    expect(hit?.distance).toBeCloseTo(2);
  });

  it('rejects rays that miss the targets on the plane', () => {
    const target = { id: 'start', label: 'Start', position: { x: 1, y: 1, z: MENU_Z }, radius: 0.2 };
    const ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0.8, y: 0.8, z: -1 } };

    const hit = hitTestTarget(ray, target);

    expect(hit).toBeNull();
  });
});
