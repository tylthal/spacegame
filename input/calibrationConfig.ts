/**
 * Calibration Configuration
 * Centralized settings for the hand tracking calibration system.
 */

export const CALIBRATION_CONFIG = {
    // Timing
    STABILITY_REQUIRED_MS: 4000,      // How long user must hold still
    DETECTION_TIMEOUT_MS: 200,        // Max time between detections before "lost"
    GRACE_PERIOD_MS: 500,             // Buffer before resetting progress

    // Spatial
    SPATIAL_SEPARATION_THRESHOLD: 0.15, // Min distance between wrists (reduced from 0.2)
    MOVEMENT_THRESHOLD: 0.015,          // Max movement per frame (slightly increased)

    // Gestures
    PINCH_DISTANCE_THRESHOLD: 0.12,    // Normalized pinch distance (more forgiving)
    FINGERPOSE_SCORE_THRESHOLD: 7,     // Min fingerpose confidence (slightly reduced)
} as const;

export type CalibrationConfig = typeof CALIBRATION_CONFIG;
