/**
 * MergedEnemyGeometries.ts
 * 
 * Creates pre-baked merged geometries with VERTEX COLORS for multi-part coloring.
 * Uses HDR vertex colors (values > 1.0) for glowing parts - bloom will pick these up.
 * 
 * - Hull parts: Normal RGB (0.1-0.3) - dark metallic
 * - Accent lights: HDR RGB (2.0-4.0) - will glow via bloom
 * - Engine jets: Maximum HDR (5.0+) - brightest glow
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// ============================================
// COLOR DEFINITIONS (HDR values for glow)
// ============================================

// Hull colors (dark metallic, normal range 0-1)
const HULL_DARK = { r: 0.12, g: 0.12, b: 0.15 };
const HULL_CYAN = { r: 0.08, g: 0.15, b: 0.18 };
const HULL_PINK = { r: 0.18, g: 0.08, b: 0.15 };
const HULL_ORANGE = { r: 0.22, g: 0.12, b: 0.08 };
const HULL_PURPLE = { r: 0.15, g: 0.08, b: 0.18 };
const HULL_GREEN = { r: 0.08, g: 0.18, b: 0.1 };

// Accent lights (increased HDR values for glow via bloom)
const LIGHT_CYAN = { r: 0.5, g: 4.0, b: 4.0 };
const LIGHT_PINK = { r: 4.0, g: 0.5, b: 2.5 };
const LIGHT_ORANGE = { r: 4.0, g: 2.0, b: 0.3 };
const LIGHT_PURPLE = { r: 3.5, g: 0.5, b: 4.0 };
const LIGHT_GREEN = { r: 1.0, g: 4.0, b: 0.5 };

// Engine jets (maximum HDR for intense bright glow)
const JET_WHITE = { r: 8.0, g: 8.0, b: 8.0 };
const JET_CYAN = { r: 3.0, g: 8.0, b: 8.0 };
const JET_PINK = { r: 8.0, g: 3.0, b: 6.0 };
const JET_ORANGE = { r: 8.0, g: 5.0, b: 2.0 };
const JET_PURPLE = { r: 6.0, g: 3.0, b: 8.0 };
const JET_GREEN = { r: 3.0, g: 8.0, b: 3.0 };

// Cached geometries and materials
let droneGeometry: THREE.BufferGeometry | null = null;
let scoutGeometry: THREE.BufferGeometry | null = null;
let bomberGeometry: THREE.BufferGeometry | null = null;
let weaverGeometry: THREE.BufferGeometry | null = null;
let shieldedDroneGeometry: THREE.BufferGeometry | null = null;

let sharedMaterial: THREE.MeshBasicMaterial | null = null;

// Helper to add vertex colors to a geometry
function setVertexColor(geometry: THREE.BufferGeometry, color: { r: number, g: number, b: number }): void {
    const count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Helper to create a geometry with applied transform and vertex color
function createColoredGeometry(
    geometry: THREE.BufferGeometry,
    color: { r: number, g: number, b: number },
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
    matrix.compose(
        new THREE.Vector3(position[0], position[1], position[2]),
        quaternion,
        new THREE.Vector3(scale[0], scale[1], scale[2])
    );
    nonIndexed.applyMatrix4(matrix);
    setVertexColor(nonIndexed, color);
    return nonIndexed;
}

/**
 * DRONE - Sleek arrow fighter
 * Hull: Dark cyan-tinted | Lights: Cyan HDR | Jets: White-cyan HDR
 */
function createDroneGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // === HULL PARTS (dark metal) ===
    geometries.push(createColoredGeometry(
        new THREE.OctahedronGeometry(0.5), HULL_CYAN,
        [0, 0, 0], [0, 0, 0], [0.5, 0.35, 1.8]
    ));
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.15, 0.6, 6), HULL_CYAN,
        [0, 0, 1.1], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(1, 0.05, 0.6), HULL_DARK,
        [-0.55, 0, -0.1], [0, -0.4, 0.1], [0.7, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(1, 0.05, 0.6), HULL_DARK,
        [0.55, 0, -0.1], [0, 0.4, -0.1], [0.7, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8), HULL_DARK,
        [-0.3, -0.05, -0.6], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8), HULL_DARK,
        [0.3, -0.05, -0.6], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));

    // === ACCENT LIGHTS (HDR for glow) ===
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.15, 8, 6), LIGHT_CYAN,
        [0, 0.18, 0.4], [0, 0, 0], [1, 0.6, 1.5]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.15, 0.08, 0.25), LIGHT_CYAN,
        [-0.85, 0, -0.25], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.15, 0.08, 0.25), LIGHT_CYAN,
        [0.85, 0, -0.25], [0, 0, 0], [1, 1, 1]
    ));

    // === ENGINE JETS (max HDR for intense glow) ===
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.12, 0.4, 8), JET_CYAN,
        [-0.3, -0.05, -1.0], [-Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.12, 0.4, 8), JET_CYAN,
        [0.3, -0.05, -1.0], [-Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.1, 8, 6), JET_WHITE,
        [-0.3, -0.05, -0.88], [0, 0, 0], [1, 1, 0.5]
    ));
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.1, 8, 6), JET_WHITE,
        [0.3, -0.05, -0.88], [0, 0, 0], [1, 1, 0.5]
    ));

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
    if (!merged) throw new Error('Failed to merge drone geometries');
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * SCOUT - X-wing style with 4 fins
 * Hull: Dark pink-tinted | Lights: Hot pink HDR | Jets: Pink-white HDR
 */
function createScoutGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // === HULL ===
    geometries.push(createColoredGeometry(
        new THREE.OctahedronGeometry(0.5), HULL_PINK,
        [0, 0, 0], [0, 0, 0], [0.4, 0.3, 2.4]
    ));
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.1, 0.8, 6), HULL_DARK,
        [0, 0, 1.4], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    const finPositions: [number, number, number, number][] = [
        [-0.4, 0.25, -0.3, 0.3],
        [0.4, 0.25, -0.3, -0.3],
        [-0.4, -0.25, -0.3, -0.3],
        [0.4, -0.25, -0.3, 0.3],
    ];
    finPositions.forEach(([x, y, z, rot]) => {
        geometries.push(createColoredGeometry(
            new THREE.BoxGeometry(0.6, 0.04, 0.8), HULL_DARK,
            [x, y, z], [rot, rot > 0 ? -0.2 : 0.2, 0], [1, 1, 1]
        ));
    });

    // === ACCENT LIGHTS (HDR) ===
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.2, 10, 8), LIGHT_PINK,
        [0, 0.15, 0.5], [0, 0, 0], [1, 0.8, 1.2]
    ));
    const tipPositions: [number, number, number][] = [
        [-0.65, 0.35, -0.55],
        [0.65, 0.35, -0.55],
        [-0.65, -0.35, -0.55],
        [0.65, -0.35, -0.55],
    ];
    tipPositions.forEach(pos => {
        geometries.push(createColoredGeometry(
            new THREE.SphereGeometry(0.05, 6, 4), LIGHT_PINK,
            pos, [0, 0, 0], [1, 1, 1]
        ));
    });

    // === ENGINE JETS (HDR) ===
    tipPositions.forEach(pos => {
        geometries.push(createColoredGeometry(
            new THREE.ConeGeometry(0.08, 0.35, 6), JET_PINK,
            [pos[0], pos[1], pos[2] - 0.2], [-Math.PI / 2, 0, 0], [1, 1, 1]
        ));
    });

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
    if (!merged) throw new Error('Failed to merge scout geometries');
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * BOMBER - Heavy hexagonal hull with weapon pods
 * Hull: Dark orange-tinted | Lights: Orange HDR | Jets: Orange-white HDR
 */
function createBomberGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // === HULL ===
    geometries.push(createColoredGeometry(
        new THREE.CylinderGeometry(0.5, 0.6, 1.8, 6), HULL_ORANGE,
        [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.7, 0.1, 1.4), HULL_DARK,
        [0, 0.45, 0], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.25, 0.8, 6), HULL_DARK,
        [0, 0, 1.3], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.2, 0.15, 0.6), HULL_DARK,
        [-0.55, -0.2, 0.4], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.2, 0.15, 0.6), HULL_DARK,
        [0.55, -0.2, 0.4], [0, 0, 0], [1, 1, 1]
    ));

    // === ACCENT LIGHTS (HDR) ===
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.06, 6, 4), LIGHT_ORANGE,
        [-0.55, -0.2, 0.9], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.06, 6, 4), LIGHT_ORANGE,
        [0.55, -0.2, 0.9], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.8, 0.04, 0.06), LIGHT_ORANGE,
        [0, 0.5, 0], [0, 0, 0], [1, 1, 1]
    ));

    // === ENGINE JETS (HDR) ===
    const enginePositions: [number, number, number][] = [
        [0, 0, -1.1],
        [-0.35, -0.15, -0.9],
        [0.35, -0.15, -0.9],
    ];
    enginePositions.forEach((pos, i) => {
        const size = i === 0 ? 0.18 : 0.12;
        geometries.push(createColoredGeometry(
            new THREE.CylinderGeometry(size, size * 1.2, 0.4, 8), HULL_DARK,
            pos, [Math.PI / 2, 0, 0], [1, 1, 1]
        ));
        geometries.push(createColoredGeometry(
            new THREE.ConeGeometry(size * 0.9, 0.5, 8), JET_ORANGE,
            [pos[0], pos[1], pos[2] - 0.35], [-Math.PI / 2, 0, 0], [1, 1, 1]
        ));
        geometries.push(createColoredGeometry(
            new THREE.SphereGeometry(size * 0.7, 8, 6), JET_WHITE,
            [pos[0], pos[1], pos[2] - 0.2], [0, 0, 0], [1, 1, 0.5]
        ));
    });

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
    if (!merged) throw new Error('Failed to merge bomber geometries');
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * WEAVER - Organic curved body with rotating rings
 * Hull: Dark purple-tinted | Lights: Purple HDR | Jets: Purple-white HDR
 */
function createWeaverGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // === HULL ===
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.4, 12, 10), HULL_PURPLE,
        [0, 0, 0], [0, 0, 0], [1, 0.6, 1.5]
    ));
    geometries.push(createColoredGeometry(
        new THREE.TorusGeometry(0.55, 0.06, 8, 16), HULL_DARK,
        [0, 0, 0], [Math.PI / 2, 0, Math.PI / 6], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.TorusGeometry(0.5, 0.05, 8, 16), HULL_DARK,
        [0, 0, 0], [Math.PI / 2, 0, -Math.PI / 6], [1, 1, 1]
    ));

    // === ACCENT LIGHTS (HDR) ===
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.15, 8, 6), LIGHT_PURPLE,
        [0, 0, 0.65], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.OctahedronGeometry(0.15), LIGHT_CYAN,
        [0, 0, 0], [0, 0, 0], [1, 1, 1]
    ));
    const ringAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    ringAngles.forEach(angle => {
        const x = Math.cos(angle) * 0.55;
        const y = Math.sin(angle) * 0.55;
        geometries.push(createColoredGeometry(
            new THREE.SphereGeometry(0.04, 4, 4), LIGHT_PURPLE,
            [x, y, 0], [0, 0, 0], [1, 1, 1]
        ));
    });

    // === ENGINE JETS (HDR) ===
    const thrusterAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    thrusterAngles.forEach(angle => {
        const x = Math.cos(angle) * 0.35;
        const y = Math.sin(angle) * 0.35;
        geometries.push(createColoredGeometry(
            new THREE.ConeGeometry(0.06, 0.25, 6), JET_PURPLE,
            [x, y, -0.5], [-Math.PI / 2, 0, 0], [1, 1, 1]
        ));
        geometries.push(createColoredGeometry(
            new THREE.SphereGeometry(0.05, 6, 4), JET_WHITE,
            [x, y, -0.62], [0, 0, 0], [1, 1, 0.5]
        ));
    });
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.12, 0.4, 8), JET_PURPLE,
        [0, 0, -0.75], [-Math.PI / 2, 0, 0], [1, 1, 1]
    ));

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
    if (!merged) throw new Error('Failed to merge weaver geometries');
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

/**
 * SHIELDED DRONE - Reinforced hull with shield dome
 * Hull: Dark green-tinted | Lights: Lime green HDR | Jets: Green-white HDR
 */
function createShieldedDroneGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // === HULL ===
    geometries.push(createColoredGeometry(
        new THREE.OctahedronGeometry(0.5), HULL_GREEN,
        [0, 0, 0], [0, 0, 0], [0.6, 0.4, 1.6]
    ));
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.18, 0.5, 6), HULL_DARK,
        [0, 0, 1.0], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.15, 0.3, 0.8), HULL_DARK,
        [-0.4, 0, 0], [0, 0, 0.1], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.15, 0.3, 0.8), HULL_DARK,
        [0.4, 0, 0], [0, 0, -0.1], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8), HULL_DARK,
        [-0.25, -0.1, -0.6], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8), HULL_DARK,
        [0.25, -0.1, -0.6], [Math.PI / 2, 0, 0], [1, 1, 1]
    ));

    // === ACCENT LIGHTS (HDR) ===
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), LIGHT_GREEN,
        [0, 0.3, 0], [0, 0, 0], [1, 0.8, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.12, 8, 6), LIGHT_GREEN,
        [0, 0.15, 0], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.04, 0.25, 0.6), LIGHT_GREEN,
        [-0.48, 0, 0], [0, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.BoxGeometry(0.04, 0.25, 0.6), LIGHT_GREEN,
        [0.48, 0, 0], [0, 0, 0], [1, 1, 1]
    ));

    // === ENGINE JETS (HDR) ===
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.1, 0.35, 8), JET_GREEN,
        [-0.25, -0.1, -0.95], [-Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.ConeGeometry(0.1, 0.35, 8), JET_GREEN,
        [0.25, -0.1, -0.95], [-Math.PI / 2, 0, 0], [1, 1, 1]
    ));
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.08, 6, 4), JET_WHITE,
        [-0.25, -0.1, -0.82], [0, 0, 0], [1, 1, 0.5]
    ));
    geometries.push(createColoredGeometry(
        new THREE.SphereGeometry(0.08, 6, 4), JET_WHITE,
        [0.25, -0.1, -0.82], [0, 0, 0], [1, 1, 0.5]
    ));

    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
    if (!merged) throw new Error('Failed to merge shielded drone geometries');
    merged.scale(1.5, 1.5, 1.5);
    geometries.forEach(g => g.dispose());
    return merged;
}

// ========================================
// PUBLIC API
// ========================================

export type EnemyType = 'drone' | 'scout' | 'bomber' | 'weaver' | 'shieldedDrone';

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
 * Material for enemy ships using MeshBasicMaterial.
 * 
 * MeshBasicMaterial displays vertex colors directly without lighting calculations.
 * This allows:
 * - Dark hull colors (0.1-0.2) to stay dark
 * - Bright accent lights (4.0+ HDR) to appear bright
 * - Engine jets (8.0+ HDR) to glow intensely via bloom
 * 
 * toneMapped: false preserves HDR values for bloom post-processing
 */
export function getEnemyMaterial(_type: EnemyType): THREE.MeshBasicMaterial {
    if (!sharedMaterial) {
        sharedMaterial = new THREE.MeshBasicMaterial({
            vertexColors: true,
            toneMapped: false, // Allow HDR vertex colors to pass through to bloom
        });
    }
    return sharedMaterial as THREE.MeshBasicMaterial;
}

export function disposeEnemyAssets(): void {
    droneGeometry?.dispose();
    scoutGeometry?.dispose();
    bomberGeometry?.dispose();
    weaverGeometry?.dispose();
    shieldedDroneGeometry?.dispose();
    sharedMaterial?.dispose();

    droneGeometry = null;
    scoutGeometry = null;
    bomberGeometry = null;
    weaverGeometry = null;
    shieldedDroneGeometry = null;
    sharedMaterial = null;
}
