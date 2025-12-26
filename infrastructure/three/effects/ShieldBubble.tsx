import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ShieldBubbleProps {
    radius: number;
    getShieldHP: () => number | undefined; // Getter for dynamic updates
    maxShieldHP: number;   // For opacity calculation
    getLastHitTime: () => number | undefined;  // Getter function for fresh lastHitTime each frame
}

/**
 * Translucent energy shield bubble that wraps around enemies.
 * - Flashes white and pulses when hit
 * - Opacity decreases as shield takes damage
 * - Gentle idle pulse animation
 * - Fully transparent when shield depleted
 */
export function ShieldBubble({ radius, getShieldHP, maxShieldHP, getLastHitTime }: ShieldBubbleProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        timeRef.current += delta;

        const currentShieldHP = getShieldHP() ?? 0;

        // Hide if shield is depleted
        if (currentShieldHP <= 0) {
            meshRef.current.visible = false;
            return;
        }
        meshRef.current.visible = true;

        const material = meshRef.current.material as THREE.MeshStandardMaterial;

        // Get fresh lastHitTime via getter function (avoids stale closure)
        const lastHitTime = getLastHitTime();
        const now = Date.now();
        const timeSinceHit = lastHitTime !== undefined ? now - lastHitTime : Infinity;
        const isFlashing = timeSinceHit < 150;

        if (isFlashing) {
            // Flash white and pulse outward when hit - MORE VISIBLE
            const flashIntensity = 1 - (timeSinceHit / 150); // 1.0 -> 0.0 over 150ms
            material.color.set('#FFFFFF');
            material.emissive.set('#FFFFFF');
            material.emissiveIntensity = 5 * flashIntensity + 2; // Brighter flash
            material.opacity = 0.9 * flashIntensity + 0.4; // Higher opacity during flash
            // Bigger scale pulse on hit
            meshRef.current.scale.setScalar(1 + 0.25 * flashIntensity);
        } else {
            // Normal green shield with gentle idle pulse
            const idlePulse = Math.sin(timeRef.current * 2) * 0.05 + 1; // Subtle 0.95-1.05 scale
            meshRef.current.scale.setScalar(idlePulse);

            material.color.set('#00FF66');
            material.emissive.set('#00AA44');
            material.emissiveIntensity = 0.5 + Math.sin(timeRef.current * 3) * 0.1; // Subtle pulsing glow
            // Very low base opacity, decreases as shield takes damage
            material.opacity = 0.15 * (currentShieldHP / maxShieldHP);
        }
    });


    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[radius, 24, 18]} />
            <meshStandardMaterial
                color="#00FF66"
                emissive="#00AA44"
                emissiveIntensity={0.5}
                transparent
                opacity={0.15}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
}

