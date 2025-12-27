/**
 * SimpleStation.tsx
 * 
 * Simplified station model for mobile/low-power devices.
 * Uses minimal geometry while still conveying "space station" visually.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SimpleStation() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
            groupRef.current.rotation.x = 0.3 + Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
        }
    });

    return (
        <group ref={groupRef} scale={1.5}>
            {/* Central hub */}
            <mesh>
                <cylinderGeometry args={[0.8, 1, 3, 8]} />
                <meshStandardMaterial color="#5a5a6a" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[3, 0.3, 8, 24]} />
                <meshStandardMaterial color="#6a6a7a" metalness={0.6} roughness={0.4} />
            </mesh>

            {/* Spokes (4 simple boxes) */}
            {[0, 90, 180, 270].map((angle, i) => (
                <mesh
                    key={i}
                    position={[
                        Math.cos(angle * Math.PI / 180) * 1.5,
                        0,
                        Math.sin(angle * Math.PI / 180) * 1.5
                    ]}
                    rotation={[0, -angle * Math.PI / 180, 0]}
                >
                    <boxGeometry args={[3, 0.2, 0.2]} />
                    <meshStandardMaterial color="#4a4a5a" metalness={0.7} roughness={0.3} />
                </mesh>
            ))}

            {/* Antenna */}
            <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 2, 4]} />
                <meshStandardMaterial color="#8a8a9a" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Lights */}
            <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={3} />
            </mesh>
        </group>
    );
}
