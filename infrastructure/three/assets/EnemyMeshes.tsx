import React from 'react';

/**
 * ENEMY MESH COMPONENTS
 * 
 * Multi-part enemy designs with metallic materials and detailed geometry.
 * Each enemy type has a unique silhouette for easy identification.
 */

// Shared metallic material presets
const METAL_CHROME = {
    color: '#B8B8B8',
    metalness: 1.0,
    roughness: 0.1,
};

const METAL_GUNMETAL = {
    color: '#2A2A35',
    metalness: 0.95,
    roughness: 0.2,
};

const METAL_COPPER = {
    color: '#B87333',
    metalness: 0.9,
    roughness: 0.3,
};

const METAL_GOLD = {
    color: '#FFD700',
    metalness: 1.0,
    roughness: 0.15,
};

/**
 * DRONE - Fast, small attack craft
 * Design: Compact fighter with swept-back wings and glowing engine
 */
export function DroneMesh() {
    return (
        <group>
            {/* Main fuselage - compact body */}
            <mesh scale={[0.5, 0.35, 1.6]}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Red nose cone */}
            <mesh position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]} scale={[0.12, 0.25, 0.12]}>
                <coneGeometry args={[1, 1, 6]} />
                <meshStandardMaterial
                    color="#FF3366"
                    emissive="#FF0044"
                    emissiveIntensity={1.0}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Left swept wing */}
            <mesh position={[-0.5, 0, -0.2]} rotation={[0, -0.3, 0]} scale={[0.6, 0.04, 0.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Right swept wing */}
            <mesh position={[0.5, 0, -0.2]} rotation={[0, 0.3, 0]} scale={[0.6, 0.04, 0.5]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Left wingtip glow */}
            <mesh position={[-0.75, 0, -0.35]} scale={[0.1, 0.06, 0.15]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color="#FF0044"
                    emissive="#FF0044"
                    emissiveIntensity={2.0}
                />
            </mesh>

            {/* Right wingtip glow */}
            <mesh position={[0.75, 0, -0.35]} scale={[0.1, 0.06, 0.15]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                    color="#FF0044"
                    emissive="#FF0044"
                    emissiveIntensity={2.0}
                />
            </mesh>

            {/* Engine housing */}
            <mesh position={[0, 0, -0.7]} rotation={[Math.PI / 2, 0, 0]} scale={[0.18, 0.25, 0.18]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Engine glow */}
            <mesh position={[0, 0, -0.85]} scale={[0.15, 0.15, 0.1]}>
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
 */
export function ScoutMesh() {
    return (
        <group>
            {/* Main hull - angular body */}
            <mesh scale={[0.6, 0.3, 2.2]}>
                <octahedronGeometry args={[0.5]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Copper sensor dish */}
            <mesh position={[0, 0.25, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.3, 0.05, 0.3]}>
                <cylinderGeometry args={[1, 0.6, 1, 8]} />
                <meshStandardMaterial {...METAL_COPPER} />
            </mesh>

            {/* Left engine nacelle */}
            <mesh position={[-0.4, 0, -0.5]} scale={[0.15, 0.15, 0.8]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Right engine nacelle */}
            <mesh position={[0.4, 0, -0.5]} scale={[0.15, 0.15, 0.8]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Left engine glow */}
            <mesh position={[-0.4, 0, -0.95]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#FFAA00"
                    emissive="#FF6600"
                    emissiveIntensity={3.0}
                />
            </mesh>

            {/* Right engine glow */}
            <mesh position={[0.4, 0, -0.95]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#FFAA00"
                    emissive="#FF6600"
                    emissiveIntensity={3.0}
                />
            </mesh>

            {/* Cockpit window */}
            <mesh position={[0, 0.1, 0.8]} scale={[0.2, 0.1, 0.3]}>
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

            {/* Chrome nose spike */}
            <mesh position={[0, 0, 1.4]} scale={[0.15, 0.15, 0.5]}>
                <coneGeometry args={[1, 2, 6]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Center engine */}
            <mesh position={[0, 0, -1.2]} scale={[0.25, 0.25, 0.4]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Left engine */}
            <mesh position={[-0.35, -0.15, -1.0]} scale={[0.18, 0.18, 0.35]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Right engine */}
            <mesh position={[0.35, -0.15, -1.0]} scale={[0.18, 0.18, 0.35]}>
                <cylinderGeometry args={[1, 0.8, 1, 8]} />
                <meshStandardMaterial {...METAL_GUNMETAL} />
            </mesh>

            {/* Center engine glow */}
            <mesh position={[0, 0, -1.45]} scale={[0.2, 0.2, 0.1]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#9900FF"
                    emissive="#6600FF"
                    emissiveIntensity={3.0}
                />
            </mesh>

            {/* Left engine glow */}
            <mesh position={[-0.35, -0.15, -1.2]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#9900FF"
                    emissive="#6600FF"
                    emissiveIntensity={2.5}
                />
            </mesh>

            {/* Right engine glow */}
            <mesh position={[0.35, -0.15, -1.2]} scale={[0.12, 0.12, 0.05]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial
                    color="#9900FF"
                    emissive="#6600FF"
                    emissiveIntensity={2.5}
                />
            </mesh>

            {/* Weapon pod - left */}
            <mesh position={[-0.5, -0.2, 0.5]} scale={[0.12, 0.12, 0.4]}>
                <cylinderGeometry args={[1, 1, 1, 6]} />
                <meshStandardMaterial {...METAL_CHROME} />
            </mesh>

            {/* Weapon pod - right */}
            <mesh position={[0.5, -0.2, 0.5]} scale={[0.12, 0.12, 0.4]}>
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
