/**
 * OrbitalStation.tsx
 * 
 * 3D space station model for the title screen.
 * Features:
 * - Central spire with docking bay and modules
 * - 4 structural spokes with walkways
 * - Rotating habitat ring with windows
 * - Detailed antenna arrays, solar panels, lights
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Material presets - visible on dark background
const HULL_DARK = {
    color: '#4a4a5a',
    metalness: 0.7,
    roughness: 0.3,
};

const HULL_MEDIUM = {
    color: '#6a6a7a',
    metalness: 0.6,
    roughness: 0.4,
};

const HULL_LIGHT = {
    color: '#8a8a9a',
    metalness: 0.5,
    roughness: 0.5,
};

const LIGHT_BLUE = {
    color: '#00ccff',
    emissive: '#00ccff',
    emissiveIntensity: 3.0,
};

const LIGHT_AMBER = {
    color: '#ffcc00',
    emissive: '#ffaa00',
    emissiveIntensity: 2.5,
};

const LIGHT_WHITE = {
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 4.0,
};

const LIGHT_RED = {
    color: '#ff0044',
    emissive: '#ff0044',
    emissiveIntensity: 3.0,
};

const LIGHT_GREEN = {
    color: '#00ff66',
    emissive: '#00ff66',
    emissiveIntensity: 2.5,
};

/** Central Spire - vertical hub of the station */
function CentralSpire() {
    return (
        <group>
            {/* Main spire body - segmented */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.9, 1.3, 5, 12]} />
                <meshStandardMaterial {...HULL_DARK} />
            </mesh>

            {/* Middle ring detail */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[1.1, 1.1, 0.3, 12]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>

            {/* Upper command module */}
            <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[0.7, 0.9, 1.5, 12]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Command dome */}
            <mesh position={[0, 4, 0]}>
                <sphereGeometry args={[0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>

            {/* Antenna mast */}
            <mesh position={[0, 5, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 2, 6]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Antenna dishes */}
            <mesh position={[0.3, 4.8, 0]} rotation={[0, 0, 0.5]}>
                <coneGeometry args={[0.15, 0.1, 8]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>
            <mesh position={[-0.3, 5.2, 0]} rotation={[0, 0, -0.5]}>
                <coneGeometry args={[0.12, 0.08, 8]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>

            {/* Antenna beacon */}
            <mesh position={[0, 6, 0]}>
                <sphereGeometry args={[0.12, 8, 6]} />
                <meshStandardMaterial {...LIGHT_RED} />
            </mesh>

            {/* Docking bay section (lower) */}
            <mesh position={[0, -3, 0]}>
                <cylinderGeometry args={[1.2, 1.0, 1.5, 12]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Docking ports - 4 around */}
            {[0, 1, 2, 3].map(i => {
                const angle = (i * Math.PI) / 2;
                return (
                    <mesh key={`dock-${i}`} position={[Math.cos(angle) * 1.2, -3, Math.sin(angle) * 1.2]} rotation={[0, -angle, Math.PI / 2]}>
                        <cylinderGeometry args={[0.2, 0.25, 0.4, 8]} />
                        <meshStandardMaterial {...HULL_LIGHT} />
                    </mesh>
                );
            })}

            {/* Docking lights */}
            {[0, 1, 2, 3].map(i => {
                const angle = (i * Math.PI) / 2;
                return (
                    <mesh key={`dock-light-${i}`} position={[Math.cos(angle) * 1.4, -3, Math.sin(angle) * 1.4]}>
                        <sphereGeometry args={[0.08, 6, 4]} />
                        <meshStandardMaterial {...LIGHT_GREEN} />
                    </mesh>
                );
            })}

            {/* Lower antenna */}
            <mesh position={[0, -4.5, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Spire windows - multiple rows */}
            {[0, 1, 2, 3, 4, 5].map(i => (
                <group key={`spire-window-row-${i}`} rotation={[0, (i * Math.PI) / 3, 0]}>
                    {[-1.5, -0.5, 0.5, 1.5].map(y => (
                        <mesh key={`window-${y}`} position={[1.0, y, 0]} scale={[0.08, 0.25, 0.2]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial {...LIGHT_AMBER} />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* Command module windows */}
            {[0, 1, 2, 3, 4, 5].map(i => (
                <mesh key={`cmd-window-${i}`} position={[Math.cos((i * Math.PI) / 3) * 0.75, 3, Math.sin((i * Math.PI) / 3) * 0.75]} scale={[0.06, 0.15, 0.15]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial {...LIGHT_BLUE} />
                </mesh>
            ))}
        </group>
    );
}

/** Structural Spokes - geometry only (rotation handled by parent) */
function SpokesGeometry() {
    const spokeCount = 4;
    return (
        <group>
            {Array.from({ length: spokeCount }).map((_, i) => {
                const angle = (i * Math.PI * 2) / spokeCount;
                const x = Math.cos(angle);
                const z = Math.sin(angle);
                return (
                    <group key={`spoke-${i}`}>
                        {/* Main spoke beam */}
                        <mesh position={[x * 4, 0, z * 4]} rotation={[0, -angle + Math.PI / 2, 0]}>
                            <boxGeometry args={[0.5, 0.5, 7]} />
                            <meshStandardMaterial {...HULL_DARK} />
                        </mesh>

                        {/* Upper support beam */}
                        <mesh position={[x * 4, 0.4, z * 4]} rotation={[0, -angle + Math.PI / 2, 0]}>
                            <boxGeometry args={[0.2, 0.15, 7.5]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>

                        {/* Lower support beam */}
                        <mesh position={[x * 4, -0.4, z * 4]} rotation={[0, -angle + Math.PI / 2, 0]}>
                            <boxGeometry args={[0.2, 0.15, 7.5]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>

                        {/* Spoke windows */}
                        {[-2, -1, 0, 1, 2].map(offset => (
                            <mesh key={`spoke-win-${offset}`} position={[x * (4 + offset * 0.6), 0.35, z * (4 + offset * 0.6)]} scale={[0.12, 0.15, 0.12]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial {...LIGHT_AMBER} />
                            </mesh>
                        ))}

                        {/* Spoke junction module */}
                        <mesh position={[x * 7.2, 0, z * 7.2]}>
                            <boxGeometry args={[0.8, 0.8, 0.8]} />
                            <meshStandardMaterial {...HULL_LIGHT} />
                        </mesh>

                        {/* Junction lights */}
                        <mesh position={[x * 7.5, 0.3, z * 7.5]}>
                            <sphereGeometry args={[0.1, 6, 4]} />
                            <meshStandardMaterial {...LIGHT_BLUE} />
                        </mesh>
                        <mesh position={[x * 7.5, -0.3, z * 7.5]}>
                            <sphereGeometry args={[0.1, 6, 4]} />
                            <meshStandardMaterial {...LIGHT_BLUE} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

/** Rotating Ring AND Spokes - rotate together */
function RotatingRingAndSpokes() {
    const ringRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (ringRef.current) {
            ringRef.current.rotation.y += delta * 0.1;
        }
    });

    return (
        <group ref={ringRef}>
            {/* Include Spokes inside rotating group */}
            <SpokesGeometry />
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[8, 1.0, 16, 72]} />
                <meshStandardMaterial {...HULL_DARK} />
            </mesh>

            {/* Inner structural ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[7.2, 0.3, 8, 72]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Outer structural ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[8.8, 0.2, 8, 72]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>

            {/* Ring segment modules - 16 hab sections */}
            {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 16;
                const x = Math.cos(angle) * 8;
                const z = Math.sin(angle) * 8;
                return (
                    <group key={`hab-section-${i}`} position={[x, 0, z]} rotation={[0, -angle, 0]}>
                        {/* Hab module bulge */}
                        <mesh>
                            <boxGeometry args={[1.5, 1.2, 0.6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>

                        {/* Module windows - 3 per section */}
                        {[-0.4, 0, 0.4].map((offset, j) => (
                            <mesh key={`win-${j}`} position={[offset, 0, 0.35]} scale={[0.2, 0.25, 0.05]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial {...LIGHT_AMBER} />
                            </mesh>
                        ))}

                        {/* Top airlock/port */}
                        <mesh position={[0, 0.7, 0]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.2, 8]} />
                            <meshStandardMaterial {...HULL_LIGHT} />
                        </mesh>

                        {/* Module nav lights */}
                        <mesh position={[0.6, 0.5, 0.2]}>
                            <sphereGeometry args={[0.05, 6, 4]} />
                            <meshStandardMaterial {...(i % 2 === 0 ? LIGHT_RED : LIGHT_GREEN)} />
                        </mesh>
                    </group>
                );
            })}

            {/* Ring ribbing/framework - 36 ribs */}
            {Array.from({ length: 36 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 36;
                const x = Math.cos(angle) * 8;
                const z = Math.sin(angle) * 8;
                return (
                    <mesh key={`rib-${i}`} position={[x, 0, z]} rotation={[0, -angle, Math.PI / 2]}>
                        <boxGeometry args={[2.2, 0.08, 0.08]} />
                        <meshStandardMaterial {...HULL_LIGHT} />
                    </mesh>
                );
            })}

            {/* Ring windows between hab sections - 72 small windows */}
            {Array.from({ length: 72 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 72;
                const x = Math.cos(angle) * 8;
                const z = Math.sin(angle) * 8;
                return (
                    <mesh
                        key={`ring-win-${i}`}
                        position={[x, 0, z]}
                        rotation={[0, -angle + Math.PI / 2, 0]}
                        scale={[0.1, 0.15, 0.04]}
                    >
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial {...(i % 3 === 0 ? LIGHT_BLUE : LIGHT_AMBER)} />
                    </mesh>
                );
            })}

            {/* Navigation beacon towers - 8 around ring */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI) / 4;
                const x = Math.cos(angle) * 8.6;
                const z = Math.sin(angle) * 8.6;
                return (
                    <group key={`beacon-${i}`} position={[x, 0, z]}>
                        {/* Beacon mast */}
                        <mesh>
                            <cylinderGeometry args={[0.04, 0.04, 1.5, 6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        {/* Beacon light */}
                        <mesh position={[0, 0.8, 0]}>
                            <sphereGeometry args={[0.08, 6, 4]} />
                            <meshStandardMaterial {...LIGHT_WHITE} />
                        </mesh>
                    </group>
                );
            })}

            {/* Solar panel arrays - 8 sections */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI) / 4 + Math.PI / 8;
                const x = Math.cos(angle) * 8;
                const z = Math.sin(angle) * 8;
                return (
                    <group key={`solar-${i}`} position={[x, 0, z]} rotation={[0, -angle, 0]}>
                        {/* Solar panel arm */}
                        <mesh position={[0, 1.6, 0]}>
                            <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        {/* Solar panel */}
                        <mesh position={[0, 2.0, 0]} rotation={[0.3, 0, 0]}>
                            <boxGeometry args={[1.4, 0.03, 0.7]} />
                            <meshStandardMaterial color="#1a1a5a" metalness={0.95} roughness={0.05} />
                        </mesh>
                        {/* Lower panel */}
                        <mesh position={[0, -1.6, 0]}>
                            <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        <mesh position={[0, -2.0, 0]} rotation={[-0.3, 0, 0]}>
                            <boxGeometry args={[1.4, 0.03, 0.7]} />
                            <meshStandardMaterial color="#1a1a5a" metalness={0.95} roughness={0.05} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

/** Complete Orbital Station */
export function OrbitalStation() {
    const stationRef = useRef<THREE.Group>(null);

    // Gentle station sway
    useFrame((state) => {
        if (stationRef.current) {
            stationRef.current.rotation.x = 0.5 + Math.sin(state.clock.elapsedTime * 0.15) * 0.03;
            stationRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.12) * 0.02;
        }
    });

    return (
        <group ref={stationRef} scale={0.6} rotation={[0.5, Math.PI / 5, 0.1]}>
            <CentralSpire />
            {/* Spokes and Ring rotate together */}
            <RotatingRingAndSpokes />
        </group>
    );
}
