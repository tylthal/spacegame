
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial } from 'three';

// Warp Speed Starfield - Only renders around edges, not in central play area
export function Starfield({ count = 400 }) {
    const points = useRef<Points>(null);

    const particlesPosition = useMemo(() => {
        const positions: number[] = [];

        // Generate stars but exclude the central play area
        // Play area is roughly -30 to +30 on X/Y in near Z range (-100 to 0)
        const PLAY_ZONE_X = 35; // Half-width of play zone to exclude
        const PLAY_ZONE_Y = 25; // Half-height of play zone to exclude
        const PLAY_ZONE_Z_MIN = -120; // Near Z boundary
        const PLAY_ZONE_Z_MAX = 10;  // Far Z boundary (close to camera)

        let attempts = 0;
        while (positions.length < count * 3 && attempts < count * 5) {
            attempts++;

            // Random position in larger space
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 300 - 50; // -200 to 100

            // Skip if in the central play zone
            const inPlayZoneX = Math.abs(x) < PLAY_ZONE_X;
            const inPlayZoneY = Math.abs(y) < PLAY_ZONE_Y;
            const inPlayZoneZ = z > PLAY_ZONE_Z_MIN && z < PLAY_ZONE_Z_MAX;

            if (inPlayZoneX && inPlayZoneY && inPlayZoneZ) {
                continue; // Skip stars in play area
            }

            positions.push(x, y, z);
        }

        return new Float32Array(positions);
    }, [count]);

    useFrame((state, delta) => {
        if (!points.current) return;

        // Stationary Mode: No manual rotation. The Camera does all the moving now.
        // points.current.rotation.z += delta * 0.01; 
        // points.current.position.z += delta * 10;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particlesPosition.length / 3}
                    array={particlesPosition}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                color="#ffffff"
                sizeAttenuation
                transparent
                opacity={0.6}
            />
        </points>
    );
}
