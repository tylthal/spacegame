
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial } from 'three';

// Warp Speed Starfield
export function Starfield({ count = 2000 }) {
    const points = useRef<Points>(null);

    const particlesPosition = useMemo(() => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 100; // Wider field
            const y = (Math.random() - 0.5) * 100;
            const z = (Math.random() - 0.5) * 200 - 50; // Deep depth (-150 to 50)
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        return positions;
    }, [count]);

    useFrame((state, delta) => {
        if (!points.current) return;
        // Simple trick: Move the entire points object, resets not needed if we just loop texture?
        // Actually, for points, we need to update positions or move group and reset.
        // Let's just move the whole group and wrap is harder.
        // Better: Update positions in shader is best, but here we can just scroll the group?
        // No, infinite scroll needs wrap. 
        // Let's stick to static for now to avoid CPU overhead, but make it DEEP.
        // Or simple rotation
        points.current.rotation.z += delta * 0.05; // Barrel roll effect
        points.current.position.z += delta * 10; // Move forward
        if (points.current.position.z > 50) {
            points.current.position.z = -50;
        }
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
