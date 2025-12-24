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
    const [isFiring, setIsFiring] = useState(false);

    useFrame(() => {
        if (!combatLoop) return;
        setIsFiring(combatLoop.isFiring);
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

            {/* Muzzle flash at bottom center when firing */}
            {isFiring && (
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
        group.current.position.set(enemy.position.x * 5, 5 - (enemy.position.y * 10), 0);
        group.current.rotation.z = -enemy.velocity.x * 200;
    });

    return (
        <group ref={group}>
            <AssetMesh id={enemy.kind as AssetId} />
        </group>
    );
}
