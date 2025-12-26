import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { GameScene } from './GameScene';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useEffect } from 'react';
import * as THREE from 'three';

interface ThreeRendererProps {
    combatLoop?: CombatLoop;
    isRunning?: boolean;
}

function StaticFighterCamera({ combatLoop }: { combatLoop?: CombatLoop }) {
    const { camera } = useThree();

    useFrame(() => {
        if (!combatLoop) return;

        // Position: Center (Fixed)
        camera.position.set(0, 0, 0);

        // Rotation: Fixed Forward (-Z)
        camera.rotation.set(0, 0, 0);
    });

    return null;
}

export function ThreeRenderer(props: ThreeRendererProps) {
    const { combatLoop } = props;

    // Cap DPR at 1.5 for performance (was [1, 2])
    // On 2x displays, this reduces pixels by ~44%
    const maxDpr = Math.min(window.devicePixelRatio, 1.5);

    return (
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 3, 5], fov: 60 }}
                dpr={maxDpr}
            >
                <color attach="background" args={['#000000']} />

                <StaticFighterCamera combatLoop={combatLoop} />

                {/* Basic lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <GameScene combatLoop={combatLoop} isRunning={!!combatLoop && (props.isRunning ?? true)} />
            </Canvas>
        </div>
    );
}
