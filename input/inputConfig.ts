/**
 * Centralized Input Configuration
 * 
 * All input, calibration, and gesture settings in one place.
 * Prevents magic numbers scattered across the codebase.
 */

export const INPUT_CONFIG = {
    /**
     * Virtual Mousepad Settings
     * Controls how hand movement maps to screen coordinates.
     * Smaller values = higher sensitivity (less movement needed)
     * Note: Y is typically more constrained, so we use higher value for more reach
     */
    virtualPad: {
        width: 0.35,    // 35% of camera width = full screen X range (more sensitive)
        height: 0.5,    // 50% of camera height = full screen Y range (easier to reach edges)
        stabilityTolerance: 0.015,
        deadZone: 0.012, // Ignore movements smaller than 1.2% of screen - reduces jitter
    },

    /**
     * Calibration Settings
     * Controls the calibration phase requirements.
     */
    calibration: {
        stabilityRequiredMs: 4000,      // How long user must hold steady
        detectionTimeoutMs: 200,        // Max gap between gesture detections
        gracePeriodMs: 500,             // Buffer before resetting progress
        spatialSeparationThreshold: 0.15, // Min distance between hands
        movementThreshold: 0.015,       // Max movement per frame for "steady"
        pinchClickDebounceMs: 1000,     // Delay after calibration before accepting clicks
    },

    /**
     * Gesture Detection Settings
     */
    gestures: {
        // For fingerpose-based detection
        fingerposeScoreThreshold: 7,

        // For manual pinch detection (normalized by hand size)
        pinchDistanceThreshold: 0.12,

        // For InputProcessor gesture classification
        pinchThreshold: 0.05,
        fistThreshold: 0.16,
    },

    /**
     * One Euro Filter Settings
     * Controls input smoothing to reduce jitter.
     * Lower minCutoff = more responsive but more jitter
     * Higher beta = more responsive during fast movement
     */
    smoothing: {
        dCutoff: 1,
        minCutoff: 0.8,   // Reduced from 1.2 for more responsiveness
        beta: 0.007,      // Increased from 0.002 for faster tracking during movement
    },

    /**
     * Axis Inversion
     * Controls coordinate transformations for webcam/screen mapping.
     */
    axes: {
        invertX: true,   // Webcam is mirrored
        invertY: false,  // Y=0 at top matches screen
    },
} as const;

// Type exports for consumers
export type InputConfig = typeof INPUT_CONFIG;
export type VirtualPadConfig = typeof INPUT_CONFIG.virtualPad;
export type CalibrationConfig = typeof INPUT_CONFIG.calibration;
export type GestureConfig = typeof INPUT_CONFIG.gestures;
export type SmoothingConfig = typeof INPUT_CONFIG.smoothing;
