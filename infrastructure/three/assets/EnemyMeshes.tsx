import React from 'react';

/**
 * ENEMY MESH COMPONENTS
 * 
 * Multi-part enemy designs with metallic materials and detailed geometry.
 * Each enemy type has a unique silhouette for easy identification.
 */

// Shared metallic material presets with emissive glow for space visibility
const METAL_CHROME = {
    color: '#C0C0C0',
    emissive: '#404050',
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.2,
};

const METAL_GUNMETAL = {
    color: '#4A4A5A',
    emissive: '#303040',
    emissiveIntensity: 0.6,
    metalness: 0.9,
    roughness: 0.3,
};

const METAL_COPPER = {
    color: '#CD7F32',
    emissive: '#8B4513',
    emissiveIntensity: 0.5,
    metalness: 0.85,
    roughness: 0.35,
};

const METAL_GOLD = {
    color: '#FFD700',
    emissive: '#CC9900',
    emissiveIntensity: 0.6,
    metalness: 0.95,
    roughness: 0.2,
};

/**
 * DRONE - Fast, small attack craft
 * Design: Compact fighter with swept-back wings and glowing engine
 * NOTE: Nose points to -Z (Three.js forward direction for lookAt)
 */
export function DroneMesh() {
    return (
        <group>
            {/* Main fuselage - compact body */}
            <mesh scale={[0.5, 0.35, 1.6]}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Red nose cone - at FRONT (-Z) */}
            <mesh position={[0, 0, -0.9]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.12, 0.25, 0.12]}>
                <coneGeometry args={[1, 1, 6]} />
                <meshStandardMaterial
                    color="#FF3366"
                    emissive="#FF0044"
                    emissiveIntensity={1.0}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Left swept wing - rear position at +Z */}
            <mesh position={[-0.5, 0, 0.2]} rotation={[0, 0.3, 0]} scale={[0.6, 0.04, 0.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Right swept wing - rear position at +Z */}
            <mesh position={[0.5, 0, 0.2]} rotation={[0, -0.3, 0]} scale={[0.6, 0.04, 0.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Left wingtip glow */}
            <mesh position={[-0.75, 0, 0.35]} scale={[0.1, 0.06, 0.15]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color="#FF0044"
                    emissive="#FF0044"
                    emissiveIntensity={2.0}
                />
            </mesh>

            {/* Right wingtip glow */}
            <mesh position={[0.75, 0, 0.35]} scale={[0.1, 0.06, 0.15]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color="#FF0044"
                    emissive="#FF0044"
                    emissiveIntensity={2.0}
                />
            </mesh>

            {/* Engine housing - at BACK (+Z) */}
            <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]} scale={[0.18, 0.25, 0.18]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Engine glow - at BACK (+Z) */}
            <mesh position={[0, 0, 0.85]} scale={[0.15, 0.15, 0.1]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#00FFFF"
                    emissive="#00FFFF"
                    emissiveIntensity={4.0}
                />
            </mesh>
        </group>
    );
}

/**
 * SCOUT - Medium interceptor with sensor array
 * Design: Angular body with sensor dish and twin engines
 * NOTE: Nose points to -Z (Three.js forward direction for lookAt)
 */
export function ScoutMesh() {
    return (
        <group>
            {/* Main hull - angular body */}
            <mesh scale={[0.6, 0.3, 2.2]}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Copper sensor dish - at FRONT (-Z) */}
            <mesh position={[0, 0.25, -0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.3, 0.05, 0.3]}>
                <cylinderGeometry args={[1, 0.6, 1, 8]} />
                <meshStandardMaterial {...METAL_COPPER} />
            </mesh>

            {/* Left engine nacelle - at BACK (+Z) */}
            <mesh position={[-0.4, 0, 0.5]} scale={[0.15, 0.15, 0.8]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Right engine nacelle - at BACK (+Z) */}
            <mesh position={[0.4, 0, 0.5]} scale={[0.15, 0.15, 0.8]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Left engine glow - at BACK (+Z) */}
            <mesh position={[-0.4, 0, 0.95]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#FFAA00"
                    emissive="#FF6600"
                    emissiveIntensity={3.0}
                />
            </mesh>

            {/* Right engine glow - at BACK (+Z) */}
            <mesh position={[0.4, 0, 0.95]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#FFAA00"
                    emissive="#FF6600"
                    emissiveIntensity={3.0}
                />
            </mesh>

            {/* Cockpit window - at FRONT (-Z) */}
            <mesh position={[0, 0.1, -0.8]} scale={[0.2, 0.1, 0.3]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#00FFFF"
                    emissive="#00AAAA"
                    emissiveIntensity={0.5}
                    metalness={0.2}
                    roughness={0.1}
                />
            </mesh>
        </group>
    );
}

/**
 * BOMBER - Heavy assault craft
 * Design: Bulky armored body with gold accents and triple engines
 * NOTE: Nose points to -Z (Three.js forward direction for lookAt)
 */
export function BomberMesh() {
    return (
        <group>
            {/* Main armored hull */}
            <mesh scale={[0.8, 0.6, 2.5]}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Gold armor plates - top */}
            <mesh position={[0, 0.35, 0]} scale={[0.5, 0.08, 1.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GOLD} />
            </mesh>

            {/* Gold armor plates - left */}
            <mesh position={[-0.35, 0, 0]} scale={[0.08, 0.4, 1.2]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GOLD} />
            </mesh>

            {/* Gold armor plates - right */}
            <mesh position={[0.35, 0, 0]} scale={[0.08, 0.4, 1.2]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GOLD} />
            </mesh>

            {/* Chrome nose spike - at FRONT (-Z) */}
            <mesh position={[0, 0, -1.4]} rotation={[Math.PI, 0, 0]} scale={[0.15, 0.15, 0.5]}>
                <coneGeometry args={[1, 2, 6]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Center engine - at BACK (+Z) */}
            <mesh position={[0, 0, 1.2]} scale={[0.25, 0.25, 0.4]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Left engine - at BACK (+Z) */}
            <mesh position={[-0.35, -0.15, 1.0]} scale={[0.18, 0.18, 0.35]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Right engine - at BACK (+Z) */}
            <mesh position={[0.35, -0.15, 1.0]} scale={[0.18, 0.18, 0.35]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Center engine glow - at BACK (+Z) */}
            <mesh position={[0, 0, 1.45]} scale={[0.2, 0.2, 0.1]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#9900FF"
                    emissive="#6600FF"
                    emissiveIntensity={3.0}
                />
            </mesh>

            {/* Left engine glow - at BACK (+Z) */}
            <mesh position={[-0.35, -0.15, 1.2]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#9900FF"
                    emissive="#6600FF"
                    emissiveIntensity={2.5}
                />
            </mesh>

            {/* Right engine glow - at BACK (+Z) */}
            <mesh position={[0.35, -0.15, 1.2]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#9900FF"
                    emissive="#6600FF"
                    emissiveIntensity={2.5}
                />
            </mesh>

            {/* Weapon pod - left - at FRONT (-Z) */}
            <mesh position={[-0.5, -0.2, -0.5]} scale={[0.12, 0.12, 0.4]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Weapon pod - right - at FRONT (-Z) */}
            <mesh position={[0.5, -0.2, -0.5]} scale={[0.12, 0.12, 0.4]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>
        </group>
    );
}

/**
 * Get the appropriate mesh component for an enemy type
 */
export function EnemyMesh({ kind }: { kind: string }) {
    switch (kind) {
        case 'drone':
            return <DroneMesh />;
        case 'scout':
            return <ScoutMesh />;
        case 'bomber':
            return <BomberMesh />;
        default:
            return <DroneMesh />;
    }
}
