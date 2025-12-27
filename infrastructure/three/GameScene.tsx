import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Group, Mesh, Vector3, Object3D, InstancedMesh, PerspectiveCamera, Points } from 'three';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useSpaceshipAsset, AssetId } from './assets/AssetLoader';
import { GameEffects } from './effects/EffectComposer';
import { Starfield } from './particles/ParticleSystem';
import { VoxelExplosion, Explosion, EXPLOSION_COLORS } from './effects/VoxelExplosion';
import { MissileExplosion, MissileExplosionData } from './effects/MissileExplosion';
import { FloatingScore, FloatingScoreData } from './effects/FloatingScore';
import { InstancedEnemyRenderer } from './InstancedEnemyRenderer';
import { GAME_CONFIG } from '../../config/gameConfig';
import { SoundEngine } from '../../audio/SoundEngine';
import type { EnemyKind } from '../../rendering/EnemyFactory';

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

// Render enemy bullets - Blue Sphere with White Lightning Core
function InstancedEnemyBulletRenderer({ combatLoop }: { combatLoop: CombatLoop }) {
    const coreRef = useRef<InstancedMesh>(null);
    const haloRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());

    useFrame(() => {
        if (!coreRef.current || !haloRef.current) return;

        const bullets = combatLoop.activeEnemyBullets;

        // Update instance counts
        coreRef.current.count = bullets.length;
        haloRef.current.count = bullets.length;

        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            const { x, y, z } = bullet.position;

            dummy.current.position.set(x, y, z);
            // No rotation needed for spheres, but we can set it anyway
            dummy.current.updateMatrix();

            coreRef.current.setMatrixAt(i, dummy.current.matrix);
            haloRef.current.setMatrixAt(i, dummy.current.matrix);
        }

        coreRef.current.instanceMatrix.needsUpdate = true;
        haloRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            {/* INNER CORE: Very bright, small, white/blue - looks like lightning source */}
            <instancedMesh ref={coreRef} args={[undefined, undefined, 200]} frustumCulled={false}>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial
                    color="#FFFFFF"
                    emissive="#FFFFFF"
                    emissiveIntensity={4}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* OUTER HALO: Larger, transparent blue - "Electric" aura */}
            <instancedMesh ref={haloRef} args={[undefined, undefined, 200]} frustumCulled={false}>
                <sphereGeometry args={[0.5, 12, 12]} />
                <meshStandardMaterial
                    color="#0088FF"
                    emissive="#0044FF"
                    emissiveIntensity={2}
                    transparent={true}
                    opacity={0.6}
                    roughness={0.1}
                    metalness={0.1}
                />
            </instancedMesh>
        </group>
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

// Nova Burst Shockwave with color-shifting rings, streaks, and sparks
function ShockwaveRenderer({ combatLoop }: { combatLoop: CombatLoop }) {
    const groupRef = useRef<Group>(null);
    const ringsRef = useRef<Mesh[]>([]);
    const streaksRef = useRef<Mesh[]>([]);
    const sparksRef = useRef<Points>(null);
    const timeRef = useRef(0);

    const NUM_RINGS = 10;
    const NUM_STREAKS = 16;
    const NUM_SPARKS = 50;
    const RING_SPACING = 4;
    const MAX_RADIUS = 150;

    // Create spark positions once
    const sparkPositions = useMemo(() => {
        const positions = new Float32Array(NUM_SPARKS * 3);
        for (let i = 0; i < NUM_SPARKS; i++) {
            const angle = (i / NUM_SPARKS) * Math.PI * 2 + Math.random() * 0.3;
            positions[i * 3] = Math.cos(angle);
            positions[i * 3 + 1] = Math.sin(angle);
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        }
        return positions;
    }, []);

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        if (!combatLoop.isShockwaveActive) {
            groupRef.current.visible = false;
            timeRef.current = 0;
            return;
        }

        groupRef.current.visible = true;
        timeRef.current += delta;
        const baseRadius = combatLoop.currentShockwaveRadius;
        const time = timeRef.current;

        groupRef.current.position.set(0, 0, 5);

        // Animate rings with shifting colors
        ringsRef.current.forEach((ring, i) => {
            if (!ring) return;

            const ringRadius = Math.max(0.1, baseRadius - (i * RING_SPACING));
            if (ringRadius < 0.1) {
                ring.visible = false;
                return;
            }
            ring.visible = true;
            ring.scale.setScalar(ringRadius);

            const fadeProgress = ringRadius / MAX_RADIUS;
            const material = ring.material as THREE.MeshStandardMaterial;

            // Color shift: orange → yellow → white based on time + ring index
            const colorPhase = (time * 3 + i * 0.5) % 3;
            if (colorPhase < 1) {
                // Orange to yellow
                material.color.setRGB(1, 0.4 + colorPhase * 0.5, colorPhase * 0.2);
                material.emissive.setRGB(1, 0.6 + colorPhase * 0.3, colorPhase * 0.3);
            } else if (colorPhase < 2) {
                // Yellow to white
                const t = colorPhase - 1;
                material.color.setRGB(1, 0.9 + t * 0.1, 0.2 + t * 0.8);
                material.emissive.setRGB(1, 0.9 + t * 0.1, 0.3 + t * 0.7);
            } else {
                // White back to orange
                const t = colorPhase - 2;
                material.color.setRGB(1, 1 - t * 0.6, 1 - t * 0.8);
                material.emissive.setRGB(1, 1 - t * 0.4, 1 - t * 0.7);
            }

            material.opacity = Math.max(0, (1 - fadeProgress * 0.7) - (i * 0.06));
            material.emissiveIntensity = Math.max(0.5, 5 - (i * 0.25) - (fadeProgress * 2));
        });

        // Animate streaks - radial lines emanating outward
        streaksRef.current.forEach((streak, i) => {
            if (!streak) return;
            const angle = (i / NUM_STREAKS) * Math.PI * 2;
            const streakRadius = baseRadius * 1.1;

            streak.visible = baseRadius > 5;
            streak.scale.set(streakRadius * 0.8, 1, 1);
            streak.rotation.z = angle;

            const material = streak.material as THREE.MeshBasicMaterial;
            const colorOffset = time * 2 + i * 0.3;
            const hue = (0.05 + Math.sin(colorOffset) * 0.05); // Orange-red range
            material.color.setHSL(hue, 1, 0.6 + Math.sin(colorOffset * 2) * 0.2);
            material.opacity = Math.max(0, 0.8 - (baseRadius / MAX_RADIUS));
        });

        // Animate sparks at the edge
        if (sparksRef.current) {
            const sparkGeom = sparksRef.current.geometry;
            const positions = sparkGeom.attributes.position.array as Float32Array;

            for (let i = 0; i < NUM_SPARKS; i++) {
                const baseAngle = (i / NUM_SPARKS) * Math.PI * 2;
                const sparkOffset = Math.sin(time * 10 + i * 0.5) * 0.15;
                const sparkRadius = baseRadius * (1 + sparkOffset);

                positions[i * 3] = Math.cos(baseAngle + time * 0.5) * sparkRadius;
                positions[i * 3 + 1] = Math.sin(baseAngle + time * 0.5) * sparkRadius;
                positions[i * 3 + 2] = Math.sin(time * 15 + i) * 2;
            }
            sparkGeom.attributes.position.needsUpdate = true;

            const sparkMat = sparksRef.current.material as THREE.PointsMaterial;
            sparkMat.opacity = Math.max(0, 1 - (baseRadius / MAX_RADIUS) * 0.8);
        }
    });

    return (
        <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
            {/* Main expanding rings */}
            {Array.from({ length: NUM_RINGS }).map((_, i) => (
                <mesh
                    key={`ring-${i}`}
                    ref={(el) => { if (el) ringsRef.current[i] = el; }}
                >
                    <torusGeometry args={[1, 0.25 - (i * 0.02), 16, 100]} />
                    <meshStandardMaterial
                        color="#FF6B00"
                        emissive="#FFD700"
                        emissiveIntensity={4}
                        transparent
                        opacity={1}
                        side={2}
                    />
                </mesh>
            ))}

            {/* Radial streaks */}
            {Array.from({ length: NUM_STREAKS }).map((_, i) => (
                <mesh
                    key={`streak-${i}`}
                    ref={(el) => { if (el) streaksRef.current[i] = el; }}
                    position={[0, 0, 0]}
                >
                    <planeGeometry args={[1, 0.15]} />
                    <meshBasicMaterial
                        color="#FFAA00"
                        transparent
                        opacity={0.8}
                        side={2}
                    />
                </mesh>
            ))}

            {/* Edge sparks */}
            <points ref={sparksRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={NUM_SPARKS}
                        array={sparkPositions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color="#FFFFFF"
                    size={2}
                    transparent
                    opacity={1}
                    sizeAttenuation
                />
            </points>
        </group>
    );
}

function InstancedExplosionRenderer({ combatLoop }: { combatLoop: CombatLoop }) {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useRef(new Object3D());

    useFrame(() => {
        if (!meshRef.current) return;
    });

    return null;
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

    // Floating score system
    const [floatingScores, setFloatingScores] = useState<FloatingScoreData[]>([]);
    const floatingScoreIdRef = useRef(0);
    const pendingScoresRef = useRef<FloatingScoreData[]>([]);

    const handleFloatingScoreComplete = useCallback((id: number) => {
        setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, []);

    useFrame((state, delta) => {
        if (!combatLoop) return;

        // CRITICAL: Tick the Game Logic (Physics, Spawning, Heat)
        // Only tick if the game is actively running (Phase = PLAYING)
        if (isRunning) {
            const tickResult = combatLoop.tick(delta * 1000);
            const { destroyed, interceptedEnemyBullets } = tickResult;

            // Handle destroyed enemies (sound + visual)
            if (destroyed && destroyed.length > 0) {
                for (const enemy of destroyed) {
                    // Spawn explosion
                    pendingExplosionsRef.current.push({
                        id: explosionIdRef.current++,
                        x: enemy.position.x,
                        y: enemy.position.y,
                        z: enemy.position.z,
                        color: EXPLOSION_COLORS[enemy.kind] || '#00FFFF',
                        createdAt: 0,
                    });

                    // Spawn floating score
                    const points = GAME_CONFIG.scoring[enemy.kind as EnemyKind] || 100;
                    pendingScoresRef.current.push({
                        id: floatingScoreIdRef.current++,
                        x: enemy.position.x,
                        y: enemy.position.y,
                        z: enemy.position.z,
                        points,
                    });

                    // Play score pickup sound
                    SoundEngine.play('scorePickup');
                }
            }

            // Handle intercepted enemy bullets (Blue/White explosion)
            if (interceptedEnemyBullets && interceptedEnemyBullets.length > 0) {
                for (const pos of interceptedEnemyBullets) {
                    // Spawn Blue Explosion
                    pendingExplosionsRef.current.push({
                        id: explosionIdRef.current++,
                        x: pos.x,
                        y: pos.y,
                        z: pos.z,
                        color: '#00FFFF', // Cyan/Blue
                        createdAt: 0,
                    });

                    // Spawn White Core Explosion (for that "flash" effect)
                    pendingExplosionsRef.current.push({
                        id: explosionIdRef.current++,
                        x: pos.x,
                        y: pos.y,
                        z: pos.z + 0.5, // Slightly in front
                        color: '#FFFFFF', // White
                        createdAt: 0,
                    });
                }
            }

            // Track current enemies for React updates
            const currentEnemies = combatLoop.activeEnemies;

            // Batch update React state (once per frame max)
            if (pendingExplosionsRef.current.length > 0 || pendingScoresRef.current.length > 0) {
                const pendingExp = [...pendingExplosionsRef.current];
                pendingExplosionsRef.current.length = 0;
                setExplosions(prev => [...prev, ...pendingExp]);

                const pendingScr = [...pendingScoresRef.current];
                pendingScoresRef.current.length = 0;
                setFloatingScores(prev => [...prev, ...pendingScr]);
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
        }
    });

    return (
        <group>
            <GameEffects />
            <Starfield />

            {/* Bullets - Instanced for High Performance */}
            {combatLoop && <InstancedBulletRenderer combatLoop={combatLoop} />}

            {/* Enemy Bullets - Instanced Red Plasma */}
            {combatLoop && <InstancedEnemyBulletRenderer combatLoop={combatLoop} />}
            {combatLoop && <ShockwaveRenderer combatLoop={combatLoop} />}
            {combatLoop && <InstancedExplosionRenderer combatLoop={combatLoop} />}
            {/* Missiles - Larger projectiles with area damage */}
            {combatLoop && <InstancedMissileRenderer combatLoop={combatLoop} />}

            {/* Enemies - Instanced for High Performance */}
            {combatLoop && (
                <InstancedEnemyRenderer enemies={combatLoop.activeEnemies as any} />
            )}

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

            {/* Floating Score Indicators */}
            {floatingScores.map(score => (
                <FloatingScore
                    key={score.id}
                    score={score}
                    onComplete={handleFloatingScoreComplete}
                />
            ))}
        </group>
    );
}
