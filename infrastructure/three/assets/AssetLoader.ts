
import { useMemo } from 'react';
import { Color, DoubleSide, MeshStandardMaterialParameters } from 'three';

// In the future, this will use useGLTF from @react-three/drei
// import { useGLTF } from '@react-three/drei';

export type AssetId = 'hero' | 'drone' | 'scout' | 'bomber';

interface AssetDefinition {
    geometryType: 'cone' | 'box' | 'sphere' | 'tetrahedron';
    args: any[];
    materialParams: MeshStandardMaterialParameters;
    scale: [number, number, number];
}

const ASSETS: Record<AssetId, AssetDefinition> = {
    hero: {
        geometryType: 'cone',
        args: [0.6, 2, 8],
        materialParams: { color: 0x00ffff, emissive: 0x0088aa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 },
        scale: [1, 1, 1],
    },
    drone: {
        geometryType: 'tetrahedron',
        args: [0.6],
        materialParams: { color: 0xff3366, emissive: 0xaa0022, emissiveIntensity: 0.8, roughness: 0.4 },
        scale: [1, 1, 1],
    },
    scout: {
        geometryType: 'cone',
        args: [0.4, 1.2, 4], // Pyramidal
        materialParams: { color: 0xffaa00, emissive: 0xaa4400, emissiveIntensity: 0.5, roughness: 0.3 },
        scale: [1, 1, 1],
    },
    bomber: {
        geometryType: 'box',
        args: [1, 1, 1],
        materialParams: { color: 0x9900ff, emissive: 0x4400aa, emissiveIntensity: 0.6, roughness: 0.1 },
        scale: [1.2, 1.2, 1.2],
    },
};

export function useSpaceshipAsset(id: AssetId) {
    // Acts as a facade. Later we swap this for useGLTF(url).nodes
    const def = useMemo(() => ASSETS[id], [id]);
    return def;
}
