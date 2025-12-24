
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export function GameEffects() {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.3}
                intensity={0.8}
                radius={0.5}
            />
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={0.9}
            />
        </EffectComposer>
    );
}
