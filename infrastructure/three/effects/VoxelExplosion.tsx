import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color } from 'three';

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
    lifeMultiplier: number; // 0.5-1.5 for varied fade timing
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

const DEBRIS_COUNT = 50; // More particles
const EXPLOSION_DURATION = 700; // ms

/**
 * Bright particle explosion with concentrated center and lingering debris
 */
export function VoxelExplosion({ explosion, onComplete }: VoxelExplosionProps) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());
    const elapsedRef = useRef(0);

    // Create debris particles - many small particles, concentrated center
    const debris = useMemo<Debris[]>(() => {
        const particles: Debris[] = [];
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            // Random spherical direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            // Speed varies - some fast, some slow (creates depth)
            const speedBase = 0.008 + Math.random() * 0.025;
            // Center particles start slower
            const isCenterParticle = i < DEBRIS_COUNT * 0.4;
            const speed = isCenterParticle ? speedBase * 0.5 : speedBase;

            particles.push({
                x: explosion.x,
                y: explosion.y,
                z: explosion.z,
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed,
                vz: Math.cos(phi) * speed,
                rotX: Math.random() * Math.PI * 2,
                rotY: Math.random() * Math.PI * 2,
                rotZ: Math.random() * Math.PI * 2,
                rotSpeedX: (Math.random() - 0.5) * 0.2,
                rotSpeedY: (Math.random() - 0.5) * 0.2,
                rotSpeedZ: (Math.random() - 0.5) * 0.2,
                scale: 0.08 + Math.random() * 0.12, // Small particles
                lifeMultiplier: 0.6 + Math.random() * 0.8, // Varied fade timing
            });
        }
        return particles;
    }, [explosion.x, explosion.y, explosion.z]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        elapsedRef.current += delta * 1000;
        const elapsed = elapsedRef.current;
        const maxProgress = Math.min(elapsed / EXPLOSION_DURATION, 1);

        // Check if explosion is complete (all particles faded)
        if (maxProgress >= 1) {
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
            d.vx *= 0.97;
            d.vy *= 0.97;
            d.vz *= 0.97;

            // Update rotation
            d.rotX += d.rotSpeedX;
            d.rotY += d.rotSpeedY;
            d.rotZ += d.rotSpeedZ;

            // Individual fade timing - some particles linger longer
            const particleProgress = Math.min(elapsed / (EXPLOSION_DURATION * d.lifeMultiplier), 1);
            const fadeScale = Math.max(0, 1 - particleProgress * particleProgress);

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
            <sphereGeometry args={[0.12, 6, 4]} />
            <meshStandardMaterial
                color={explosionColor}
                emissive={explosionColor}
                emissiveIntensity={5}
                roughness={0.2}
                metalness={0.4}
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

