/**
 * HandSignature - Hand biometric signature for player lock-in
 * 
 * Captures unique proportions of a player's hand during calibration.
 * Uses STABLE palm-based measurements that don't change with finger poses.
 * Used to filter out other hands that may appear in the camera frame.
 */

import { HandLandmark } from './HandTracker';

/**
 * Hand landmark indices (MediaPipe convention)
 * 
 * Fingertips: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
 * Knuckles (MCP): 5 (index), 9 (middle), 13 (ring), 17 (pinky)
 * Thumb base: 1, 2
 * Wrist: 0
 */
const WRIST = 0;
const THUMB_CMC = 1;  // Thumb base (very stable)
const THUMB_MCP = 2;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

/**
 * Captures unique ratios of a hand's PALM proportions.
 * These are stable regardless of finger pose (pointing, fist, open, etc.)
 * Ratios are scale-invariant, so they work at any distance from camera.
 */
export interface HandSignature {
    /** Palm width (index MCP to pinky MCP) / palm height (wrist to middle MCP) */
    palmAspect: number;

    /** Thumb base position relative to palm (x-axis ratio) */
    thumbBaseRatio: number;

    /** Upper palm width / lower palm width (trapezoid shape) */
    palmTaper: number;

    /** Wrist to thumb base / wrist to index MCP ratio */
    thumbWristRatio: number;

    /** Index-to-middle knuckle distance / middle-to-ring distance */
    knuckleSpacingRatio: number;
}

/**
 * Distance between two landmarks
 */
function dist(a: HandLandmark, b: HandLandmark): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Compute hand signature from landmarks using STABLE palm measurements
 */
export function computeHandSignature(landmarks: readonly HandLandmark[]): HandSignature {
    if (landmarks.length < 21) {
        throw new Error('Hand must have 21 landmarks');
    }

    // All measurements use MCP/wrist positions which are STABLE across gestures
    const wrist = landmarks[WRIST];
    const thumbBase = landmarks[THUMB_CMC];
    const thumbMcp = landmarks[THUMB_MCP];
    const indexMcp = landmarks[INDEX_MCP];
    const middleMcp = landmarks[MIDDLE_MCP];
    const ringMcp = landmarks[RING_MCP];
    const pinkyMcp = landmarks[PINKY_MCP];

    // 1. Palm aspect ratio (width / height)
    const palmWidth = dist(indexMcp, pinkyMcp);
    const palmHeight = dist(wrist, middleMcp);
    const palmAspect = palmWidth / Math.max(palmHeight, 0.001);

    // 2. Thumb base position (how far thumb sticks out)
    const thumbBaseToWrist = dist(thumbBase, wrist);
    const thumbBaseRatio = thumbBaseToWrist / Math.max(palmHeight, 0.001);

    // 3. Palm taper (top width vs bottom width - hand shape)
    const upperWidth = dist(indexMcp, pinkyMcp);
    const lowerWidth = dist(wrist, thumbBase) + dist(thumbBase, pinkyMcp) * 0.3;
    const palmTaper = upperWidth / Math.max(lowerWidth, 0.001);

    // 4. Thumb wrist ratio
    const wristToThumb = dist(wrist, thumbMcp);
    const wristToIndex = dist(wrist, indexMcp);
    const thumbWristRatio = wristToThumb / Math.max(wristToIndex, 0.001);

    // 5. Knuckle spacing (how spread are knuckles - unique per person)
    const indexMiddleSpacing = dist(indexMcp, middleMcp);
    const middleRingSpacing = dist(middleMcp, ringMcp);
    const knuckleSpacingRatio = indexMiddleSpacing / Math.max(middleRingSpacing, 0.001);

    return {
        palmAspect,
        thumbBaseRatio,
        palmTaper,
        thumbWristRatio,
        knuckleSpacingRatio,
    };
}

/**
 * Compute average signature from multiple samples
 */
export function averageSignatures(signatures: HandSignature[]): HandSignature {
    if (signatures.length === 0) {
        throw new Error('Need at least one signature to average');
    }

    const sum = signatures.reduce((acc, sig) => ({
        palmAspect: acc.palmAspect + sig.palmAspect,
        thumbBaseRatio: acc.thumbBaseRatio + sig.thumbBaseRatio,
        palmTaper: acc.palmTaper + sig.palmTaper,
        thumbWristRatio: acc.thumbWristRatio + sig.thumbWristRatio,
        knuckleSpacingRatio: acc.knuckleSpacingRatio + sig.knuckleSpacingRatio,
    }), {
        palmAspect: 0,
        thumbBaseRatio: 0,
        palmTaper: 0,
        thumbWristRatio: 0,
        knuckleSpacingRatio: 0,
    });

    const n = signatures.length;
    return {
        palmAspect: sum.palmAspect / n,
        thumbBaseRatio: sum.thumbBaseRatio / n,
        palmTaper: sum.palmTaper / n,
        thumbWristRatio: sum.thumbWristRatio / n,
        knuckleSpacingRatio: sum.knuckleSpacingRatio / n,
    };
}

/**
 * Score how well a hand matches the locked signature.
 * Returns 0-1 where 1 = perfect match, 0 = completely different.
 * 
 * Uses weighted scoring - palm aspect is most reliable, others less so.
 */
export function matchSignature(candidate: HandSignature, locked: HandSignature): number {
    // Calculate relative difference for each ratio
    // Weight palm measurements higher (more stable)
    const weights = [
        3.0, // palmAspect - most stable
        1.0, // thumbBaseRatio
        1.5, // palmTaper
        1.0, // thumbWristRatio
        1.5, // knuckleSpacingRatio
    ];

    const diffs = [
        Math.abs(candidate.palmAspect - locked.palmAspect) / Math.max(locked.palmAspect, 0.001),
        Math.abs(candidate.thumbBaseRatio - locked.thumbBaseRatio) / Math.max(locked.thumbBaseRatio, 0.001),
        Math.abs(candidate.palmTaper - locked.palmTaper) / Math.max(locked.palmTaper, 0.001),
        Math.abs(candidate.thumbWristRatio - locked.thumbWristRatio) / Math.max(locked.thumbWristRatio, 0.001),
        Math.abs(candidate.knuckleSpacingRatio - locked.knuckleSpacingRatio) / Math.max(locked.knuckleSpacingRatio, 0.001),
    ];

    // Weighted average difference
    let totalWeight = 0;
    let weightedDiff = 0;
    for (let i = 0; i < diffs.length; i++) {
        weightedDiff += diffs[i] * weights[i];
        totalWeight += weights[i];
    }
    const avgDiff = weightedDiff / totalWeight;

    // Convert to 0-1 score (0% diff = 1.0, 50% diff = 0.5, 100%+ diff = 0)
    return Math.max(0, 1 - avgDiff);
}

/**
 * Default match threshold - lower now since we use stable palm measurements
 * Finger gun pose should still match calibration pose
 */
export const SIGNATURE_MATCH_THRESHOLD = 0.60; // 60% similarity required (was 75%)
