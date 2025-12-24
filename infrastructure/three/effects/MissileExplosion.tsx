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
    targetDist: number;
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

const PARTICLES_PER_COLOR = 40; // ~120 total for performance
const EXPLOSION_DURATION = 600;

// Multiple explosion colors
const EXPLOSION_COLORS = [
    { color: '#FF6600', emissive: '#FF4400' }, // Orange
    { color: '#FF2200', emissive: '#FF0000' }, // Red
    { color: '#FFCC00', emissive: '#FFAA00' }, // Yellow
];

function createParticles(x: number, y: number, z: number, blastRadius: number, count: number): Particle[] {
    const result: Particle[] = [];
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dx = Math.sin(phi) * Math.cos(theta);
        const dy = Math.sin(phi) * Math.sin(theta);
        const dz = Math.cos(phi);
        const targetDist = blastRadius * (0.3 + Math.random() * 0.7);
        const speed = targetDist / EXPLOSION_DURATION;

        result.push({
            x, y, z,
            vx: dx * speed,
            vy: dy * speed,
            vz: dz * speed,
            scale: 0.1 + Math.random() * 0.15, // Much smaller particles
            targetDist,
        });
    }
    return result;
}

/**
 * Missile explosion with multi-colored particles expanding to blast radius
 */
export function MissileExplosion({ explosion, onComplete }: MissileExplosionProps) {
    const meshRefs = [
        useRef<InstancedMesh>(null),
        useRef<InstancedMesh>(null),
        useRef<InstancedMesh>(null),
    ];
    const dummy = useRef(new Object3D());
    const startTimeRef = useRef<number | null>(null);

    // Create particles for each color
    const particleGroups = useMemo(() =>
        EXPLOSION_COLORS.map(() =>
            createParticles(explosion.x, explosion.y, explosion.z, explosion.blastRadius, PARTICLES_PER_COLOR)
        ),
        [explosion.x, explosion.y, explosion.z, explosion.blastRadius]
    );

    useFrame((_, delta) => {
        if (!meshRefs[0].current) return;

        if (startTimeRef.current === null) {
            startTimeRef.current = Date.now();
        }

        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / EXPLOSION_DURATION, 1);

        if (progress >= 1) {
            onComplete(explosion.id);
            return;
        }

        const deltaMs = delta * 1000;
        const fadeScale = 1 - (progress * progress);

        // Update each color group
        for (let g = 0; g < particleGroups.length; g++) {
            const mesh = meshRefs[g].current;
            if (!mesh) continue;

            const particles = particleGroups[g];
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx * deltaMs;
                p.y += p.vy * deltaMs;
                p.z += p.vz * deltaMs;

                dummy.current.position.set(p.x, p.y, p.z);
                dummy.current.scale.setScalar(p.scale * fadeScale);
                dummy.current.updateMatrix();
                mesh.setMatrixAt(i, dummy.current.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
        }
    });

    const colors = useMemo(() =>
        EXPLOSION_COLORS.map(c => ({
            color: new Color(c.color),
            emissive: new Color(c.emissive),
        })),
        []
    );

    return (
        <group>
            {EXPLOSION_COLORS.map((_, idx) => (
                <instancedMesh key={idx} ref={meshRefs[idx]} args={[undefined, undefined, PARTICLES_PER_COLOR]}>
                    <sphereGeometry args={[0.15, 6, 4]} />
                    <meshStandardMaterial
                        color={colors[idx].color}
                        emissive={colors[idx].emissive}
                        emissiveIntensity={6}
                        roughness={0.2}
                        metalness={0.3}
                    />
                </instancedMesh>
            ))}
        </group>
    );
}

