import * as THREE from 'three';
import { BULLET_LIFESPAN } from '../config/constants';
import { BulletData } from '../types';

interface PooledBullet extends BulletData {
  active: boolean;
}

interface BulletPoolOptions {
  scene: THREE.Scene;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export class BulletPool {
  private bullets: PooledBullet[] = [];
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private segment = new THREE.Line3();

  constructor(options: BulletPoolOptions) {
    this.scene = options.scene;
    this.geometry = options.geometry;
    this.material = options.material;
  }

  spawn(position: THREE.Vector3, quaternion: THREE.Quaternion, velocity: THREE.Vector3, now: number) {
    let bullet = this.bullets.find(b => !b.active);
    if (!bullet) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      bullet = {
        mesh,
        velocity: new THREE.Vector3(),
        startTime: 0,
        prevPosition: new THREE.Vector3(),
        active: false,
      };
      this.bullets.push(bullet);
    }

    bullet.active = true;
    bullet.mesh.visible = true;
    bullet.mesh.position.copy(position);
    bullet.mesh.quaternion.copy(quaternion);
    bullet.mesh.updateMatrix();
    bullet.velocity.copy(velocity);
    bullet.startTime = now;
    bullet.prevPosition.copy(position);
  }

  update(
    timeScale: number,
    now: number,
    handleCollision: (segment: THREE.Line3, bullet: PooledBullet) => boolean,
  ) {
    for (const b of this.bullets) {
      if (!b.active) continue;

      b.prevPosition.copy(b.mesh.position);
      b.mesh.position.addScaledVector(b.velocity, timeScale);
      b.mesh.updateMatrix();

      this.segment.set(b.prevPosition, b.mesh.position);
      const shouldDeactivate = handleCollision(this.segment, b) || now - b.startTime > BULLET_LIFESPAN;
      if (shouldDeactivate) {
        b.active = false;
        b.mesh.visible = false;
      }
    }
  }

  reset() {
    for (const b of this.bullets) {
      b.active = false;
      b.mesh.visible = false;
    }
  }
}
