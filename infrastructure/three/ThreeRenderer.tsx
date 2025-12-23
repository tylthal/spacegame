import { Canvas, useThree } from '@react-three/fiber';
import { GameScene } from './GameScene';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useEffect } from 'react';
import * as THREE from 'three';

interface ThreeRendererProps {
    combatLoop?: CombatLoop;
}

function AdaptiveCamera() {
    const { camera, size } = useThree();

    useEffect(() => {
        if (!(camera instanceof THREE.PerspectiveCamera)) return;
        if (size.width === 0 || size.height === 0) return;

        const aspect = size.width / size.height;
        const targetWidth = 20; // Visibility width (approx -10 to 10)

        // Base distance logic
        // If landscape (aspect > 1): Default [0, 5, 10] works well.
        // If portrait (aspect < 1): We need to pull back to see the width.

        // At y=0, with camera at y=5, z=10.
        // Distance to origin approx sqrt(5^2 + 10^2) = 11.18

        // Simple heuristic: Maintain horizontal FOV
        // VFOV = 2 * atan( tan(HFOV/2) / aspect )
        // We can just adjust Z position based on 1/aspect.

        const baseZ = 10;
        const baseY = 5;

        if (aspect < 1.0) {
            // Portrait: Pull back proportional to how narrow it is
            const factor = 1.0 / aspect;
            camera.position.set(0, baseY * factor, baseZ * factor);
        } else {
            // Landscape: Default
            camera.position.set(0, baseY, baseZ);
        }

        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

    }, [camera, size]);

    return null;
}

export function ThreeRenderer({ combatLoop }: ThreeRendererProps) {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 5, 10], fov: 60 }}
                dpr={[1, 2]}
            >
                <color attach="background" args={['#000000']} />

                <AdaptiveCamera />

                {/* Basic lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <GameScene combatLoop={combatLoop} />
            </Canvas>
        </div>
    );
}
