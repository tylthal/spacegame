/**
 * InstancedEnemyRenderer.tsx
 * 
 * High-performance instanced rendering for all enemies.
 * Uses one instanced mesh per enemy type with detailed merged geometries.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3 } from 'three';
import { getEnemyGeometry, getEnemyMaterial, EnemyType } from './assets/MergedEnemyGeometries';
import { ShieldBubble } from './effects/ShieldBubble';

// Maximum instances per type
const MAX_INSTANCES = 50;

// Hitbox radii (for shield bubbles)
const HITBOX_RADIUS: Record<string, number> = {
    drone: 1.5,
    scout: 2.0,
    bomber: 2.5,
    weaver: 1.8,
    shieldedDrone: 1.8,
};

interface Enemy {
    id: number;
    kind: string;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    shield?: number;
    maxShield?: number;
    lastHitTime?: number;
}

interface InstancedEnemyRendererProps {
    enemies: Enemy[];
}

/**
 * Single type instanced renderer with merged geometry
 */
function TypeInstancedMesh({
    enemies,
    type
}: {
    enemies: Enemy[];
    type: EnemyType;
}) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());
    const targetPos = useRef(new Vector3());

    // Get pre-baked geometry and material
    const geometry = useMemo(() => getEnemyGeometry(type), [type]);
    const material = useMemo(() => getEnemyMaterial(type), [type]);

    useFrame(() => {
        if (!meshRef.current) return;

        meshRef.current.count = enemies.length;

        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const { x, y, z } = enemy.position;
            const { x: vx, y: vy, z: vz } = enemy.velocity;

            dummy.current.position.set(x, y, z);
            dummy.current.rotation.set(0, 0, 0);
            targetPos.current.set(x + vx * 10, y + vy * 10, z + vz * 10);
            dummy.current.lookAt(targetPos.current);

            dummy.current.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.current.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    // Use primitive to attach pre-created geometry and material
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
            <primitive object={geometry} attach="geometry" />
            <primitive object={material} attach="material" />
        </instancedMesh>
    );
}

/**
 * Main instanced enemy renderer
 */
export function InstancedEnemyRenderer({ enemies }: InstancedEnemyRendererProps) {
    // Group enemies by type
    const droneEnemies: Enemy[] = [];
    const scoutEnemies: Enemy[] = [];
    const bomberEnemies: Enemy[] = [];
    const weaverEnemies: Enemy[] = [];
    const shieldedDroneEnemies: Enemy[] = [];

    for (const enemy of enemies) {
        switch (enemy.kind) {
            case 'drone':
                droneEnemies.push(enemy);
                break;
            case 'scout':
                scoutEnemies.push(enemy);
                break;
            case 'bomber':
                bomberEnemies.push(enemy);
                break;
            case 'weaver':
                weaverEnemies.push(enemy);
                break;
            case 'shieldedDrone':
                shieldedDroneEnemies.push(enemy);
                break;
            default:
                droneEnemies.push(enemy);
        }
    }

    // Shielded enemies for shield bubble rendering
    const shieldedEnemies = enemies.filter(e => e.shield !== undefined && e.maxShield);

    return (
        <group>
            {/* Type-specific instanced meshes with merged geometries */}
            <TypeInstancedMesh enemies={droneEnemies} type="drone" />
            <TypeInstancedMesh enemies={scoutEnemies} type="scout" />
            <TypeInstancedMesh enemies={bomberEnemies} type="bomber" />
            <TypeInstancedMesh enemies={weaverEnemies} type="weaver" />
            <TypeInstancedMesh enemies={shieldedDroneEnemies} type="shieldedDrone" />

            {/* Shield bubbles for shielded enemies */}
            {shieldedEnemies.map(enemy => (
                <group
                    key={`shield-${enemy.id}`}
                    position={[enemy.position.x, enemy.position.y, enemy.position.z]}
                >
                    <ShieldBubble
                        radius={(HITBOX_RADIUS[enemy.kind] || 1.5) * 1.3}
                        getShieldHP={() => enemy.shield}
                        maxShieldHP={enemy.maxShield!}
                        getLastHitTime={() => enemy.lastHitTime}
                    />
                </group>
            ))}
        </group>
    );
}
