/**
 * HandSignature - Hand biometric signature for player lock-in
 * 
 * Captures unique proportions of a player's hand during calibration.
 * Used to filter out other hands that may appear in the camera frame.
 */

import { HandLandmark } from './HandTracker';

/**
 * Hand landmark indices (MediaPipe convention)
 * 
 * Fingertips: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
 * Knuckles (MCP): 1-2-3-4 (thumb), 5-6-7-8 (index), etc.
 * Wrist: 0
 */
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

/**
 * Captures unique ratios of a hand's proportions.
 * Ratios are scale-invariant, so they work at any distance from camera.
 */
export interface HandSignature {
    /** Ratio of palm width to palm height */
    palmAspect: number;

    /** Finger length ratios (relative to middle finger) */
    indexToMiddle: number;
    ringToMiddle: number;
    pinkyToMiddle: number;

    /** Thumb proportions */
    thumbToIndex: number;

    /** Average of all ratios for quick reject */
    averageRatio: number;
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
 * Compute hand signature from landmarks
 */
export function computeHandSignature(landmarks: readonly HandLandmark[]): HandSignature {
    if (landmarks.length < 21) {
        throw new Error('Hand must have 21 landmarks');
    }

    // Palm dimensions
    const palmWidth = dist(landmarks[INDEX_MCP], landmarks[PINKY_MCP]);
    const palmHeight = dist(landmarks[WRIST], landmarks[MIDDLE_MCP]);
    const palmAspect = palmWidth / Math.max(palmHeight, 0.001);

    // Finger lengths (tip to MCP)
    const indexLength = dist(landmarks[INDEX_TIP], landmarks[INDEX_MCP]);
    const middleLength = dist(landmarks[MIDDLE_TIP], landmarks[MIDDLE_MCP]);
    const ringLength = dist(landmarks[RING_TIP], landmarks[RING_MCP]);
    const pinkyLength = dist(landmarks[PINKY_TIP], landmarks[PINKY_MCP]);
    const thumbLength = dist(landmarks[THUMB_TIP], landmarks[WRIST]);

    // Normalize to middle finger (usually longest)
    const normMiddle = Math.max(middleLength, 0.001);
    const indexToMiddle = indexLength / normMiddle;
    const ringToMiddle = ringLength / normMiddle;
    const pinkyToMiddle = pinkyLength / normMiddle;
    const thumbToIndex = thumbLength / Math.max(indexLength, 0.001);

    const averageRatio = (palmAspect + indexToMiddle + ringToMiddle + pinkyToMiddle + thumbToIndex) / 5;

    return {
        palmAspect,
        indexToMiddle,
        ringToMiddle,
        pinkyToMiddle,
        thumbToIndex,
        averageRatio,
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
        indexToMiddle: acc.indexToMiddle + sig.indexToMiddle,
        ringToMiddle: acc.ringToMiddle + sig.ringToMiddle,
        pinkyToMiddle: acc.pinkyToMiddle + sig.pinkyToMiddle,
        thumbToIndex: acc.thumbToIndex + sig.thumbToIndex,
        averageRatio: acc.averageRatio + sig.averageRatio,
    }), {
        palmAspect: 0,
        indexToMiddle: 0,
        ringToMiddle: 0,
        pinkyToMiddle: 0,
        thumbToIndex: 0,
        averageRatio: 0,
    });

    const n = signatures.length;
    return {
        palmAspect: sum.palmAspect / n,
        indexToMiddle: sum.indexToMiddle / n,
        ringToMiddle: sum.ringToMiddle / n,
        pinkyToMiddle: sum.pinkyToMiddle / n,
        thumbToIndex: sum.thumbToIndex / n,
        averageRatio: sum.averageRatio / n,
    };
}

/**
 * Score how well a hand matches the locked signature.
 * Returns 0-1 where 1 = perfect match, 0 = completely different.
 */
export function matchSignature(candidate: HandSignature, locked: HandSignature): number {
    // Calculate relative difference for each ratio
    const diffs = [
        Math.abs(candidate.palmAspect - locked.palmAspect) / Math.max(locked.palmAspect, 0.001),
        Math.abs(candidate.indexToMiddle - locked.indexToMiddle) / Math.max(locked.indexToMiddle, 0.001),
        Math.abs(candidate.ringToMiddle - locked.ringToMiddle) / Math.max(locked.ringToMiddle, 0.001),
        Math.abs(candidate.pinkyToMiddle - locked.pinkyToMiddle) / Math.max(locked.pinkyToMiddle, 0.001),
        Math.abs(candidate.thumbToIndex - locked.thumbToIndex) / Math.max(locked.thumbToIndex, 0.001),
    ];

    // Average relative difference
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    // Convert to 0-1 score (0% diff = 1.0, 50% diff = 0.5, 100%+ diff = 0)
    return Math.max(0, 1 - avgDiff);
}

/**
 * Default match threshold - hands must match at least this well
 */
export const SIGNATURE_MATCH_THRESHOLD = 0.75; // 75% similarity required
