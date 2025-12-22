import { describe, expect, it, vi } from 'vitest';
import { AssetManager } from '../rendering/AssetManager';
import { EnemyFactory, EnemyMesh } from '../rendering/EnemyFactory';
import { RenderingShell } from '../rendering/RenderingShell';
import { Clock, Renderer, SceneNode } from '../rendering/SceneGraph';

describe('RenderingShell', () => {
  it('builds a predictable scene graph and renders with injected dependencies', () => {
    let now = 0;
    const clock: Clock = { now: () => now };
    const render = vi.fn<Parameters<Renderer['render']>, void>();
    const renderer: Renderer = { render };

    const shell = new RenderingShell(renderer, clock, { starCount: 42 });

    expect(shell.scene.children).toEqual([
      shell.camera,
      shell.starfield,
      ...shell.lights,
    ]);
    expect(shell.starfield.starCount).toBe(42);

    now = 16;
    const firstFrame = shell.frame();
    expect(render).toHaveBeenCalledWith(shell.scene, shell.camera);
    expect(firstFrame).toEqual({ timestamp: 16, delta: 16 });

    now = 29;
    const secondFrame = shell.frame();
    expect(secondFrame).toEqual({ timestamp: 29, delta: 13 });
  });
});

describe('AssetManager pooling', () => {
  it('reuses released assets and allocates new ones when the pool is empty', () => {
    const manager = new AssetManager();
    const create = vi.fn(() => new SceneNode('enemy'));

    const first = manager.acquire('enemy', create);
    const second = manager.acquire('enemy', create);

    expect(first).not.toBe(second);

    manager.release('enemy', first);
    const third = manager.acquire('enemy', create);
    expect(third).toBe(first);

    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('EnemyFactory scene lifecycle', () => {
  it('tracks scene graph counts across spawn/despawn cycles', () => {
    const clock: Clock = { now: () => 0 };
    const renderer: Renderer = { render: () => {} };
    const shell = new RenderingShell(renderer, clock);
    const assets = new AssetManager();
    const factory = new EnemyFactory(assets);

    const initialCount = shell.scene.countNodes();

    const spawnOne = factory.spawnEnemy('drone', shell.scene);
    const spawnTwo = factory.spawnEnemy('scout', shell.scene);
    expect(shell.scene.countNodes()).toBe(initialCount + 2);

    factory.despawnEnemy(spawnOne);
    expect(shell.scene.countNodes()).toBe(initialCount + 1);

    factory.despawnEnemy(spawnTwo as EnemyMesh);
    expect(shell.scene.countNodes()).toBe(initialCount);
  });
});
