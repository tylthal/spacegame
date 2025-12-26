import { HandFrame, HandLandmark, HandTracker, FrameResult } from './HandTracker';
import { OneEuroConfig, OneEuroFilter } from './OneEuroFilter';
import { INPUT_CONFIG } from './inputConfig';
import { CursorMapper } from './CursorMapper';
import {
  HandSignature,
  computeHandSignature,
  matchSignature,
  SIGNATURE_MATCH_THRESHOLD,
} from './HandSignature';

// Gestures: pinch (shooting), fist (gripping), palm (stop/pause), point (default/aiming)
type Gesture = 'pinch' | 'fist' | 'palm' | 'point';

export interface VirtualMousepadConfig {
  origin: { x: number; y: number };
  width: number;
  height: number;
  stabilityTolerance: number;
}

export interface GestureConfig {
  pinchThreshold: number;
  fistThreshold: number;
  dCutoff: number;
  minCutoff: number;
  beta: number;
}

export interface ProcessedHandData {
  id: string; // 'left' | 'right' based on spatial sort
  landmarks: HandLandmark[];
  cursor: { x: number; y: number };
  gesture: Gesture;
}

export interface ProcessedHandEvent {
  // Aggregate 'Game' State
  cursor: { x: number; y: number }; // Usually from Right hand
  gesture: Gesture;                // Usually from Left hand
  stable: boolean;

  // Detailed Spatial State
  hands: {
    left?: ProcessedHandData;
    right?: ProcessedHandData;
  };

  // Signature match info for debugging
  signatureScores?: {
    left?: number;
    right?: number;
  };

  // All detected hands (including rejected ones) for wireframe
  allHands?: {
    landmarks: HandLandmark[];
    matched: boolean;
    score: number;
    role?: 'left' | 'right';
  }[];

  // Deprecated fields to maintain some compat if needed, or remove them
  raw?: HandFrame;
  smoothedLandmarks?: HandLandmark[];
}

// Derived from centralized config
const DEFAULT_VIRTUAL_PAD: VirtualMousepadConfig = {
  origin: { x: 0.3, y: 0.3 },
  width: INPUT_CONFIG.virtualPad.width,
  height: INPUT_CONFIG.virtualPad.height,
  stabilityTolerance: INPUT_CONFIG.virtualPad.stabilityTolerance,
};

const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  pinchThreshold: INPUT_CONFIG.gestures.pinchThreshold,
  fistThreshold: INPUT_CONFIG.gestures.fistThreshold,
  dCutoff: INPUT_CONFIG.smoothing.dCutoff,
  minCutoff: INPUT_CONFIG.smoothing.minCutoff,
  beta: INPUT_CONFIG.smoothing.beta,
};

interface AxisFilters {
  x: OneEuroFilter;
  y: OneEuroFilter;
  z: OneEuroFilter;
}

// P4 Optimization: Only filter key landmarks used for gesture detection
// Reduces filter operations from 63 (21×3) to 21 (7×3) per frame
const KEY_LANDMARK_INDICES = new Set([0, 4, 8, 12, 16, 20]); // wrist + 5 fingertips + thumb MCP

export class InputProcessor {
  private listeners = new Set<(event: ProcessedHandEvent) => void>();
  private unsubscribeTracker?: () => void;
  private axisFilters = new Map<string, AxisFilters>();
  private lastCursor?: { x: number; y: number };
  private lastRawCursor?: { x: number; y: number };
  private readonly gestureConfig: GestureConfig;
  private readonly virtualPad: VirtualMousepadConfig;
  // Maintain separate mappers to preserve state (deadzones/smoothing) per hand
  private readonly cursorMappers = new Map<string, CursorMapper>();

  // Hand signature lock-in
  private lockedSignatures: { left?: HandSignature; right?: HandSignature } = {};
  private signatureLockEnabled = false;
  private lastHandPositions: { left?: { x: number; y: number }; right?: { x: number; y: number } } = {};
  private readonly positionContinuityThreshold = 0.45; // Max hand jump - very relaxed

  constructor(
    tracker: HandTracker,
    options?: Partial<{ gesture: Partial<GestureConfig>; virtualPad: Partial<VirtualMousepadConfig> }>,
  ) {
    this.gestureConfig = { ...DEFAULT_GESTURE_CONFIG, ...options?.gesture };
    this.virtualPad = { ...DEFAULT_VIRTUAL_PAD, ...options?.virtualPad } as VirtualMousepadConfig;

    this.unsubscribeTracker = tracker.subscribe(frame => this.handleFrame(frame));
  }

  private getMapper(handedness: string): CursorMapper {
    if (!this.cursorMappers.has(handedness)) {
      const mapper = new CursorMapper();
      // Sync new mapper with known calibration if needed?
      // Actually, we should store calibration on Processor and apply it.
      // But for now, let's just assume we set it on all.
      // Wait, setCalibration iterates active mappers? 
      // Better: Store active calibration offset in Processor, apply on creation.
      mapper.setCalibration(this.activeCalibration);
      this.cursorMappers.set(handedness, mapper);
    }
    return this.cursorMappers.get(handedness)!;
  }

  private activeCalibration = { x: 0.5, y: 0.5 };

  setCalibration(offset: { x: number; y: number }): void {
    this.activeCalibration = offset;
    this.cursorMappers.forEach(mapper => mapper.setCalibration(offset));
  }

  /**
   * Lock hand signatures for player identification.
   * Call during calibration to capture the player's unique hand proportions.
   * After locking, hands that don't match will be filtered out.
   */
  setLockedSignatures(signatures: { left?: HandSignature; right?: HandSignature }): void {
    this.lockedSignatures = { ...signatures };
    this.signatureLockEnabled = !!(signatures.left || signatures.right);
    // Reset position tracking when re-locking
    this.lastHandPositions = {};
  }

  /** Get current locked signatures (for debugging) */
  getLockedSignatures(): { left?: HandSignature; right?: HandSignature } {
    return { ...this.lockedSignatures };
  }

  /** Check if signature locking is active */
  isSignatureLockEnabled(): boolean {
    return this.signatureLockEnabled;
  }

  /** Disable signature locking (accept all hands) */
  clearSignatureLock(): void {
    this.lockedSignatures = {};
    this.signatureLockEnabled = false;
    this.lastHandPositions = {};
  }

  dispose(): void {
    this.unsubscribeTracker?.();
    this.listeners.clear();
  }

  subscribe(listener: (event: ProcessedHandEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleFrame(result: any): void {
    // Note: result is FrameResult { timestamp, hands: HandFrame[] }
    const { timestamp, hands } = result as { timestamp: number, hands: HandFrame[] };

    if (hands.length === 0) return;

    // SPATIAL ROLE ASSIGNMENT
    const sortedHands = [...hands].sort((a, b) => {
      const ax = a.landmarks[0].x;
      const bx = b.landmarks[0].x;
      return ax - bx;
    });

    // Track all hands for wireframe visualization
    const allHandsInfo: {
      landmarks: HandLandmark[];
      matched: boolean;
      score: number;
      role?: 'left' | 'right';
    }[] = [];

    // Score and filter hands by signature if lock is enabled
    const signatureScores: { left?: number; right?: number } = {};
    let filteredHands = sortedHands;

    if (this.signatureLockEnabled) {
      filteredHands = [];

      for (const hand of sortedHands) {
        const wristX = hand.landmarks[0].x;
        const role: 'left' | 'right' = wristX < 0.5 ? 'left' : 'right';
        const lockedSig = this.lockedSignatures[role];

        let matched = false;
        let score = 0;

        if (lockedSig) {
          try {
            const candidateSig = computeHandSignature(hand.landmarks);
            score = matchSignature(candidateSig, lockedSig);
            matched = score >= SIGNATURE_MATCH_THRESHOLD;
          } catch {
            // Hand doesn't have enough landmarks
            matched = false;
          }

          // Position continuity check (prevent hand "teleporting")
          if (matched && this.lastHandPositions[role]) {
            const lastPos = this.lastHandPositions[role]!;
            const currentPos = { x: hand.landmarks[0].x, y: hand.landmarks[0].y };
            const jumpDistance = Math.hypot(
              currentPos.x - lastPos.x,
              currentPos.y - lastPos.y
            );
            if (jumpDistance > this.positionContinuityThreshold) {
              // Hand jumped too far - likely a different person
              matched = false;
            }
          }

          signatureScores[role] = score;
        } else {
          // No locked signature for this role - accept any hand
          matched = true;
          score = 1;
        }

        // Store for wireframe
        const smoothed = hand.landmarks.map((l, i) =>
          this.smoothLandmark(hand, i, l, role === 'right' ? 'Right' : 'Left')
        );
        allHandsInfo.push({
          landmarks: smoothed,
          matched,
          score,
          role,
        });

        if (matched) {
          filteredHands.push(hand);
          // Update position tracking for continuity
          this.lastHandPositions[role] = {
            x: hand.landmarks[0].x,
            y: hand.landmarks[0].y,
          };
        }
      }
    } else {
      // No lock - accept all hands, mark all as matched
      for (const hand of sortedHands) {
        const wristX = hand.landmarks[0].x;
        const role: 'left' | 'right' = wristX < 0.5 ? 'left' : 'right';
        const smoothed = hand.landmarks.map((l, i) =>
          this.smoothLandmark(hand, i, l, role === 'right' ? 'Right' : 'Left')
        );
        allHandsInfo.push({
          landmarks: smoothed,
          matched: true,
          score: 1,
          role,
        });
      }
    }

    // Define handData strictly before usage
    const handData: { left?: ProcessedHandData; right?: ProcessedHandData } = {};

    // Helper to process a hand
    const processHand = (frame: HandFrame, role: 'left' | 'right'): ProcessedHandData => {
      const mapperKey = role === 'right' ? 'Right' : 'Left';

      const smoothed = frame.landmarks.map((l, i) => this.smoothLandmark(frame, i, l, mapperKey));
      const cursor = this.toCursor(smoothed[8] ?? smoothed[0], mapperKey);
      const gesture = this.classifyGesture(smoothed, frame.landmarks);

      return {
        id: role,
        landmarks: smoothed,
        cursor,
        gesture
      };
    };

    let aimHand: HandFrame | null = null;
    let fireHand: HandFrame | null = null;

    // Assign roles (using filtered hands - only those that match locked signature)
    if (filteredHands.length === 1) {
      const h = filteredHands[0];
      const x = h.landmarks[0].x;
      if (x < 0.4) {
        handData.left = processHand(h, 'left');
        fireHand = h;
      } else {
        handData.right = processHand(h, 'right');
        aimHand = h;
        fireHand = h; // Allow aim hand to fire if only one hand
      }
    } else if (filteredHands.length >= 2) {
      handData.left = processHand(filteredHands[0], 'left');
      handData.right = processHand(filteredHands[filteredHands.length - 1], 'right');
      fireHand = filteredHands[0];
      aimHand = filteredHands[filteredHands.length - 1];
    }

    // Determine Game State Aggregates
    const primaryHand = handData.right || handData.left;
    const cursor = primaryHand && handData.right ? handData.right.cursor : (primaryHand?.cursor || { x: 0.5, y: 0.5 });

    // Gesture default
    let gesture: Gesture = 'palm';
    if (handData.left) {
      gesture = handData.left.gesture;
    } else if (handData.right) {
      gesture = handData.right.gesture;
    }

    // Stability
    let stable = true;
    if (primaryHand) {
      // Re-find key frame for raw cursor
      const rawFrame = filteredHands.find(h =>
        (primaryHand.id === 'right' && h === filteredHands[filteredHands.length - 1]) ||
        (primaryHand.id === 'left' && h === filteredHands[0])
      );

      if (rawFrame) {
        const mapperKey = primaryHand.id === 'right' ? 'Right' : 'Left';
        const rawCursor = this.toCursor(rawFrame.landmarks[8] ?? rawFrame.landmarks[0], mapperKey);
        stable = this.isStable(cursor, rawCursor);
        this.lastCursor = cursor;
        this.lastRawCursor = rawCursor;
      }
    }

    const event: ProcessedHandEvent = {
      raw: aimHand || fireHand || hands[0], // Fallback for legacy types
      gesture,
      smoothedLandmarks: [], // Deprecated
      cursor,
      stable,
      hands: handData,
      signatureScores,
      allHands: allHandsInfo,
    };

    this.listeners.forEach(listener => listener(event));
  }

  private getFilterKey(role: string, index: number): string {
    return `${role}-${index}`;
  }

  private smoothLandmark(frame: HandFrame, index: number, landmark: HandLandmark, role: string): HandLandmark {
    // P4 Optimization: Only apply expensive OneEuro filter to key landmarks
    // Other landmarks pass through unfiltered (still accurate, just less smooth)
    if (!KEY_LANDMARK_INDICES.has(index)) {
      return { ...landmark };
    }

    const key = this.getFilterKey(role, index);
    const filters = this.axisFilters.get(key) ?? this.createFilters(key);
    return {
      x: filters.x.filter(landmark.x, frame.timestamp),
      y: filters.y.filter(landmark.y, frame.timestamp),
      z: filters.z.filter(landmark.z, frame.timestamp),
    };
  }

  private createFilters(key: string): AxisFilters {
    const config: OneEuroConfig = {
      beta: this.gestureConfig.beta,
      dCutoff: this.gestureConfig.dCutoff,
      minCutoff: this.gestureConfig.minCutoff,
    };
    const filters = {
      x: new OneEuroFilter(config),
      y: new OneEuroFilter(config),
      z: new OneEuroFilter(config),
    };
    this.axisFilters.set(key, filters);
    return filters;
  }

  private classifyGesture(landmarks: HandLandmark[], rawLandmarks?: readonly HandLandmark[]): Gesture {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    if (!wrist || !thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) {
      return 'point'; // Default to point, not palm
    }

    const boundingDiagonal = this.boundingDiagonal(landmarks);
    const pinchDistance = this.normalizedDistance(thumbTip, indexTip, boundingDiagonal);
    const curlDistances = [indexTip, middleTip, ringTip, pinkyTip]
      .map(tip => this.normalizedDistance(tip, wrist, boundingDiagonal));
    const averageCurl = curlDistances.reduce((sum, distance) => sum + distance, 0) / curlDistances.length;

    if (rawLandmarks && rawLandmarks[0] && rawLandmarks[4] && rawLandmarks[8] && rawLandmarks[12] && rawLandmarks[16] && rawLandmarks[20]) {
      const rawDiagonal = this.boundingDiagonal(rawLandmarks as HandLandmark[]);
      const rawPinch = this.normalizedDistance(rawLandmarks[4], rawLandmarks[8], rawDiagonal);
      const rawCurl = [rawLandmarks[8], rawLandmarks[12], rawLandmarks[16], rawLandmarks[20]]
        .map(tip => this.normalizedDistance(tip, rawLandmarks[0], rawDiagonal))
        .reduce((sum, distance) => sum + distance, 0) / 4;

      // Check FIST before PINCH - fist naturally closes thumb+index but all fingers are curled
      if (rawCurl <= this.gestureConfig.fistThreshold) {
        return 'fist';
      }

      if (rawPinch <= this.gestureConfig.pinchThreshold) {
        return 'pinch';
      }
    }

    // Check FIST before PINCH - fist naturally closes thumb+index but all fingers are curled
    if (averageCurl <= this.gestureConfig.fistThreshold) {
      return 'fist';
    }

    if (pinchDistance <= this.gestureConfig.pinchThreshold) {
      return 'pinch';
    }

    // EXPLICIT PALM DETECTION:
    // Palm requires ALL fingers to be extended (far from wrist)
    // and fingers spread apart (not bunched together)
    const palmExtensionThreshold = 0.55; // Fingers must be > 55% of diagonal from wrist
    const allFingersExtended = curlDistances.every(d => d >= palmExtensionThreshold);

    // Check that thumb is also extended away from index (spread hand)
    const thumbSpread = this.normalizedDistance(thumbTip, indexTip, boundingDiagonal) >= 0.15;

    if (allFingersExtended && thumbSpread) {
      return 'palm';
    }

    // Default to 'point' (normal aiming gesture)
    return 'point';
  }

  private boundingDiagonal(landmarks: HandLandmark[]): number {
    const xs = landmarks.map(l => l.x);
    const ys = landmarks.map(l => l.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return Math.max(Math.hypot(maxX - minX, maxY - minY), Number.EPSILON);
  }

  private normalizedDistance(a: HandLandmark, b: HandLandmark, diagonal: number): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / diagonal;
  }

  private toCursor(landmark: HandLandmark, handedness: string): { x: number; y: number } {
    return this.getMapper(handedness).toCursor({ x: landmark.x, y: landmark.y });
  }

  private isStable(cursor: { x: number; y: number }, rawCursor: { x: number; y: number }): boolean {
    if (!this.lastCursor || !this.lastRawCursor) return true;
    const smoothedDistance = Math.hypot(cursor.x - this.lastCursor.x, cursor.y - this.lastCursor.y);
    const rawDistance = Math.hypot(rawCursor.x - this.lastRawCursor.x, rawCursor.y - this.lastRawCursor.y);
    const tolerance = this.virtualPad.stabilityTolerance;
    return smoothedDistance <= tolerance && rawDistance <= tolerance * 1.5;
  }
}

export type { Gesture };
