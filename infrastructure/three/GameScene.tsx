import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
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

export function GameScene({ combatLoop }: { combatLoop?: CombatLoop }) {
    const playerRef = useRef<Group>(null);
    const enemyGroupRef = useRef<Group>(null);

    useFrame((state, delta) => {
        if (!combatLoop || !enemyGroupRef.current) return;

        const enemies = combatLoop.activeEnemies;
        const group = enemyGroupRef.current;

        // Reconciliation (Naive for now)
        // Optimize: Use key-based reconciliation or object pooling in Phase 3 polish
        while (group.children.length > enemies.length) {
            group.remove(group.children[0]);
        }
        // Add new enemies if needed (Note: This simple logic assumes enemies are added at end, 
        // but splicing happens in storage. This visual glitches if IDs aren't tracked.
        // For "Assets & Polish", we should map by ID. But for now, let's keep it simple to verify visuals first.)

        // Ideally we render declarative list: {enemies.map(e => <Enemy key={e.id} ... />)} 
        // But doing that directly in generic React reconciler inside useFrame is bad.
        // We'll stick to manual manipulation for performance, but we need to track mesh<->id.
        // For this step: CLEAR AND REBUILD is safest to ensure correct asset type.
        // BUT it kills performance. 

        // Better approach for smooth movement: 
        // Just update existing children. If count mismatch, rebuild or add/remove.
        // Note: Enemy types vary! So index-based reuse only works if type matches.

        // FAST PATH for demo:
        while (group.children.length < enemies.length) {
            // We don't know the type of the NEW enemy here quickly without looking up the generic list index.
            // Let's just create generic meshes and update their Geometry/Material in the loop below?
            // No, swapping geometry is expensive.

            // Let's create a placeholder container (Group) and mount the asset inside it relative to 0,0,0
            const container = new Group();
            group.add(container);
        }

        // Update
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            const container = group.children[i] as Group;

            // Check if we need to hydrate the asset (if empty)
            if (container.children.length === 0) {
                // This part effectively happens once per spawn
                // We can't easily use React components here imperatively.
                // We should probably rely on the React tree for spawning, 
                // `combatLoop` updates state -> React Renders <Enemy> components.
                // `useFrame` is for position updates.
            }

            // POSITION UPDATE
            // Map Game Y[0->1] to Scene Y[5 -> -5]. 
            // X [-0.9, 0.9] -> Scene X [-5, 5] approx.

            container.position.set(enemy.position.x * 5, 5 - (enemy.position.y * 10), 0);

            // Tilt bank based on velocity?
            container.rotation.z = -enemy.velocity.x * 1000;
            container.rotation.y += delta; // Spin
        }

        // Spin Player
        if (playerRef.current) {
            // Player movement follow mouse? 
            // For now just idle animation
            playerRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });

    return (
        <group>
            <GameEffects />
            <Starfield />

            {/* Player Ship */}
            <group ref={playerRef} position={[0, -4, 0]}>
                <AssetMesh id="hero" />
            </group>

            {/* Enemies: Declarative approach is better for asset stable mounting */}
            {/* We will let React manage the specific meshes, and useFrame to animate them via refs if possible? */}
            {/* Actually, for high performance, we want imperative, but for 20 enemies, React is fine. */}
            {/* Let's switch to Declarative for Enemy Spawning to simplify asset logic. */}

            <group>
                {combatLoop?.activeEnemies.map(enemy => (
                    <EnemyRenderer key={enemy.id} enemy={enemy as any} />
                    // cast as any because of strict type mismatch in EnemyKind vs AssetId string
                    // We need a mapping function.
                ))}
            </group>

            <gridHelper args={[20, 20, 0x222222, 0x111111]} position={[0, -5, 0]} />
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
