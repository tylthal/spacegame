import { Canvas } from '@react-three/fiber';
import { GameScene } from './GameScene';
import { CombatLoop } from '../../gameplay/CombatLoop';
// Actually, App.tsx handles HUD. This component should just be the 3D layer.

interface ThreeRendererProps {
    combatLoop?: CombatLoop;
}

export function ThreeRenderer({ combatLoop }: ThreeRendererProps) {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 5, 10], fov: 60 }} // Angled top-down view
                dpr={[1, 2]} // Handle high-DPI screens
            >
                <color attach="background" args={['#000000']} />

                {/* Basic lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <GameScene combatLoop={combatLoop} />
            </Canvas>
        </div>
    );
}
