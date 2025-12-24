import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { GameScene } from './GameScene';
import { CombatLoop } from '../../gameplay/CombatLoop';
import { useEffect } from 'react';
import * as THREE from 'three';

interface ThreeRendererProps {
    combatLoop?: CombatLoop;
    isRunning?: boolean;
}

function TurretCamera({ combatLoop }: { combatLoop?: CombatLoop }) {
    const { camera } = useThree();

    useFrame(() => {
        if (!combatLoop) return;

        // Position: Center of the Universe (Turret)
        camera.position.set(0, 0, 0);

        // Rotation: Sync with CombatLoop Aim
        // CombatLoop Yaw: -PI to PI
        // CombatLoop Pitch: 0 (Up) to PI (Down) -> ThreeJS: -PI/2 (Up) to PI/2 (Down)

        const camPitch = combatLoop.pitch - (Math.PI / 2);
        // Invert Pitch if needed based on controls feel, but let's stick to map
        // Yaw: standard rotation around Y
        const camYaw = -combatLoop.yaw; // Invert yaw to match intuitive "Move hand left to look left"

        // Order YXZ: Rotate Yaw (Y) then Pitch (X) local
        camera.rotation.set(camPitch, camYaw, 0, 'YXZ');
    });

    return null;
}

export function ThreeRenderer(props: ThreeRendererProps) {
    const { combatLoop } = props;
    return (
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 3, 5], fov: 60 }}
                dpr={[1, 2]}
            >
                <color attach="background" args={['#000000']} />

                <TurretCamera combatLoop={combatLoop} />

                {/* Basic lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <GameScene combatLoop={combatLoop} isRunning={!!combatLoop && (props.isRunning ?? true)} />
            </Canvas>
        </div>
    );
}
