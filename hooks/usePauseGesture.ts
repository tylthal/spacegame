import { useRef, useEffect } from 'react';
import { InputProcessor } from '../input/InputProcessor';

/**
 * usePauseGesture - Detect when both hands show palm gesture for pause
 * 
 * Requires BOTH hands to show palm for 0.6s with 8 consecutive frames
 * AND hands must be sufficiently separated to prevent single-hand false positives.
 */
export function usePauseGesture(
    inputProcessor: InputProcessor | null,
    enabled: boolean,
    onPause: () => void
) {
    const palmHoldStartRef = useRef<number | null>(null);
    const palmConsecutiveFramesRef = useRef(0);

    const PAUSE_HOLD_MS = 600; // Hold BOTH palms for 0.6 seconds
    const PAUSE_MIN_FRAMES = 8; // Require at least 8 consecutive palm frames (increased from 5)
    const MIN_HAND_SEPARATION = 0.25; // Minimum horizontal separation between hands (25% of screen)

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

            // Additional check: hands must be separated horizontally
            // This prevents a single hand near the center being detected as both
            let handsSeparated = false;
            if (bothHandsPalm && rightHand && leftHand) {
                const separation = Math.abs(rightHand.cursor.x - leftHand.cursor.x);
                handsSeparated = separation >= MIN_HAND_SEPARATION;
            }

            if (bothHandsPalm && handsSeparated) {
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
                // Not both palms OR hands not separated = reset
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
