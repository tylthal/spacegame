import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

interface CameraShakeProps {
    /** Current shake intensity (0 = no shake, higher = more intense) */
    shakeIntensity: number;
    /** Shake duration in seconds */
    duration?: number;
    /** Called when shake completes */
    onComplete?: () => void;
}

/**
 * Camera shake effect triggered by hull damage.
 * Applies random offset to camera position for the duration, then resets.
 */
export function CameraShake({ shakeIntensity, duration = 0.2, onComplete }: CameraShakeProps) {
    const { camera } = useThree();
    const startTime = useRef(Date.now());
    const originalPosition = useRef(camera.position.clone());
    const isComplete = useRef(false);

    useFrame(() => {
        if (shakeIntensity <= 0 || isComplete.current) return;

        const elapsed = (Date.now() - startTime.current) / 1000;

        if (elapsed >= duration) {
            // Restore camera position
            camera.position.copy(originalPosition.current);
            isComplete.current = true;
            onComplete?.();
            return;
        }

        // Calculate shake with falloff
        const falloff = 1 - (elapsed / duration);
        const intensity = shakeIntensity * falloff;

        // Apply random offset
        camera.position.x = originalPosition.current.x + (Math.random() - 0.5) * intensity * 2;
        camera.position.y = originalPosition.current.y + (Math.random() - 0.5) * intensity * 2;
    });

    return null;
}
