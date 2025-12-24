import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color, MathUtils } from 'three';

interface Debris {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    rotSpeedX: number;
    rotSpeedY: number;
    rotSpeedZ: number;
    scale: number;
    life: number;
    maxLife: number;
}

export interface Explosion {
    id: number;
    x: number;
    y: number;
    z: number;
    color: string;
    createdAt: number;
}

interface VoxelExplosionProps {
    explosion: Explosion;
    onComplete: (id: number) => void;
}

const DEBRIS_COUNT = 12;
const EXPLOSION_DURATION = 800; // ms

/**
 * Single explosion instance with voxel debris
 */
export function VoxelExplosion({ explosion, onComplete }: VoxelExplosionProps) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());
    const startTimeRef = useRef<number | null>(null);

    // Create debris particles on mount
    const debris = useMemo<Debris[]>(() => {
        const particles: Debris[] = [];
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            // Random direction with upward bias
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.8; // Mostly outward
            const speed = 0.02 + Math.random() * 0.04;

            particles.push({
                x: explosion.x,
                y: explosion.y,
                z: explosion.z,
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed + 0.01, // Slight upward
                vz: Math.cos(phi) * speed,
                rotX: Math.random() * Math.PI * 2,
                rotY: Math.random() * Math.PI * 2,
                rotZ: Math.random() * Math.PI * 2,
                rotSpeedX: (Math.random() - 0.5) * 0.3,
                rotSpeedY: (Math.random() - 0.5) * 0.3,
                rotSpeedZ: (Math.random() - 0.5) * 0.3,
                scale: 0.3 + Math.random() * 0.5,
                life: EXPLOSION_DURATION,
                maxLife: EXPLOSION_DURATION,
            });
        }
        return particles;
    }, [explosion.x, explosion.y, explosion.z]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        // Initialize start time
        if (startTimeRef.current === null) {
            startTimeRef.current = Date.now();
        }

        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / EXPLOSION_DURATION, 1);

        // Check if explosion is complete
        if (progress >= 1) {
            onComplete(explosion.id);
            return;
        }

        const deltaMs = delta * 1000;

        // Update each debris particle
        for (let i = 0; i < debris.length; i++) {
            const d = debris[i];

            // Update position with velocity
            d.x += d.vx * deltaMs;
            d.y += d.vy * deltaMs;
            d.z += d.vz * deltaMs;

            // Slow down over time (drag)
            d.vx *= 0.98;
            d.vy *= 0.98;
            d.vz *= 0.98;

            // Update rotation
            d.rotX += d.rotSpeedX;
            d.rotY += d.rotSpeedY;
            d.rotZ += d.rotSpeedZ;

            // Calculate fade based on progress
            const fadeScale = 1 - progress;

            // Set instance transform
            dummy.current.position.set(d.x, d.y, d.z);
            dummy.current.rotation.set(d.rotX, d.rotY, d.rotZ);
            dummy.current.scale.setScalar(d.scale * fadeScale);
            dummy.current.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.current.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    const explosionColor = useMemo(() => new Color(explosion.color), [explosion.color]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, DEBRIS_COUNT]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial
                color={explosionColor}
                emissive={explosionColor}
                emissiveIntensity={3}
                roughness={0.3}
                metalness={0.7}
            />
        </instancedMesh>
    );
}

// Color mapping for enemy types
export const EXPLOSION_COLORS: Record<string, string> = {
    drone: '#00FFFF',  // Cyan
    scout: '#FF8800',  // Orange
    bomber: '#AA00FF', // Purple
};
