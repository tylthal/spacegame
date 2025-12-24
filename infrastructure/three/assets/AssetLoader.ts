
import { useMemo } from 'react';
import { MeshStandardMaterialParameters } from 'three';

// In the future, this will use useGLTF from @react-three/drei
// import { useGLTF } from '@react-three/drei';

export type AssetId = 'hero' | 'drone' | 'scout' | 'bomber';

interface AssetDefinition {
    geometryType: 'cone' | 'box' | 'sphere' | 'tetrahedron' | 'octahedron';
    args: any[];
    materialParams: MeshStandardMaterialParameters;
    scale: [number, number, number];
}

/**
 * NEEDLE FIGHTER DESIGN
 * 
 * All enemies use octahedron geometry stretched on the Z-axis to create
 * a "needle" or "dart" shape. This provides:
 * - Clear directional silhouette
 * - Visible rotation based on velocity
 * - Performance (simple geometry)
 * 
 * Scale [x, y, z] where Z is the elongated "nose" axis
 */
const ASSETS: Record<AssetId, AssetDefinition> = {
    hero: {
        geometryType: 'cone',
        args: [0.6, 2, 8],
        materialParams: { color: 0x00ffff, emissive: 0x0088aa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 },
        scale: [1, 1, 1],
    },
    // Drone: Small, fast needle fighter
    drone: {
        geometryType: 'octahedron',
        args: [0.5], // radius
        materialParams: {
            color: 0xff3366,
            emissive: 0xff0044,
            emissiveIntensity: 1.0,
            roughness: 0.3,
            metalness: 0.7,
        },
        scale: [0.6, 0.6, 1.8], // Elongated needle
    },
    // Scout: Medium needle fighter with amber glow
    scout: {
        geometryType: 'octahedron',
        args: [0.5],
        materialParams: {
            color: 0xffaa00,
            emissive: 0xff6600,
            emissiveIntensity: 0.8,
            roughness: 0.2,
            metalness: 0.8,
        },
        scale: [0.5, 0.5, 2.0], // Longer, thinner needle
    },
    // Bomber: Larger, slower needle fighter
    bomber: {
        geometryType: 'octahedron',
        args: [0.6],
        materialParams: {
            color: 0x9900ff,
            emissive: 0x6600ff,
            emissiveIntensity: 0.9,
            roughness: 0.1,
            metalness: 0.9,
        },
        scale: [0.8, 0.8, 2.2], // Thicker, longer needle
    },
};

export function useSpaceshipAsset(id: AssetId) {
    // Acts as a facade. Later we swap this for useGLTF(url).nodes
    const def = useMemo(() => ASSETS[id], [id]);
    return def;
}
