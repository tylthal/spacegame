import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, Vector3 } from 'three';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useSpaceshipAsset, AssetId } from './assets/AssetLoader';
import { GameEffects } from './effects/EffectComposer';
import { Starfield } from './particles/ParticleSystem';

function AssetMesh({ id, ...props }: { id: AssetId } & any) {
    const { geometryType, args, materialParams, scale } = useSpaceshipAsset(id);

    return (
        <mesh {...props} scale={scale as any}>
            {geometryType === 'cone' && <coneGeometry args={args as any} />}
            {geometryType === 'box' && <boxGeometry args={args as any} />}
            {geometryType === 'sphere' && <sphereGeometry args={args as any} />}
            {geometryType === 'tetrahedron' && <tetrahedronGeometry args={args as any} />}
            <meshStandardMaterial {...materialParams} />
        </mesh>
    );
}

// Laser beam component - fires from bottom center toward cursor
function LaserBeam({ visible, targetX }: { visible: boolean; targetX: number }) {
    const meshRef = useRef<Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            // Position at midpoint between bottom center and target
            const startX = 0;  // Bottom center
            const startY = -5; // Bottom of screen
            const endX = targetX * 5; // Target X in scene coords
            const endY = 6;    // Top of screen

            // Calculate angle and position
            const dx = endX - startX;
            const dy = endY - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dx, dy);

            // Position at midpoint
            meshRef.current.position.x = (startX + endX) / 2;
            meshRef.current.position.y = (startY + endY) / 2;
            meshRef.current.rotation.z = -angle;
            meshRef.current.scale.y = length / 10; // Adjust for base geometry height
        }
    });

    if (!visible) return null;

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 10, 0.08]} />
            <meshBasicMaterial color="#FFFF00" transparent opacity={0.9} />
        </mesh>
    );
}

export function GameScene({ combatLoop }: { combatLoop?: CombatLoop }) {
    const [laserVisible, setLaserVisible] = useState(false);

    useFrame((state) => {
        if (!combatLoop) return;

        // Flash laser beam periodically (synced with fire rate)
        // Fire rate is 450ms, show laser for 50ms
        const firePhase = (state.clock.elapsedTime * 1000) % 450;
        setLaserVisible(firePhase < 50);
    });

    return (
        <group>
            <GameEffects />
            <Starfield />

            {/* Laser Beam - fires from bottom center toward cursor */}
            <LaserBeam visible={laserVisible} targetX={combatLoop?.playerX ?? 0} />

            {/* Muzzle flash at bottom center when firing */}
            {laserVisible && (
                <pointLight position={[0, -5, 0]} color="#FFFF00" intensity={3} distance={4} />
            )}

            {/* Enemies: Declarative approach */}
            <group>
                {combatLoop?.activeEnemies.map(enemy => (
                    <EnemyRenderer key={enemy.id} enemy={enemy as any} />
                ))}
            </group>

            {/* Gun turret / firing origin indicator */}
            <mesh position={[0, -5, 0]}>
                <boxGeometry args={[0.5, 0.2, 0.5]} />
                <meshBasicMaterial color="#FFFF00" />
            </mesh>
        </group>
    );
}

// Sub-component to handle per-enemy updates efficiently
function EnemyRenderer({ enemy }: { enemy: { id: number, kind: string, position: { x: number, y: number }, velocity: { x: number } } }) {
    const group = useRef<Group>(null);

    useFrame((state, delta) => {
        if (!group.current) return;
        // Direct interpolation or read from source? 
        // Logic: The PARENT `GameScene` reads the authoritative `combatLoop` state.
        // But `enemy` prop is a snapshot from the render cycle.
        // If we want 60fps independent of React Render, we need to find *this* enemy in the live loop.
        // OR we just accept that React Renders on every Tick? 
        // Re-rendering 50 items 60times/sec in React is slightly heavy but for valid Phase 2/3 it's fine.

        // Actually, we can pass a "ref" to the enemy object if it's mutable?
        // In CombatLoop, `enemies` are objects.

        group.current.position.set(enemy.position.x * 5, 5 - (enemy.position.y * 10), 0);
        group.current.rotation.z = -enemy.velocity.x * 200;
    });

    return (
        <group ref={group}>
            <AssetMesh id={enemy.kind as AssetId} />
        </group>
    );
}
