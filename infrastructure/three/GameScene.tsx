import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, Vector3, Object3D, InstancedMesh } from 'three';
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
// Render individual bullets - Plasma Bolt style
// Helper: Lane Projection Logic (Star Fox / Guitar Hero style)
// Logic X (-1..1), Y (0..1) -> Scene X, Y, Z
// Y maps to Depth (Z): 0 -> -50 (Far), 1 -> 0 (Near)
// X maps to Width (X): Scales with depth to create "Lane" effect
function projectToLane(logicX: number, logicY: number): Vector3 {
    // 1. Z-Depth: Logic Y (1..0) -> Z (0..-50)
    // Wait, Logic Y=0 (Start) -> Far (-50)
    // Logic Y=1 (Base) -> Near (0)
    // CombatLoop Y is 0 (Top) -> 1 (Base)
    const zFar = -50;
    const zNear = 0;
    // Logic Y=0 should be FAR (-50)
    // Logic Y=1 should be NEAR (0)
    // Formula: -50 + (logicY * 50)
    const sceneZ = zFar + (logicY * (zNear - zFar));

    // 2. X-Width: Perspective scaling
    // At Near (Z=0), Width is ~10 (-5 to 5)
    // At Far (Z=-50), Width should be wider (e.g. 50)
    // Scale factor = 1 + (dist / 15)
    const dist = zNear - sceneZ;
    const scale = 1 + (dist / 15); // Tune this for "Lane" feel
    const baseX = 5; // Base half-width
    const sceneX = logicX * baseX * scale;

    const sceneY = 0; // Flat plane for now

    return new Vector3(sceneX, sceneY, sceneZ);
}

// Render all bullets using a single draw call via InstancedMesh
function InstancedBulletRenderer({ combatLoop }: { combatLoop: CombatLoop }) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());

    useFrame(() => {
        if (!meshRef.current) return;

        const bullets = combatLoop.activeBullets;

        // Update instance count to match active bullets
        // Note: count must be <= args max count. Default 1000 is plenty.
        meshRef.current.count = bullets.length;

        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];

            // Logic Y for bullets goes from >1 (Base) to Target (<0) (Distance)
            const pos = projectToLane(bullet.position.x, bullet.position.y);

            dummy.current.position.copy(pos);
            dummy.current.lookAt(pos.x, pos.y, pos.z - 10); // Look forward/down range
            dummy.current.updateMatrix();

            meshRef.current.setMatrixAt(i, dummy.current.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 1000]} frustumCulled={false}>
            {/* Plasma Bolt Style */}
            <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
            <meshStandardMaterial
                color="#FFFF00"
                emissive="#FFFF00"
                emissiveIntensity={2}
                roughness={0.2}
                metalness={0.8}
            />
        </instancedMesh>
    );
}

export function GameScene({ combatLoop, isRunning = true }: { combatLoop?: CombatLoop, isRunning?: boolean }) {
    // Optimization: Only force re-render when the number of enemies changes
    // Bullets are now handled by the InstancedBulletRenderer efficiently inside useFrame
    const [version, setVersion] = useState(0);
    const lastEntityCount = useRef(0);

    useFrame((state, delta) => {
        if (!combatLoop) return;

        // CRITICAL: Tick the Game Logic (Physics, Spawning, Heat)
        // Only tick if the game is actively running (Phase = PLAYING)
        if (isRunning) {
            combatLoop.tick(delta * 1000);
        }

        // Only track enemies for React updates now
        const count = combatLoop.activeEnemies.length;
        if (count !== lastEntityCount.current) {
            lastEntityCount.current = count;
            setVersion(v => v + 1);
        }
    });

    return (
        <group>
            <GameEffects />
            <Starfield />

            {/* Bullets - Instanced for High Performance */}
            {combatLoop && <InstancedBulletRenderer combatLoop={combatLoop} />}

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

        const pos = projectToLane(enemy.position.x, enemy.position.y);
        group.current.position.copy(pos);

        // Tilt sprite/mesh towards camera slightly
        group.current.rotation.x = 0;
        group.current.rotation.y = 0;
        group.current.rotation.z = -enemy.velocity.x * 200; // Bank turn
    });

    return (
        <group ref={group}>
            <AssetMesh id={enemy.kind as AssetId} />
        </group>
    );
}
