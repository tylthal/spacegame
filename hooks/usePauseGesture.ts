import { useRef, useEffect } from 'react';
import { InputProcessor } from '../input/InputProcessor';

/**
 * usePauseGesture - Detect when both hands show palm gesture for pause
 * 
 * Requires BOTH hands to show palm for 0.6s with 5 consecutive frames
 * to prevent accidental pauses.
 */
export function usePauseGesture(
    inputProcessor: InputProcessor | null,
    enabled: boolean,
    onPause: () => void
) {
    const palmHoldStartRef = useRef<number | null>(null);
    const palmConsecutiveFramesRef = useRef(0);

    const PAUSE_HOLD_MS = 600; // Hold BOTH palms for 0.6 seconds
    const PAUSE_MIN_FRAMES = 5; // Require at least 5 consecutive palm frames

    useEffect(() => {
        if (!inputProcessor || !enabled) return;

        return inputProcessor.subscribe(event => {
            const rightHand = event.hands.right;
            const leftHand = event.hands.left;

            // Require BOTH hands to be showing palm
            const bothHandsPalm = (
                rightHand?.gesture === 'palm' &&
                leftHand?.gesture === 'palm'
            );

            if (bothHandsPalm) {
                palmConsecutiveFramesRef.current++;

                // Start timer on first palm frame
                if (!palmHoldStartRef.current) {
                    palmHoldStartRef.current = Date.now();
                }

                // Only trigger if BOTH time AND frame count requirements are met
                const heldMs = Date.now() - palmHoldStartRef.current;
                if (heldMs >= PAUSE_HOLD_MS && palmConsecutiveFramesRef.current >= PAUSE_MIN_FRAMES) {
                    onPause();
                    palmHoldStartRef.current = null;
                    palmConsecutiveFramesRef.current = 0;
                }
            } else {
                // Not both palms = reset
                palmHoldStartRef.current = null;
                palmConsecutiveFramesRef.current = 0;
            }
        });
    }, [inputProcessor, enabled, onPause]);

    // Return a reset function in case caller needs it
    const reset = () => {
        palmHoldStartRef.current = null;
        palmConsecutiveFramesRef.current = 0;
    };

    return { reset };
}
