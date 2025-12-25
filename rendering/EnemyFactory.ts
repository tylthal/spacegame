import { AssetManager } from './AssetManager';
import { SceneNode } from './SceneGraph';

export type EnemyKind = 'drone' | 'scout' | 'bomber' | 'weaver';

export class EnemyMesh extends SceneNode {
  constructor(public readonly kind: EnemyKind, id: number) {
    super(`${kind}-${id}`);
  }
}

export class EnemyFactory {
  private counters: Record<EnemyKind, number> = {
    drone: 0,
    scout: 0,
    bomber: 0,
    weaver: 0,
  };

  constructor(private readonly assets: AssetManager) { }

  spawnEnemy(kind: EnemyKind, parent: SceneNode): EnemyMesh {
    const mesh = this.assets.acquire(kind, () => this.createMesh(kind));
    parent.add(mesh);
    return mesh as EnemyMesh;
  }

  despawnEnemy(mesh: EnemyMesh): void {
    mesh.parent?.remove(mesh);
    this.assets.release(mesh.kind, mesh);
  }

  private createMesh(kind: EnemyKind): EnemyMesh {
    const id = ++this.counters[kind];
    return new EnemyMesh(kind, id);
  }
}
