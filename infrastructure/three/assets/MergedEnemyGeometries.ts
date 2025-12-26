/**
 * MergedEnemyGeometries.ts
 * 
 * Creates pre-baked merged geometries for each enemy type.
 * These geometries combine all sub-meshes into a single draw call.
 * 
 * Uses Three.js BufferGeometryUtils to merge geometries with applied transforms.
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Material presets matching EnemyMeshes.tsx
const METAL_CHROME = { color: 0xE0E0E0, emissive: 0x505060, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.1 };
const METAL_GUNMETAL = { color: 0x808090, emissive: 0x404050, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 };
const METAL_COPPER = { color: 0xCD7F32, emissive: 0x8B4513, emissiveIntensity: 0.5, metalness: 0.85, roughness: 0.35 };
const METAL_GOLD = { color: 0xFFD700, emissive: 0xCC9900, emissiveIntensity: 0.6, metalness: 0.95, roughness: 0.2 };
const METAL_DARK_GREEN = { color: 0x1A3A1A, emissive: 0x0D2F0D, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.2 };

// Cached geometries and materials
let droneGeometry: THREE.BufferGeometry | null = null;
let scoutGeometry: THREE.BufferGeometry | null = null;
let bomberGeometry: THREE.BufferGeometry | null = null;
let weaverGeometry: THREE.BufferGeometry | null = null;
let shieldedDroneGeometry: THREE.BufferGeometry | null = null;

let droneMaterial: THREE.MeshStandardMaterial | null = null;
let scoutMaterial: THREE.MeshStandardMaterial | null = null;
let bomberMaterial: THREE.MeshStandardMaterial | null = null;
let weaverMaterial: THREE.MeshStandardMaterial | null = null;
let shieldedDroneMaterial: THREE.MeshStandardMaterial | null = null;

// Helper to create a geometry with applied transform
// Converts to non-indexed geometry to ensure compatibility when merging
function createTransformedGeometry(
    geometry: THREE.BufferGeometry,
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
    // Convert to non-indexed geometry for merge compatibility
    // (Some geometries like Box/Cone are indexed, Octahedron is not)
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose(); // Dispose original

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
    matrix.compose(
        new THREE.Vector3(position[0], position[1], position[2]),
        quaternion,
        new THREE.Vector3(scale[0], scale[1], scale[2])
    );
    nonIndexed.applyMatrix4(matrix);
    return nonIndexed;
}

/**
 * DRONE - Compact fighter with swept-back wings
 * Creates a merged geometry from all drone sub-meshes
 */
function createDroneGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // Main fuselage - octahedron scaled
    const fuselage = createTransformedGeometry(
        new THREE.OctahedronGeometry(0.5),
        [0, 0, 0], [0, 0, 0], [0.5, 0.35, 1.6]
    );
    geometries.push(fuselage);

    // Nose cone
    const nose = createTransformedGeometry(
        new THREE.ConeGeometry(1, 1, 6),
        [0, 0, 0.9], [Math.PI / 2, 0, 0], [0.12, 0.25, 0.12]
    );
    geometries.push(nose);

    // Left swept wing
    const leftWing = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [-0.5, 0, -0.2], [0, -0.3, 0], [0.6, 0.04, 0.5]
    );
    geometries.push(leftWing);

    // Right swept wing
    const rightWing = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [0.5, 0, -0.2], [0, 0.3, 0], [0.6, 0.04, 0.5]
    );
    geometries.push(rightWing);

    // Left wingtip glow
    const leftWingtip = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [-0.75, 0, -0.35], [0, 0, 0], [0.1, 0.06, 0.15]
    );
    geometries.push(leftWingtip);

    // Right wingtip glow
    const rightWingtip = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [0.75, 0, -0.35], [0, 0, 0], [0.1, 0.06, 0.15]
    );
    geometries.push(rightWingtip);

    // Engine housing
    const engineHousing = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 0.8, 1, 8),
        [0, 0, -0.7], [Math.PI / 2, 0, 0], [0.18, 0.25, 0.18]
    );
    geometries.push(engineHousing);

    // Engine glow core
    const engineCore = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [0, 0, -0.85], [0, 0, 0], [0.15, 0.15, 0.1]
    );
    geometries.push(engineCore);

    // Engine outer glow
    const engineGlow = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [0, 0, -0.9], [0, 0, 0], [0.25, 0.25, 0.05]
    );
    geometries.push(engineGlow);

    // Front running light
    const frontLight = createTransformedGeometry(
        new THREE.SphereGeometry(1, 6, 4),
        [0, 0.15, 0.6], [0, 0, 0], [0.08, 0.04, 0.08]
    );
    geometries.push(frontLight);

    // Merge all geometries
    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    if (!merged) {
        throw new Error('Failed to merge drone geometries');
    }

    // Apply enemy scale (1.5x as in EnemyMesh component)
    merged.scale(1.5, 1.5, 1.5);

    // Dispose individual geometries
    geometries.forEach(g => g.dispose());

    return merged;
}

/**
 * SCOUT - Medium interceptor with sensor array
 */
function createScoutGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // Main hull
    const hull = createTransformedGeometry(
        new THREE.OctahedronGeometry(0.5),
        [0, 0, 0], [0, 0, 0], [0.6, 0.3, 2.2]
    );
    geometries.push(hull);

    // Sensor dish
    const dish = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 0.6, 1, 8),
        [0, 0.25, 0.5], [Math.PI / 2, 0, 0], [0.3, 0.05, 0.3]
    );
    geometries.push(dish);

    // Cockpit
    const cockpit = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [0, 0.1, 0.8], [0, 0, 0], [0.2, 0.1, 0.3]
    );
    geometries.push(cockpit);

    // Left engine nacelle
    const leftEngine = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 1, 1, 6),
        [-0.4, 0, -0.5], [0, 0, 0], [0.15, 0.15, 0.8]
    );
    geometries.push(leftEngine);

    // Right engine nacelle
    const rightEngine = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 1, 1, 6),
        [0.4, 0, -0.5], [0, 0, 0], [0.15, 0.15, 0.8]
    );
    geometries.push(rightEngine);

    // Left engine glow
    const leftGlow = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [-0.4, 0, -0.95], [0, 0, 0], [0.12, 0.12, 0.05]
    );
    geometries.push(leftGlow);

    // Right engine glow
    const rightGlow = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [0.4, 0, -0.95], [0, 0, 0], [0.12, 0.12, 0.05]
    );
    geometries.push(rightGlow);

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    if (!merged) {
        throw new Error('Failed to merge scout geometries');
    }
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * BOMBER - Heavy assault craft
 */
function createBomberGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // Main hull
    const hull = createTransformedGeometry(
        new THREE.OctahedronGeometry(0.5),
        [0, 0, 0], [0, 0, 0], [0.8, 0.6, 2.5]
    );
    geometries.push(hull);

    // Top armor plate
    const topPlate = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [0, 0.35, 0], [0, 0, 0], [0.5, 0.08, 1.5]
    );
    geometries.push(topPlate);

    // Left armor plate
    const leftPlate = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [-0.35, 0, 0], [0, 0, 0], [0.08, 0.4, 1.2]
    );
    geometries.push(leftPlate);

    // Right armor plate
    const rightPlate = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [0.35, 0, 0], [0, 0, 0], [0.08, 0.4, 1.2]
    );
    geometries.push(rightPlate);

    // Nose spike
    const nose = createTransformedGeometry(
        new THREE.ConeGeometry(1, 2, 6),
        [0, 0, 1.4], [-Math.PI / 2, 0, 0], [0.15, 0.5, 0.15]
    );
    geometries.push(nose);

    // Left weapon pod
    const leftPod = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 1, 1, 6),
        [-0.5, -0.2, 0.5], [0, 0, 0], [0.12, 0.12, 0.4]
    );
    geometries.push(leftPod);

    // Right weapon pod
    const rightPod = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 1, 1, 6),
        [0.5, -0.2, 0.5], [0, 0, 0], [0.12, 0.12, 0.4]
    );
    geometries.push(rightPod);

    // Center engine
    const centerEngine = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 0.8, 1, 8),
        [0, 0, -1.2], [0, 0, 0], [0.25, 0.25, 0.4]
    );
    geometries.push(centerEngine);

    // Left engine
    const leftEngineSmall = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 0.8, 1, 8),
        [-0.35, -0.15, -1.0], [0, 0, 0], [0.18, 0.18, 0.35]
    );
    geometries.push(leftEngineSmall);

    // Right engine
    const rightEngineSmall = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 0.8, 1, 8),
        [0.35, -0.15, -1.0], [0, 0, 0], [0.18, 0.18, 0.35]
    );
    geometries.push(rightEngineSmall);

    // Center glow
    const centerGlow = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [0, 0, -1.45], [0, 0, 0], [0.2, 0.2, 0.1]
    );
    geometries.push(centerGlow);

    // Left glow
    const leftGlow = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [-0.35, -0.15, -1.2], [0, 0, 0], [0.12, 0.12, 0.05]
    );
    geometries.push(leftGlow);

    // Right glow
    const rightGlow = createTransformedGeometry(
        new THREE.SphereGeometry(1, 8, 6),
        [0.35, -0.15, -1.2], [0, 0, 0], [0.12, 0.12, 0.05]
    );
    geometries.push(rightGlow);

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    if (!merged) {
        throw new Error('Failed to merge bomber geometries');
    }
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * WEAVER - Evasive disc craft with spinning blades
 */
function createWeaverGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // Central disc
    const disc = createTransformedGeometry(
        new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16),
        [0, 0, 0], [Math.PI / 2, 0, 0], [1.2, 0.15, 1.2]
    );
    geometries.push(disc);

    // Upper dome
    const dome = createTransformedGeometry(
        new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        [0, 0.1, 0], [0, 0, 0], [0.5, 0.25, 0.5]
    );
    geometries.push(dome);

    // Blade 1
    const blade1 = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [0.5, 0, 0.5], [0, Math.PI / 4, 0], [0.8, 0.04, 0.15]
    );
    geometries.push(blade1);

    // Blade 2
    const blade2 = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [0.5, 0, -0.5], [0, -Math.PI / 4, 0], [0.8, 0.04, 0.15]
    );
    geometries.push(blade2);

    // Blade 3
    const blade3 = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [-0.5, 0, 0.5], [0, -Math.PI / 4, 0], [0.8, 0.04, 0.15]
    );
    geometries.push(blade3);

    // Blade 4
    const blade4 = createTransformedGeometry(
        new THREE.BoxGeometry(1, 1, 1),
        [-0.5, 0, -0.5], [0, Math.PI / 4, 0], [0.8, 0.04, 0.15]
    );
    geometries.push(blade4);

    // Center engine
    const engine = createTransformedGeometry(
        new THREE.CylinderGeometry(1, 0.8, 1, 8),
        [0, -0.1, 0], [Math.PI / 2, 0, 0], [0.3, 0.1, 0.3]
    );
    geometries.push(engine);

    // Front sensor
    const sensor = createTransformedGeometry(
        new THREE.ConeGeometry(1, 1, 6),
        [0, 0, 0.7], [Math.PI / 2, 0, 0], [0.1, 0.15, 0.1]
    );
    geometries.push(sensor);

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    if (!merged) {
        throw new Error('Failed to merge weaver geometries');
    }
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * SHIELDED DRONE - Same as drone but darker coloring
 */
function createShieldedDroneGeometry(): THREE.BufferGeometry {
    // Same geometry as drone
    return createDroneGeometry();
}

// ========================================
// PUBLIC API
// ========================================

export type EnemyType = 'drone' | 'scout' | 'bomber' | 'weaver' | 'shieldedDrone';

/**
 * Get the merged geometry for an enemy type (cached)
 */
export function getEnemyGeometry(type: EnemyType): THREE.BufferGeometry {
    switch (type) {
        case 'drone':
            if (!droneGeometry) droneGeometry = createDroneGeometry();
            return droneGeometry;
        case 'scout':
            if (!scoutGeometry) scoutGeometry = createScoutGeometry();
            return scoutGeometry;
        case 'bomber':
            if (!bomberGeometry) bomberGeometry = createBomberGeometry();
            return bomberGeometry;
        case 'weaver':
            if (!weaverGeometry) weaverGeometry = createWeaverGeometry();
            return weaverGeometry;
        case 'shieldedDrone':
            if (!shieldedDroneGeometry) shieldedDroneGeometry = createShieldedDroneGeometry();
            return shieldedDroneGeometry;
        default:
            if (!droneGeometry) droneGeometry = createDroneGeometry();
            return droneGeometry;
    }
}

/**
 * Get the material for an enemy type (cached)
 */
export function getEnemyMaterial(type: EnemyType): THREE.MeshStandardMaterial {
    switch (type) {
        case 'drone':
            if (!droneMaterial) {
                droneMaterial = new THREE.MeshStandardMaterial({
                    color: METAL_CHROME.color,
                    emissive: METAL_CHROME.emissive,
                    emissiveIntensity: METAL_CHROME.emissiveIntensity,
                    metalness: METAL_CHROME.metalness,
                    roughness: METAL_CHROME.roughness,
                });
            }
            return droneMaterial;
        case 'scout':
            if (!scoutMaterial) {
                scoutMaterial = new THREE.MeshStandardMaterial({
                    color: METAL_CHROME.color,
                    emissive: METAL_CHROME.emissive,
                    emissiveIntensity: METAL_CHROME.emissiveIntensity,
                    metalness: METAL_CHROME.metalness,
                    roughness: METAL_CHROME.roughness,
                });
            }
            return scoutMaterial;
        case 'bomber':
            if (!bomberMaterial) {
                bomberMaterial = new THREE.MeshStandardMaterial({
                    color: METAL_GUNMETAL.color,
                    emissive: METAL_GUNMETAL.emissive,
                    emissiveIntensity: METAL_GUNMETAL.emissiveIntensity,
                    metalness: METAL_GUNMETAL.metalness,
                    roughness: METAL_GUNMETAL.roughness,
                });
            }
            return bomberMaterial;
        case 'weaver':
            if (!weaverMaterial) {
                weaverMaterial = new THREE.MeshStandardMaterial({
                    color: METAL_GUNMETAL.color,
                    emissive: METAL_GUNMETAL.emissive,
                    emissiveIntensity: METAL_GUNMETAL.emissiveIntensity,
                    metalness: METAL_GUNMETAL.metalness,
                    roughness: METAL_GUNMETAL.roughness,
                });
            }
            return weaverMaterial;
        case 'shieldedDrone':
            if (!shieldedDroneMaterial) {
                shieldedDroneMaterial = new THREE.MeshStandardMaterial({
                    color: METAL_DARK_GREEN.color,
                    emissive: METAL_DARK_GREEN.emissive,
                    emissiveIntensity: METAL_DARK_GREEN.emissiveIntensity,
                    metalness: METAL_DARK_GREEN.metalness,
                    roughness: METAL_DARK_GREEN.roughness,
                });
            }
            return shieldedDroneMaterial;
        default:
            return getEnemyMaterial('drone');
    }
}

/**
 * Dispose all cached geometries and materials
 */
export function disposeEnemyAssets(): void {
    droneGeometry?.dispose();
    scoutGeometry?.dispose();
    bomberGeometry?.dispose();
    weaverGeometry?.dispose();
    shieldedDroneGeometry?.dispose();
    droneMaterial?.dispose();
    scoutMaterial?.dispose();
    bomberMaterial?.dispose();
    weaverMaterial?.dispose();
    shieldedDroneMaterial?.dispose();

    droneGeometry = null;
    scoutGeometry = null;
    bomberGeometry = null;
    weaverGeometry = null;
    shieldedDroneGeometry = null;
    droneMaterial = null;
    scoutMaterial = null;
    bomberMaterial = null;
    weaverMaterial = null;
    shieldedDroneMaterial = null;
}
