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

// Laser beam component
function LaserBeam({ visible, playerX }: { visible: boolean; playerX: number }) {
    const meshRef = useRef<Mesh>(null);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.x = playerX * 5;
        }
    });

    if (!visible) return null;

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <boxGeometry args={[0.08, 10, 0.08]} />
            <meshBasicMaterial color="#FFFF00" transparent opacity={0.8} />
        </mesh>
    );
}

export function GameScene({ combatLoop }: { combatLoop?: CombatLoop }) {
    const playerRef = useRef<Group>(null);
    const lastPlayerX = useRef(0);
    const [laserVisible, setLaserVisible] = useState(false);

    useFrame((state, delta) => {
        if (!playerRef.current || !combatLoop) return;

        // Get current player X from combat loop (-1 to 1)
        const targetX = combatLoop.playerX * 5; // Scale to scene coordinates
        const currentX = playerRef.current.position.x;

        // Smooth interpolation for fluid movement
        const smoothedX = currentX + (targetX - currentX) * Math.min(1, delta * 10);
        playerRef.current.position.x = smoothedX;

        // Calculate velocity for tilt effect
        const velocity = smoothedX - lastPlayerX.current;
        lastPlayerX.current = smoothedX;

        // Tilt based on movement direction (bank into the turn)
        const targetTilt = -velocity * 2;
        const currentTilt = playerRef.current.rotation.z;
        playerRef.current.rotation.z = currentTilt + (targetTilt - currentTilt) * Math.min(1, delta * 5);

        // Subtle hover animation
        playerRef.current.position.y = -4 + Math.sin(state.clock.elapsedTime * 2) * 0.05;

        // Flash laser beam periodically (synced with fire rate)
        // Fire rate is 450ms, show laser for 50ms
        const firePhase = (state.clock.elapsedTime * 1000) % 450;
        setLaserVisible(firePhase < 50);
    });

    return (
        <group>
            <GameEffects />
            <Starfield />

            {/* Laser Beam */}
            <LaserBeam visible={laserVisible} playerX={combatLoop?.playerX ?? 0} />

            {/* Player Ship - now positioned dynamically */}
            <group ref={playerRef} position={[0, -4, 0]}>
                <AssetMesh id="hero" />

                {/* Muzzle flash when firing */}
                {laserVisible && (
                    <pointLight position={[0, 0.5, 0]} color="#FFFF00" intensity={2} distance={3} />
                )}
            </group>

            {/* Enemies: Declarative approach */}
            <group>
                {combatLoop?.activeEnemies.map(enemy => (
                    <EnemyRenderer key={enemy.id} enemy={enemy as any} />
                ))}
            </group>

            {/* Base platform / defense line indicator */}
            <mesh position={[0, -4.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[12, 0.5]} />
                <meshBasicMaterial color="#FFFF00" transparent opacity={0.3} />
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
