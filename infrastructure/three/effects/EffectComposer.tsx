
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export function GameEffects() {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.2}
                mipmapBlur
                intensity={1.5}
                radius={0.7}
            />
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={0.9}
            />
        </EffectComposer>
    );
}
