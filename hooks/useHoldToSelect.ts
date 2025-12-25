import { useRef, useCallback } from 'react';

/**
 * useHoldToSelect - Require holding pinch gesture for duration to trigger action
 * 
 * Creates a more intentional interaction pattern that prevents accidental clicks.
 * Returns progress (0-1) for visual feedback and handlers for hover/pinch state.
 */
export interface HoldToSelectOptions {
    /** Duration in ms to hold before triggering (default: 1000ms) */
    holdDuration?: number;
    /** Callback when hold completes */
    onSelect: () => void;
}

export interface HoldToSelectState {
    /** Current progress 0-1 for visual feedback */
    progress: number;
    /** Whether currently holding on this button */
    isHolding: boolean;
}

export function useHoldToSelect(options: HoldToSelectOptions) {
    const holdDuration = options.holdDuration ?? 1000;

    // Track hold state per button
    const holdStartRef = useRef<number | null>(null);
    const progressRef = useRef(0);
    const triggeredRef = useRef(false);

    /**
     * Call this on every frame while hovering and pinching
     * Returns current progress (0-1)
     */
    const updateHold = useCallback((isHovering: boolean, isPinching: boolean): HoldToSelectState => {
        if (isHovering && isPinching) {
            // Start hold timer if not already started
            if (holdStartRef.current === null) {
                holdStartRef.current = Date.now();
                triggeredRef.current = false;
            }

            const elapsed = Date.now() - holdStartRef.current;
            progressRef.current = Math.min(1, elapsed / holdDuration);

            // Trigger on completion (only once)
            if (progressRef.current >= 1 && !triggeredRef.current) {
                triggeredRef.current = true;
                options.onSelect();
            }

            return { progress: progressRef.current, isHolding: true };
        } else {
            // Reset when not hovering or not pinching
            holdStartRef.current = null;
            progressRef.current = 0;
            triggeredRef.current = false;
            return { progress: 0, isHolding: false };
        }
    }, [holdDuration, options.onSelect]);

    /**
     * Reset the hold state (e.g., when button action completes)
     */
    const reset = useCallback(() => {
        holdStartRef.current = null;
        progressRef.current = 0;
        triggeredRef.current = false;
    }, []);

    return { updateHold, reset };
}
