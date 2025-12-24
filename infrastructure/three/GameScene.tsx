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

// Render individual bullets
function BulletRenderer({ bullet }: { bullet: { position: { x: number, y: number } } }) {
    const mesh = useRef<Mesh>(null);

    useFrame(() => {
        if (!mesh.current) return;
        // Map logic coords (x: -1..1, y: 1..-1) to scene coords (x: -5..5, y: -5..15)
        // Matches EnemyRenderer logic: sceneY = 5 - (logicY * 10)
        const sceneX = bullet.position.x * 5;
        const sceneY = 5 - (bullet.position.y * 10);

        mesh.current.position.set(sceneX, sceneY, 0);
    });

    return (
        <mesh ref={mesh}>
            <boxGeometry args={[0.2, 0.4, 0.2]} />
            <meshBasicMaterial color="#FFFF00" />
        </mesh>
    );
}

export function GameScene({ combatLoop }: { combatLoop?: CombatLoop }) {
    // Force re-render on every frame to animating bullets/enemies
    // In React-Three-Fiber, standard practice is refs for imperative updates.
    // But adding/removing bullets requires state or forced update.
    // Since CombatLoop manages the array, we just need to ensure we re-render usage.
    // The `useFrame` in GameScene doesn't trigger React render.
    // However, `combatLoop.activeBullets` is a standard array.
    // Changes to its length won't trigger React.
    // We need a mechanism to force re-render or use a pool.
    // For now, let's use a dummy state to force 60fps React render for the lists?
    // Or better: Use <InstanceMesh> for bullets?
    // Given the low count (10-20 bullets), a simple tick that forces update is fine.

    // Actually, `activeEnemies` implementation is:
    // {combatLoop?.activeEnemies.map(...)}
    // If `activeEnemies` changes (splice/push), React won't know!
    // We need `useFrame` to force update, or use `useState` to generic version.
    // Existing code didn't handle enemy spawning updates reactively?
    // Ah, `useSpaceshipAsset` hooks? No.
    // The existing `GameScene` relies on `combatLoop` prop.
    // If `combatLoop` instance is constant, React doesn't re-render.
    // THIS IS A BUG. New enemies won't appear!
    // I need to fix this.

    // I will add a `useFrame` that uses `useState` to force render if counts change.
    const [tick, setTick] = useState(0);
    useFrame(() => {
        if (!combatLoop) return;
        // Cheap check: if enemy/bullet count changed, or just 30fps update?
        // Let's force update every few frames or just rely on React's speed?
        // For "Arcade", let's force render.
        setTick(t => (t + 1) % 60);
    });

    return (
        <group>
            <GameEffects />
            <Starfield />

            {/* Bullets */}
            <group>
                {combatLoop?.activeBullets.map(bullet => (
                    <BulletRenderer key={bullet.id} bullet={bullet} />
                ))}
            </group>

            {/* Enemies */}
            <group>
                {combatLoop?.activeEnemies.map(enemy => (
                    <EnemyRenderer key={enemy.id} enemy={enemy as any} />
                ))}
            </group>
        </group>
    );
}

// Sub-component to handle per-enemy updates efficiently
function EnemyRenderer({ enemy }: { enemy: { id: number, kind: string, position: { x: number, y: number }, velocity: { x: number } } }) {
    const group = useRef<Group>(null);

    useFrame((state, delta) => {
        if (!group.current) return;
        group.current.position.set(enemy.position.x * 5, 5 - (enemy.position.y * 10), 0);
        group.current.rotation.z = -enemy.velocity.x * 200;
    });

    return (
        <group ref={group}>
            <AssetMesh id={enemy.kind as AssetId} />
        </group>
    );
}
