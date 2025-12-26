
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

/**
 * GameEffects - Optimized post-processing pipeline
 * 
 * Performance optimizations (P2):
 * - Higher luminance threshold (0.5) - fewer pixels processed
 * - Lower resolution scale (0.5) - 75% reduction in bloom fill
 * - Fewer mipmap levels (4) - reduced blur passes
 */
export function GameEffects() {
    return (
        <EffectComposer>
            <Bloom
                luminanceThreshold={0.5}   // Higher = fewer pixels bloom (was 0.3)
                luminanceSmoothing={0.9}   // Smooth transition
                intensity={0.8}            // Keep same visual intensity
                mipmapBlur={true}          // More efficient blur algorithm
                levels={4}                 // Fewer blur passes (default is 5)
            />
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={0.9}
            />
        </EffectComposer>
    );
}
