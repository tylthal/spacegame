
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export function GameEffects() {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.2}
                mipmapBlur
                intensity={1.5}
                radius={0.7}
            />
            <ChromaticAberration
                blendFunction={BlendFunction.NORMAL} // use blendFunction to blend with previous pass
                offset={[0.002, 0.002]}
            />
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={0.9}
            />
        </EffectComposer>
    );
}
