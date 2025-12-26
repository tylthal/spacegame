import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, SpriteMaterial, Sprite, CanvasTexture } from 'three';

export interface FloatingScoreData {
    id: number;
    x: number;
    y: number;
    z: number;
    points: number;
    color?: string; // Optional override, defaults based on points
}

interface FloatingScoreProps {
    score: FloatingScoreData;
    onComplete: (id: number) => void;
}

// Duration and animation constants
const DURATION = 1.5; // seconds
const RISE_SPEED = 3; // units per second
const DRIFT_AMPLITUDE = 0.5; // horizontal drift range
const GLITCH_DURATION = 0.2; // initial glitch phase

/**
 * Creates a canvas texture with neon-style text
 */
function createScoreTexture(points: number, color: string): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Setup text style
    ctx.font = 'bold 64px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outer glow (multiple passes for bloom effect)
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(`+${points}`, canvas.width / 2, canvas.height / 2);

    // Second pass for stronger glow
    ctx.shadowBlur = 10;
    ctx.fillText(`+${points}`, canvas.width / 2, canvas.height / 2);

    // Bright center
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`+${points}`, canvas.width / 2, canvas.height / 2);

    const texture = new CanvasTexture(canvas);
    return texture;
}

/**
 * Floating score indicator - Cyberpunk HUD style
 * Glitch flickers on spawn, floats up with drift, fades with shimmer
 */
export function FloatingScore({ score, onComplete }: FloatingScoreProps) {
    const groupRef = useRef<Group>(null);
    const materialRef = useRef<SpriteMaterial>(null);
    const startTime = useRef(Date.now());
    const completed = useRef(false);

    // Determine color based on points
    const color = score.color || (score.points >= 500 ? '#FFD700' : '#00FFFF');

    // Create texture once
    const texture = useMemo(() => createScoreTexture(score.points, color), [score.points, color]);

    useFrame(() => {
        if (completed.current || !groupRef.current || !materialRef.current) return;

        const elapsed = (Date.now() - startTime.current) / 1000;
        const progress = elapsed / DURATION;

        if (progress >= 1) {
            completed.current = true;
            onComplete(score.id);
            return;
        }

        // Position: Rise up with horizontal drift
        const driftX = Math.sin(elapsed * 5) * DRIFT_AMPLITUDE * (1 - progress);
        groupRef.current.position.y = score.y + elapsed * RISE_SPEED;
        groupRef.current.position.x = score.x + driftX;

        // Glitch phase: Random position jitter at the start
        if (elapsed < GLITCH_DURATION) {
            const glitchIntensity = 1 - (elapsed / GLITCH_DURATION);
            groupRef.current.position.x += (Math.random() - 0.5) * glitchIntensity * 0.5;
            groupRef.current.position.y += (Math.random() - 0.5) * glitchIntensity * 0.3;
        }

        // Opacity: Fade out in the last 40%
        const fadeStart = 0.6;
        if (progress > fadeStart) {
            const fadeProgress = (progress - fadeStart) / (1 - fadeStart);
            materialRef.current.opacity = 1 - fadeProgress;
        } else {
            // Glitch flicker during initial phase
            if (elapsed < GLITCH_DURATION) {
                materialRef.current.opacity = Math.random() > 0.3 ? 1 : 0.3;
            } else {
                materialRef.current.opacity = 1;
            }
        }

        // Scale: Start slightly larger, shrink to normal
        const scaleBase = 1.5 - progress * 0.3;
        // Add subtle pulse
        const pulse = 1 + Math.sin(elapsed * 15) * 0.05;
        groupRef.current.scale.setScalar(scaleBase * pulse);

        // Color shift shimmer during fade (slight hue variation)
        if (progress > 0.5) {
            const shimmerPhase = elapsed * 20;
            const r = Math.sin(shimmerPhase) * 0.1;
            const g = Math.sin(shimmerPhase + 2) * 0.1;
            const b = Math.sin(shimmerPhase + 4) * 0.1;
            materialRef.current.color.setRGB(1 + r, 1 + g, 1 + b);
        }
    });

    return (
        <group ref={groupRef} position={[score.x, score.y, score.z]}>
            <sprite scale={[4, 2, 1]}>
                <spriteMaterial
                    ref={materialRef}
                    map={texture}
                    transparent
                    opacity={1}
                    depthTest={false}
                    depthWrite={false}
                />
            </sprite>
        </group>
    );
}
