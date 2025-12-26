/**
 * SharedAssets.ts
 * 
 * Centralized geometry and material pool for the rendering system.
 * Pre-creates and caches common assets to reduce memory allocation
 * and enable Three.js automatic batching.
 * 
 * Usage:
 *   const geo = SharedAssets.geometry.capsule;
 *   const mat = SharedAssets.material.bullet;
 */

import * as THREE from 'three';

// ========================================
// GEOMETRY CACHE
// ========================================
const geometryCache: Record<string, THREE.BufferGeometry> = {};

export const SharedGeometry = {
    // Bullet geometry (plasma bolt)
    get bulletCapsule() {
        if (!geometryCache.bulletCapsule) {
            geometryCache.bulletCapsule = new THREE.CapsuleGeometry(0.08, 0.4, 4, 8);
        }
        return geometryCache.bulletCapsule;
    },

    // Missile geometry (cone)
    get missileCone() {
        if (!geometryCache.missileCone) {
            geometryCache.missileCone = new THREE.ConeGeometry(0.3, 1.2, 6);
        }
        return geometryCache.missileCone;
    },

    // Explosion debris (box)
    get debrisBox() {
        if (!geometryCache.debrisBox) {
            geometryCache.debrisBox = new THREE.BoxGeometry(1, 1, 1);
        }
        return geometryCache.debrisBox;
    },

    // Explosion particle (sphere)
    get particleSphere() {
        if (!geometryCache.particleSphere) {
            geometryCache.particleSphere = new THREE.SphereGeometry(0.1, 6, 4);
        }
        return geometryCache.particleSphere;
    },

    // Shield bubble (sphere)
    get shieldSphere() {
        if (!geometryCache.shieldSphere) {
            geometryCache.shieldSphere = new THREE.SphereGeometry(1, 24, 16);
        }
        return geometryCache.shieldSphere;
    },
};

// ========================================
// MATERIAL CACHE
// ========================================
const materialCache: Record<string, THREE.Material> = {};

export const SharedMaterial = {
    // Bullet material (yellow plasma)
    get bullet() {
        if (!materialCache.bullet) {
            materialCache.bullet = new THREE.MeshStandardMaterial({
                color: 0xFFFF00,
                emissive: 0xFFFF00,
                emissiveIntensity: 2,
                roughness: 0.2,
                metalness: 0.8,
            });
        }
        return materialCache.bullet;
    },

    // Missile material (orange glow)
    get missile() {
        if (!materialCache.missile) {
            materialCache.missile = new THREE.MeshStandardMaterial({
                color: 0xFF4400,
                emissive: 0xFF6600,
                emissiveIntensity: 4,
                roughness: 0.1,
                metalness: 0.9,
            });
        }
        return materialCache.missile;
    },

    // Explosion debris materials by color
    getExplosionMaterial(color: string) {
        const key = `explosion_${color}`;
        if (!materialCache[key]) {
            materialCache[key] = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 2,
                roughness: 0.3,
                metalness: 0.7,
            });
        }
        return materialCache[key];
    },
};

// ========================================
// CLEANUP
// ========================================
export function disposeSharedAssets() {
    // Dispose all cached geometries
    Object.values(geometryCache).forEach(geo => geo.dispose());
    Object.keys(geometryCache).forEach(key => delete geometryCache[key]);

    // Dispose all cached materials
    Object.values(materialCache).forEach(mat => mat.dispose());
    Object.keys(materialCache).forEach(key => delete materialCache[key]);
}

// ========================================
// CONVENIENCE NAMESPACE
// ========================================
export const SharedAssets = {
    geometry: SharedGeometry,
    material: SharedMaterial,
    dispose: disposeSharedAssets,
};
