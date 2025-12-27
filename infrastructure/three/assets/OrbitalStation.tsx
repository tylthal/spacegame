/**
 * OrbitalStation.tsx
 * 
 * Detailed 3D space station model for the title screen.
 * Designed to look like it could house 1000+ people.
 * Features:
 * - Massive central spire with command center, labs, and cargo
 * - 6 structural spokes with crew quarters
 * - Rotating habitat ring with residential modules
 * - Secondary inner ring for utilities
 * - Extensive antenna/comm arrays
 * - Solar panel farms
 * - Docking bays and cargo pods
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Material presets
const HULL_DARK = { color: '#4a4a5a', metalness: 0.7, roughness: 0.3 };
const HULL_MEDIUM = { color: '#6a6a7a', metalness: 0.6, roughness: 0.4 };
const HULL_LIGHT = { color: '#8a8a9a', metalness: 0.5, roughness: 0.5 };
const HULL_ACCENT = { color: '#5a5a7a', metalness: 0.8, roughness: 0.2 };

const LIGHT_BLUE = { color: '#00ccff', emissive: '#00ccff', emissiveIntensity: 3.0 };
const LIGHT_AMBER = { color: '#ffcc00', emissive: '#ffaa00', emissiveIntensity: 2.5 };
const LIGHT_WHITE = { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 4.0 };
const LIGHT_RED = { color: '#ff0044', emissive: '#ff0044', emissiveIntensity: 3.0 };
const LIGHT_GREEN = { color: '#00ff66', emissive: '#00ff66', emissiveIntensity: 2.5 };
const SOLAR_PANEL = { color: '#1a1a5a', metalness: 0.95, roughness: 0.05 };

/** Massive Central Spire - command center and core facilities */
function CentralSpire() {
    return (
        <group>
            {/* Main spire body - multi-segment */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[1.2, 1.6, 8, 16]} />
                <meshStandardMaterial {...HULL_DARK} />
            </mesh>

            {/* Spire segment rings */}
            {[-2.5, -1, 0.5, 2].map((y, i) => (
                <mesh key={`ring-${i}`} position={[0, y, 0]}>
                    <cylinderGeometry args={[1.4, 1.4, 0.25, 16]} />
                    <meshStandardMaterial {...HULL_LIGHT} />
                </mesh>
            ))}

            {/* Upper command module - larger */}
            <mesh position={[0, 4.5, 0]}>
                <cylinderGeometry args={[1.0, 1.2, 2, 16]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Command dome */}
            <mesh position={[0, 5.8, 0]}>
                <sphereGeometry args={[0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>

            {/* Command dome windows */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 8;
                return (
                    <mesh key={`dome-win-${i}`} position={[Math.cos(angle) * 0.65, 5.6, Math.sin(angle) * 0.65]} scale={[0.12, 0.2, 0.08]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial {...LIGHT_BLUE} />
                    </mesh>
                );
            })}

            {/* Main antenna mast */}
            <mesh position={[0, 7, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 2.5, 8]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Antenna dishes - 4 facing outward */}
            {[0, 1, 2, 3].map(i => {
                const angle = (i * Math.PI) / 2 + Math.PI / 4;
                return (
                    <group key={`dish-${i}`} position={[Math.cos(angle) * 0.4, 6.8, Math.sin(angle) * 0.4]} rotation={[0.4, angle, 0]}>
                        <mesh>
                            <coneGeometry args={[0.25, 0.12, 12]} />
                            <meshStandardMaterial {...HULL_LIGHT} />
                        </mesh>
                        <mesh position={[0, 0.08, 0]}>
                            <sphereGeometry args={[0.05, 6, 4]} />
                            <meshStandardMaterial {...LIGHT_WHITE} />
                        </mesh>
                    </group>
                );
            })}

            {/* Antenna beacon */}
            <mesh position={[0, 8.3, 0]}>
                <sphereGeometry args={[0.15, 8, 6]} />
                <meshStandardMaterial {...LIGHT_RED} />
            </mesh>

            {/* Lower cargo/docking section */}
            <mesh position={[0, -4.5, 0]}>
                <cylinderGeometry args={[1.5, 1.2, 2, 16]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Cargo bay extensions - 4 pods */}
            {[0, 1, 2, 3].map(i => {
                const angle = (i * Math.PI) / 2;
                return (
                    <group key={`cargo-${i}`} position={[Math.cos(angle) * 1.8, -4.5, Math.sin(angle) * 1.8]} rotation={[0, -angle, 0]}>
                        <mesh>
                            <boxGeometry args={[0.8, 1.5, 0.6]} />
                            <meshStandardMaterial {...HULL_DARK} />
                        </mesh>
                        <mesh position={[0, 0, 0.35]} scale={[0.5, 0.8, 0.1]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial {...LIGHT_AMBER} />
                        </mesh>
                    </group>
                );
            })}

            {/* Docking ports - 6 around lower section */}
            {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 6;
                return (
                    <group key={`dock-${i}`}>
                        <mesh position={[Math.cos(angle) * 1.5, -3.5, Math.sin(angle) * 1.5]} rotation={[0, -angle, Math.PI / 2]}>
                            <cylinderGeometry args={[0.25, 0.3, 0.5, 8]} />
                            <meshStandardMaterial {...HULL_LIGHT} />
                        </mesh>
                        <mesh position={[Math.cos(angle) * 1.8, -3.5, Math.sin(angle) * 1.8]}>
                            <sphereGeometry args={[0.08, 6, 4]} />
                            <meshStandardMaterial {...(i % 2 === 0 ? LIGHT_GREEN : LIGHT_RED)} />
                        </mesh>
                    </group>
                );
            })}

            {/* Lower antenna array */}
            <mesh position={[0, -6, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 2, 6]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Spire windows - 8 columns, 6 rows */}
            {Array.from({ length: 8 }).map((_, col) => {
                const angle = (col * Math.PI * 2) / 8;
                return (
                    <group key={`win-col-${col}`} rotation={[0, angle, 0]}>
                        {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((y, row) => (
                            <mesh key={`win-${row}`} position={[1.25, y, 0]} scale={[0.06, 0.2, 0.15]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial {...LIGHT_AMBER} />
                            </mesh>
                        ))}
                    </group>
                );
            })}

            {/* Command module windows */}
            {Array.from({ length: 8 }).map((_, i) => (
                <mesh key={`cmd-win-${i}`} position={[Math.cos((i * Math.PI * 2) / 8) * 1.05, 4.5, Math.sin((i * Math.PI * 2) / 8) * 1.05]} scale={[0.08, 0.3, 0.15]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial {...LIGHT_BLUE} />
                </mesh>
            ))}
        </group>
    );
}

/** 6 Structural Spokes with crew quarters */
function SpokesGeometry() {
    const spokeCount = 6;
    return (
        <group>
            {Array.from({ length: spokeCount }).map((_, i) => {
                const angle = (i * Math.PI * 2) / spokeCount;
                const x = Math.cos(angle);
                const z = Math.sin(angle);
                return (
                    <group key={`spoke-${i}`}>
                        {/* Main spoke beam - thicker */}
                        <mesh position={[x * 4.5, 0, z * 4.5]} rotation={[0, -angle + Math.PI / 2, 0]}>
                            <boxGeometry args={[0.6, 0.6, 8]} />
                            <meshStandardMaterial {...HULL_DARK} />
                        </mesh>

                        {/* Upper support beam */}
                        <mesh position={[x * 4.5, 0.5, z * 4.5]} rotation={[0, -angle + Math.PI / 2, 0]}>
                            <boxGeometry args={[0.25, 0.15, 8.5]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>

                        {/* Lower support beam */}
                        <mesh position={[x * 4.5, -0.5, z * 4.5]} rotation={[0, -angle + Math.PI / 2, 0]}>
                            <boxGeometry args={[0.25, 0.15, 8.5]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>

                        {/* Crew quarters modules - 3 per spoke */}
                        {[-1.5, 0, 1.5].map((offset, j) => (
                            <group key={`crew-${j}`} position={[x * (4.5 + offset), 0, z * (4.5 + offset)]}>
                                <mesh>
                                    <boxGeometry args={[0.8, 0.9, 0.5]} />
                                    <meshStandardMaterial {...HULL_MEDIUM} />
                                </mesh>
                                {/* Module windows */}
                                <mesh position={[0, 0.1, 0.28]} scale={[0.5, 0.4, 0.1]}>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial {...LIGHT_AMBER} />
                                </mesh>
                            </group>
                        ))}

                        {/* Running lights along spoke */}
                        {[-2.5, 0, 2.5].map((offset, j) => (
                            <mesh key={`light-${j}`} position={[x * (4.5 + offset), 0.4, z * (4.5 + offset)]}>
                                <sphereGeometry args={[0.06, 6, 4]} />
                                <meshStandardMaterial {...LIGHT_BLUE} />
                            </mesh>
                        ))}

                        {/* Spoke junction module */}
                        <mesh position={[x * 8.2, 0, z * 8.2]}>
                            <boxGeometry args={[1.0, 1.0, 1.0]} />
                            <meshStandardMaterial {...HULL_LIGHT} />
                        </mesh>

                        {/* Junction windows */}
                        <mesh position={[x * 8.5, 0, z * 8.5]} scale={[0.3, 0.5, 0.1]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial {...LIGHT_AMBER} />
                        </mesh>

                        {/* Junction nav lights */}
                        <mesh position={[x * 8.4, 0.6, z * 8.4]}>
                            <sphereGeometry args={[0.08, 6, 4]} />
                            <meshStandardMaterial {...(i % 2 === 0 ? LIGHT_RED : LIGHT_GREEN)} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

/** Rotating Ring with 24 residential hab modules + inner utility ring */
function RotatingRingAndSpokes() {
    const ringRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (ringRef.current) {
            ringRef.current.rotation.y += delta * 0.08;
        }
    });

    return (
        <group ref={ringRef}>
            <SpokesGeometry />

            {/* Main habitat ring - thicker */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[9, 1.2, 20, 96]} />
                <meshStandardMaterial {...HULL_DARK} />
            </mesh>

            {/* Inner structural ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[8, 0.4, 12, 96]} />
                <meshStandardMaterial {...HULL_MEDIUM} />
            </mesh>

            {/* Outer structural ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[10, 0.25, 10, 96]} />
                <meshStandardMaterial {...HULL_LIGHT} />
            </mesh>

            {/* Inner utility ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[5, 0.5, 12, 64]} />
                <meshStandardMaterial {...HULL_ACCENT} />
            </mesh>

            {/* 24 Residential hab modules */}
            {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 24;
                const x = Math.cos(angle) * 9;
                const z = Math.sin(angle) * 9;
                return (
                    <group key={`hab-${i}`} position={[x, 0, z]} rotation={[0, -angle, 0]}>
                        {/* Hab module body */}
                        <mesh>
                            <boxGeometry args={[2.0, 1.6, 0.8]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>

                        {/* Module windows - 4 per hab */}
                        {[-0.6, -0.2, 0.2, 0.6].map((offset, j) => (
                            <mesh key={`hab-win-${j}`} position={[offset, 0.2, 0.45]} scale={[0.18, 0.35, 0.05]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial {...LIGHT_AMBER} />
                            </mesh>
                        ))}

                        {/* Lower windows */}
                        {[-0.4, 0.4].map((offset, j) => (
                            <mesh key={`hab-win-low-${j}`} position={[offset, -0.4, 0.45]} scale={[0.25, 0.2, 0.05]}>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial {...LIGHT_BLUE} />
                            </mesh>
                        ))}

                        {/* Airlock */}
                        <mesh position={[0, 0.9, 0]}>
                            <cylinderGeometry args={[0.18, 0.18, 0.25, 8]} />
                            <meshStandardMaterial {...HULL_LIGHT} />
                        </mesh>

                        {/* Nav lights */}
                        <mesh position={[0.85, 0.7, 0.3]}>
                            <sphereGeometry args={[0.05, 6, 4]} />
                            <meshStandardMaterial {...(i % 2 === 0 ? LIGHT_RED : LIGHT_GREEN)} />
                        </mesh>
                    </group>
                );
            })}

            {/* Ring structural ribs - 48 */}
            {Array.from({ length: 48 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 48;
                const x = Math.cos(angle) * 9;
                const z = Math.sin(angle) * 9;
                return (
                    <mesh key={`rib-${i}`} position={[x, 0, z]} rotation={[0, -angle, Math.PI / 2]}>
                        <boxGeometry args={[2.8, 0.1, 0.1]} />
                        <meshStandardMaterial {...HULL_LIGHT} />
                    </mesh>
                );
            })}

            {/* Inter-row windows - 96 small */}
            {Array.from({ length: 96 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 96;
                const x = Math.cos(angle) * 9;
                const z = Math.sin(angle) * 9;
                return (
                    <mesh key={`small-win-${i}`} position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]} scale={[0.08, 0.12, 0.04]}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshStandardMaterial {...(i % 4 === 0 ? LIGHT_BLUE : LIGHT_AMBER)} />
                    </mesh>
                );
            })}

            {/* Navigation beacon towers - 12 around ring */}
            {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 12;
                const x = Math.cos(angle) * 10;
                const z = Math.sin(angle) * 10;
                return (
                    <group key={`beacon-${i}`} position={[x, 0, z]}>
                        <mesh>
                            <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        <mesh position={[0, 1.1, 0]}>
                            <sphereGeometry args={[0.1, 8, 6]} />
                            <meshStandardMaterial {...LIGHT_WHITE} />
                        </mesh>
                    </group>
                );
            })}

            {/* Large solar panel arrays - 12 sections */}
            {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * Math.PI) / 6 + Math.PI / 12;
                const x = Math.cos(angle) * 9;
                const z = Math.sin(angle) * 9;
                return (
                    <group key={`solar-${i}`} position={[x, 0, z]} rotation={[0, -angle, 0]}>
                        {/* Upper panel arm */}
                        <mesh position={[0, 2.0, 0]}>
                            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        {/* Upper panel */}
                        <mesh position={[0, 2.6, 0]} rotation={[0.35, 0, 0]}>
                            <boxGeometry args={[1.8, 0.04, 0.9]} />
                            <meshStandardMaterial {...SOLAR_PANEL} />
                        </mesh>
                        {/* Lower panel arm */}
                        <mesh position={[0, -2.0, 0]}>
                            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        {/* Lower panel */}
                        <mesh position={[0, -2.6, 0]} rotation={[-0.35, 0, 0]}>
                            <boxGeometry args={[1.8, 0.04, 0.9]} />
                            <meshStandardMaterial {...SOLAR_PANEL} />
                        </mesh>
                    </group>
                );
            })}

            {/* Inner ring connectors - 8 */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 8;
                return (
                    <mesh key={`connector-${i}`} position={[Math.cos(angle) * 6.5, 0, Math.sin(angle) * 6.5]} rotation={[0, -angle + Math.PI / 2, 0]}>
                        <boxGeometry args={[0.2, 0.2, 3]} />
                        <meshStandardMaterial {...HULL_DARK} />
                    </mesh>
                );
            })}

            {/* Inner ring utility modules - 8 */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI * 2) / 8 + Math.PI / 8;
                const x = Math.cos(angle) * 5;
                const z = Math.sin(angle) * 5;
                return (
                    <group key={`util-${i}`} position={[x, 0, z]}>
                        <mesh>
                            <boxGeometry args={[0.8, 0.6, 0.8]} />
                            <meshStandardMaterial {...HULL_MEDIUM} />
                        </mesh>
                        <mesh position={[0, 0, 0.42]} scale={[0.4, 0.35, 0.05]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial {...LIGHT_BLUE} />
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

    useFrame((state) => {
        if (stationRef.current) {
            stationRef.current.rotation.x = 0.5 + Math.sin(state.clock.elapsedTime * 0.12) * 0.02;
            stationRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.1) * 0.015;
        }
    });

    return (
        <group ref={stationRef} scale={0.55} rotation={[0.5, Math.PI / 5, 0.1]}>
            <CentralSpire />
            <RotatingRingAndSpokes />
        </group>
    );
}
