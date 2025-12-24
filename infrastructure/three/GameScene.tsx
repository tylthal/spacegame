import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, Vector3, Object3D, InstancedMesh, PerspectiveCamera } from 'three';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useSpaceshipAsset, AssetId } from './assets/AssetLoader';
import { EnemyMesh } from './assets/EnemyMeshes';
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
            // Bullet velocity is normalized-ish direction
            // We can lookAt the next position: pos + vel
            dummy.current.lookAt(
                x + bullet.velocity.x,
                y + bullet.velocity.y,
                z + bullet.velocity.z
            );

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

// Hitbox radii must match CombatLoop's enemyRadius values
const HITBOX_RADIUS: Record<string, number> = {
    drone: 1.5,
    scout: 2.0,
    bomber: 2.5,
};

// Sub-component to handle per-enemy updates efficiently
function EnemyRenderer({ enemy, showHitbox = false }: { enemy: { id: number, kind: string, position: { x: number, y: number, z: number }, velocity: { x: number, y: number, z: number } }, showHitbox?: boolean }) {
    const group = useRef<Group>(null);
    const velocityVec = useRef(new Vector3());
    const targetPos = useRef(new Vector3());

    useFrame(() => {
        if (!group.current) return;

        const { x, y, z } = enemy.position;
        group.current.position.set(x, y, z);

        // VELOCITY-BASED ROTATION
        // Point the nose in the direction of travel
        const { x: vx, y: vy, z: vz } = enemy.velocity;
        velocityVec.current.set(vx, vy, vz);

        // Calculate point ahead in velocity direction
        targetPos.current.set(
            x + vx * 10,
            y + vy * 10,
            z + vz * 10
        );

        // Reset rotation before applying new one
        group.current.rotation.set(0, 0, 0);

        // Look at the point ahead - mesh is pre-flipped so -Z is nose
        group.current.lookAt(targetPos.current);
    });

    const hitboxRadius = HITBOX_RADIUS[enemy.kind] || 1.5;

    return (
        <group ref={group}>
            {/* Enemy mesh - already oriented with nose at -Z for lookAt */}
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
}

