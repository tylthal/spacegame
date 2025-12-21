import * as THREE from 'three';
import { MISSILE } from '../config/constants';
import { MissileData } from '../types';

interface MissilePoolOptions {
  scene: THREE.Scene;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export class MissilePool {
  private missiles: MissileData[] = [];
  private nextMissileId = 0;
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;

  constructor(options: MissilePoolOptions) {
    this.scene = options.scene;
    this.geometry = options.geometry;
    this.material = options.material;
  }

  spawn(position: THREE.Vector3, quaternion: THREE.Quaternion, velocity: THREE.Vector3, now: number) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    this.scene.add(mesh);
    this.missiles.push({ mesh, velocity: velocity.clone(), startTime: now, id: this.nextMissileId++ });
  }

  update(
    timeScale: number,
    now: number,
    shouldDetonate: (missile: MissileData) => boolean,
    onDetonate: (missile: MissileData) => void,
  ) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.mesh.position.addScaledVector(m.velocity, timeScale);
      let detonate = shouldDetonate(m);
      if (!detonate) detonate = now - m.startTime > MISSILE.LIFESPAN_MS;

      if (detonate) {
        onDetonate(m);
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      } else {
        m.mesh.rotateZ(0.2 * timeScale);
      }
    }
  }

  reset() {
    for (const m of this.missiles) {
      this.scene.remove(m.mesh);
    }
    this.missiles = [];
  }
}
