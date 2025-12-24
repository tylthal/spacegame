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
     */
    virtualPad: {
        width: 0.4,     // 40% of camera width = full screen X range
        height: 0.4,    // 40% of camera height = full screen Y range
        stabilityTolerance: 0.015,
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
     */
    smoothing: {
        dCutoff: 1,
        minCutoff: 1.2,
        beta: 0.002,
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
