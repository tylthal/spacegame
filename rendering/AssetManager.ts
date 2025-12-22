import { SceneNode } from './SceneGraph';

export class AssetManager {
  private pools = new Map<string, SceneNode[]>();

  acquire(key: string, factory: () => SceneNode): SceneNode {
    const pool = this.pools.get(key) ?? [];
    const reused = pool.pop();
    this.pools.set(key, pool);

    if (reused) {
      return reused;
    }

    return factory();
  }

  release(key: string, node: SceneNode): void {
    node.parent?.remove(node);
    node.removeAll();
    const pool = this.pools.get(key) ?? [];
    pool.push(node);
    this.pools.set(key, pool);
  }
}
