import React, { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, Vector3, Object3D, InstancedMesh, PerspectiveCamera } from 'three';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useSpaceshipAsset, AssetId } from './assets/AssetLoader';
import { EnemyMesh } from './assets/EnemyMeshes';
import { GameEffects } from './effects/EffectComposer';
import { Starfield } from './particles/ParticleSystem';
import { VoxelExplosion, Explosion, EXPLOSION_COLORS } from './effects/VoxelExplosion';
import { MissileExplosion, MissileExplosionData } from './effects/MissileExplosion';

function AssetMesh({ id, ...props }: { id: AssetId } & any) {
    const { geometryType, args, materialParams, scale } = useSpaceshipAsset(id);

    return (
        <mesh {...props} scale={scale as any}>
            {geometryType === 'cone' && <coneGeometry args={args as any} />}
            {geometryType === 'box' && <boxGeometry args={args as any} />}
            {geometryType === 'sphere' && <sphereGeometry args={args as any} />}
            {geometryType === 'tetrahedron' && <tetrahedronGeometry args={args as any} />}
            {geometryType === 'octahedron' && <octahedronGeometry args={args as any} />}
            <meshStandardMaterial {...materialParams} />
        </mesh>
    );
}

// Render individual bullets
// Render individual bullets - Plasma Bolt style
function InstancedBulletRenderer({ combatLoop }: { combatLoop: CombatLoop }) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());

    useFrame(() => {
        if (!meshRef.current) return;

        const bullets = combatLoop.activeBullets;

        // Update instance count to match active bullets
        meshRef.current.count = bullets.length;

        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            const { x, y, z } = bullet.position;

            dummy.current.position.set(x, y, z);

            // Orient bullet along velocity (trajectory)
            // lookAt makes -Z point at target, but capsule geometry is along Y axis
            dummy.current.lookAt(
                x + bullet.velocity.x,
                y + bullet.velocity.y,
                z + bullet.velocity.z
            );

            // Capsule geometry is oriented along Y axis by default
            // Rotate to align capsule's long axis with the forward direction (-Z after lookAt)
            dummy.current.rotateX(Math.PI / 2);

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

// Render missiles - larger and more dramatic than bullets
function InstancedMissileRenderer({ combatLoop }: { combatLoop: CombatLoop }) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());

    useFrame(() => {
        if (!meshRef.current) return;

        const missiles = combatLoop.activeMissiles;

        meshRef.current.count = missiles.length;

        for (let i = 0; i < missiles.length; i++) {
            const missile = missiles[i];
            const { x, y, z } = missile.position;

            dummy.current.position.set(x, y, z);

            // Orient missile along velocity
            dummy.current.lookAt(
                x + missile.velocity.x,
                y + missile.velocity.y,
                z + missile.velocity.z
            );

            // Cone geometry points up (+Y), rotate to point forward (-Z after lookAt)
            dummy.current.rotateX(Math.PI / 2);

            dummy.current.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.current.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 50]} frustumCulled={false}>
            {/* Missile style - larger cone shape with glow */}
            <coneGeometry args={[0.3, 1.2, 6]} />
            <meshStandardMaterial
                color="#FF4400"
                emissive="#FF6600"
                emissiveIntensity={4}
                roughness={0.1}
                metalness={0.9}
            />
        </instancedMesh>
    );
}

// Track enemy positions for explosion spawning
interface EnemySnapshot {
    id: number;
    kind: string;
    x: number;
    y: number;
    z: number;
}

// Debug: Draw line from muzzle to crosshair target
function DebugAimLine({ combatLoop }: { combatLoop: CombatLoop }) {
    const lineRef = useRef<any>(null);
    const pointsRef = useRef([new Vector3(), new Vector3()]);
    const { camera } = useThree();

    useFrame(() => {
        if (!lineRef.current) return;

        // Get actual camera properties
        const perspCamera = camera as PerspectiveCamera;
        const fov = perspCamera.fov * (Math.PI / 180); // vertical FOV in radians
        const aspect = perspCamera.aspect; // actual aspect ratio

        // Muzzle and target distance
        const MUZZLE_Y = -5;
        const TARGET_DISTANCE = 100;

        // Calculate half-extents using camera's actual FOV and aspect
        const halfHeight = TARGET_DISTANCE * Math.tan(fov / 2);
        const halfWidth = halfHeight * aspect;

        // Get cursor from combatLoop
        const cursorX = combatLoop.cursorX;
        const cursorY = combatLoop.cursorY;

        // Calculate target (using actual camera projection)
        const targetX = (cursorX - 0.5) * 2 * halfWidth;
        const targetY = (0.5 - cursorY) * 2 * halfHeight;
        const targetZ = -TARGET_DISTANCE;

        // MUZZLE: Fixed at visual BOTTOM-CENTER of screen
        // At distance MUZZLE_DISTANCE, the bottom of the screen is at Y = -halfHeight at that distance
        const MUZZLE_DISTANCE = 5; // Small distance in front of camera
        const muzzleHalfHeight = MUZZLE_DISTANCE * Math.tan(fov / 2);
        const muzzle = new Vector3(0, -muzzleHalfHeight, -MUZZLE_DISTANCE);

        // Target position
        const target = new Vector3(targetX, targetY, targetZ);

        // Calculate direction from muzzle to target
        const direction = target.clone().sub(muzzle).normalize();
        const extendedTarget = muzzle.clone().add(direction.multiplyScalar(200));

        // Update line geometry
        pointsRef.current[0].copy(muzzle);
        pointsRef.current[1].copy(extendedTarget);

        lineRef.current.geometry.setFromPoints(pointsRef.current);
        lineRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <line ref={lineRef}>
            <bufferGeometry />
            <lineBasicMaterial color="#00BFFF" linewidth={2} />
        </line>
    );
}

export function GameScene({ combatLoop, isRunning = true }: { combatLoop?: CombatLoop, isRunning?: boolean }) {
    // Optimization: Only force re-render when the number of enemies changes
    const [version, setVersion] = useState(0);
    const lastEntityCount = useRef(0);

    // Explosion system - using refs to avoid allocations
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const enemySnapshotsRef = useRef<Map<number, EnemySnapshot>>(new Map());
    const explosionIdRef = useRef(0);
    const currentEnemyIdsRef = useRef<Set<number>>(new Set()); // Reusable Set
    const pendingExplosionsRef = useRef<Explosion[]>([]); // Batch queue

    const handleExplosionComplete = useCallback((id: number) => {
        setExplosions(prev => prev.filter(e => e.id !== id));
    }, []);

    // Missile explosion system
    const [missileExplosions, setMissileExplosions] = useState<MissileExplosionData[]>([]);
    const missileSnapshotsRef = useRef<Map<number, { id: number, x: number, y: number, z: number }>>(new Map());
    const missileExplosionIdRef = useRef(0);
    const currentMissileIdsRef = useRef<Set<number>>(new Set()); // Reusable Set
    const pendingMissileExplosionsRef = useRef<MissileExplosionData[]>([]); // Batch queue
    const MISSILE_BLAST_RADIUS = 15;

    const handleMissileExplosionComplete = useCallback((id: number) => {
        setMissileExplosions(prev => prev.filter(e => e.id !== id));
    }, []);

    useFrame((state, delta) => {
        if (!combatLoop) return;

        // CRITICAL: Tick the Game Logic (Physics, Spawning, Heat)
        // Only tick if the game is actively running (Phase = PLAYING)
        if (isRunning) {
            combatLoop.tick(delta * 1000);
        }

        // Track current enemies and detect deaths for explosions
        // Using reusable Set to avoid allocations
        const currentEnemies = combatLoop.activeEnemies;
        const currentIds = currentEnemyIdsRef.current;
        currentIds.clear();
        for (const e of currentEnemies) currentIds.add(e.id);

        // Update snapshots for current enemies
        for (const enemy of currentEnemies) {
            enemySnapshotsRef.current.set(enemy.id, {
                id: enemy.id,
                kind: enemy.kind,
                x: enemy.position.x,
                y: enemy.position.y,
                z: enemy.position.z,
            });
        }

        // Find enemies that died (were in snapshot but not in current)
        let hasNewExplosions = false;
        for (const [id, snapshot] of enemySnapshotsRef.current) {
            if (!currentIds.has(id)) {
                pendingExplosionsRef.current.push({
                    id: explosionIdRef.current++,
                    x: snapshot.x,
                    y: snapshot.y,
                    z: snapshot.z,
                    color: EXPLOSION_COLORS[snapshot.kind] || '#00FFFF',
                    createdAt: 0, // Not used with delta-based timing
                });
                enemySnapshotsRef.current.delete(id);
                hasNewExplosions = true;
            }
        }

        // Batch update React state (once per frame max)
        if (hasNewExplosions) {
            const pending = [...pendingExplosionsRef.current];
            pendingExplosionsRef.current.length = 0;
            setExplosions(prev => [...prev, ...pending]);
        }

        // Track missiles for missile explosions (reusable Set)
        const currentMissiles = combatLoop.activeMissiles;
        const currentMissileIds = currentMissileIdsRef.current;
        currentMissileIds.clear();
        for (const m of currentMissiles) currentMissileIds.add(m.id);

        // Update missile snapshots
        for (const missile of currentMissiles) {
            missileSnapshotsRef.current.set(missile.id, {
                id: missile.id,
                x: missile.position.x,
                y: missile.position.y,
                z: missile.position.z,
            });
        }

        // Find missiles that detonated
        let hasNewMissileExplosions = false;
        for (const [id, snapshot] of missileSnapshotsRef.current) {
            if (!currentMissileIds.has(id)) {
                pendingMissileExplosionsRef.current.push({
                    id: missileExplosionIdRef.current++,
                    x: snapshot.x,
                    y: snapshot.y,
                    z: snapshot.z,
                    blastRadius: MISSILE_BLAST_RADIUS,
                    createdAt: 0,
                });
                missileSnapshotsRef.current.delete(id);
                hasNewMissileExplosions = true;
            }
        }

        if (hasNewMissileExplosions) {
            const pending = [...pendingMissileExplosionsRef.current];
            pendingMissileExplosionsRef.current.length = 0;
            setMissileExplosions(prev => [...prev, ...pending]);
        }

        // Only track enemies for React updates now
        const count = currentEnemies.length;
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

            {/* Missiles - Larger projectiles with area damage */}
            {combatLoop && <InstancedMissileRenderer combatLoop={combatLoop} />}

            {/* Enemies */}
            <group>
                {combatLoop?.activeEnemies.map(enemy => (
                    <EnemyRenderer key={enemy.id} enemy={enemy as any} />
                ))}
            </group>

            {/* Explosions */}
            {explosions.map(explosion => (
                <VoxelExplosion
                    key={explosion.id}
                    explosion={explosion}
                    onComplete={handleExplosionComplete}
                />
            ))}

            {/* Missile Explosions */}
            {missileExplosions.map(explosion => (
                <MissileExplosion
                    key={explosion.id}
                    explosion={explosion}
                    onComplete={handleMissileExplosionComplete}
                />
            ))}
        </group>
    );
}

// Hitbox radii must match CombatLoop's enemyRadius values
const HITBOX_RADIUS: Record<string, number> = {
    drone: 1.5,
    scout: 2.0,
    bomber: 2.5,
    weaver: 1.8,
};

// Sub-component to handle per-enemy updates efficiently - memoized
const EnemyRenderer = React.memo(function EnemyRenderer({ enemy, showHitbox = false }: { enemy: { id: number, kind: string, position: { x: number, y: number, z: number }, velocity: { x: number, y: number, z: number } }, showHitbox?: boolean }) {
    const group = useRef<Group>(null);
    const velocityVec = useRef(new Vector3());
    const targetPos = useRef(new Vector3());

    useFrame(() => {
        if (!group.current) return;

        const { x, y, z } = enemy.position;
        group.current.position.set(x, y, z);

        // ========================================
        // ENEMY ORIENTATION SYSTEM
        // ========================================
        // 
        // How it works:
        // 1. Enemy meshes are authored with NOSE at +Z and ENGINE at -Z
        // 2. Three.js lookAt() makes the object's -Z axis point at the target
        // 3. By looking at a point AHEAD (in velocity direction), the mesh's
        //    -Z (engine) points toward where we're going
        // 4. This means +Z (nose) points AWAY from where we're looking,
        //    which is the OPPOSITE direction of travel
        // 
        // Wait, that sounds backwards, but it works because of how the
        // camera/world coordinates interact. Empirically tested: lookAt(ahead)
        // makes the nose lead and engine trail. DO NOT CHANGE without testing!
        // ========================================

        const { x: vx, y: vy, z: vz } = enemy.velocity;
        velocityVec.current.set(vx, vy, vz);

        // Look at point AHEAD in velocity direction
        targetPos.current.set(
            x + vx * 10,
            y + vy * 10,
            z + vz * 10
        );

        // Reset rotation before applying new lookAt
        group.current.rotation.set(0, 0, 0);
        group.current.lookAt(targetPos.current);
    });

    const hitboxRadius = HITBOX_RADIUS[enemy.kind] || 1.5;

    return (
        <group ref={group}>
            <EnemyMesh kind={enemy.kind} />
            {/* Debug hitbox visualization */}
            {showHitbox && (
                <mesh>
                    <sphereGeometry args={[hitboxRadius, 16, 12]} />
                    <meshBasicMaterial
                        color="#00ff00"
                        wireframe={true}
                        transparent={true}
                        opacity={0.5}
                    />
                </mesh>
            )}
        </group>
    );
});

