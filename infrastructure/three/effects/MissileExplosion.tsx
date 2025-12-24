import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color } from 'three';

interface Particle {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    scale: number;
    targetDist: number; // How far this particle should travel
}

export interface MissileExplosionData {
    id: number;
    x: number;
    y: number;
    z: number;
    blastRadius: number;
    createdAt: number;
}

interface MissileExplosionProps {
    explosion: MissileExplosionData;
    onComplete: (id: number) => void;
}

const PARTICLE_COUNT = 40;
const EXPLOSION_DURATION = 600; // ms - faster than enemy explosions

/**
 * Missile explosion with orange/red particles expanding to blast radius
 */
export function MissileExplosion({ explosion, onComplete }: MissileExplosionProps) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());
    const startTimeRef = useRef<number | null>(null);

    // Create particles that expand outward to blast radius
    const particles = useMemo<Particle[]>(() => {
        const result: Particle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Random spherical direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            // Normalize direction
            const dx = Math.sin(phi) * Math.cos(theta);
            const dy = Math.sin(phi) * Math.sin(theta);
            const dz = Math.cos(phi);

            // Each particle travels to a slightly different distance within blast radius
            const targetDist = explosion.blastRadius * (0.5 + Math.random() * 0.5);

            // Speed calculated to reach target distance by end of animation
            const speed = targetDist / EXPLOSION_DURATION;

            result.push({
                x: explosion.x,
                y: explosion.y,
                z: explosion.z,
                vx: dx * speed,
                vy: dy * speed,
                vz: dz * speed,
                scale: 0.4 + Math.random() * 0.4,
                targetDist,
            });
        }
        return result;
    }, [explosion.x, explosion.y, explosion.z, explosion.blastRadius]);

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

        // Update each particle
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Move particle outward
            p.x += p.vx * deltaMs;
            p.y += p.vy * deltaMs;
            p.z += p.vz * deltaMs;

            // Fade out as progress increases
            const fadeScale = 1 - (progress * progress); // Quadratic fade

            // Set instance transform
            dummy.current.position.set(p.x, p.y, p.z);
            dummy.current.scale.setScalar(p.scale * fadeScale);
            dummy.current.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.current.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    // Orange-red color for missile explosions
    const explosionColor = useMemo(() => new Color('#FF6600'), []);
    const emissiveColor = useMemo(() => new Color('#FF2200'), []);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
            <sphereGeometry args={[0.5, 8, 6]} />
            <meshStandardMaterial
                color={explosionColor}
                emissive={emissiveColor}
                emissiveIntensity={5}
                roughness={0.2}
                metalness={0.3}
            />
        </instancedMesh>
    );
}
