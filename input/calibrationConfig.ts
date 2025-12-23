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
    SPATIAL_SEPARATION_THRESHOLD: 0.2, // Min distance between wrists (normalized)
    MOVEMENT_THRESHOLD: 0.01,          // Max movement per frame for "stillness"

    // Gestures
    PINCH_DISTANCE_THRESHOLD: 0.08,    // Normalized pinch distance (thumb-index)
    FINGERPOSE_SCORE_THRESHOLD: 8,     // Min fingerpose confidence score

    // Zones (normalized screen coordinates)
    ZONE_LEFT_MAX: 0.6,                // Left hand must be < this X
    ZONE_RIGHT_MIN: 0.4,               // Right hand must be > this X
} as const;

export type CalibrationConfig = typeof CALIBRATION_CONFIG;
