import { HandFrame, HandLandmark, HandTracker } from './HandTracker';
import { OneEuroConfig, OneEuroFilter } from './OneEuroFilter';

type Gesture = 'pinch' | 'fist' | 'palm';

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

export interface ProcessedHandEvent {
  raw: HandFrame;
  gesture: Gesture;
  smoothedLandmarks: HandLandmark[];
  cursor: { x: number; y: number };
  stable: boolean;
}

const DEFAULT_VIRTUAL_PAD: VirtualMousepadConfig = {
  origin: { x: 0.05, y: 0.05 },
  width: 0.9,
  height: 0.9,
  stabilityTolerance: 0.01,
};

const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  pinchThreshold: 0.05,
  fistThreshold: 0.16,
  dCutoff: 1,
  minCutoff: 1.2,
  beta: 0.002,
};

interface AxisFilters {
  x: OneEuroFilter;
  y: OneEuroFilter;
  z: OneEuroFilter;
}

export class InputProcessor {
  private listeners = new Set<(event: ProcessedHandEvent) => void>();
  private unsubscribeTracker?: () => void;
  private axisFilters = new Map<string, AxisFilters>();
  private lastCursor?: { x: number; y: number };
  private lastRawCursor?: { x: number; y: number };
  private readonly gestureConfig: GestureConfig;
  private readonly virtualPad: VirtualMousepadConfig;
  private calibrationOffsetX = 0; // The 'zero point' X offset (0.0 to 1.0)
  private calibrationOffsetY = 0; // The 'zero point' Y offset (0.0 to 1.0)

  constructor(
    tracker: HandTracker,
    options?: Partial<{ gesture: Partial<GestureConfig>; virtualPad: Partial<VirtualMousepadConfig> }>,
  ) {
    this.gestureConfig = { ...DEFAULT_GESTURE_CONFIG, ...options?.gesture };
    this.virtualPad = { ...DEFAULT_VIRTUAL_PAD, ...options?.virtualPad } as VirtualMousepadConfig;

    this.unsubscribeTracker = tracker.subscribe(frame => this.handleFrame(frame));
  }

  setCalibration(offset: { x: number; y: number }): void {
    this.calibrationOffsetX = offset.x;
    this.calibrationOffsetY = offset.y;
    console.log(`[Input] Calibrated Zero Point: X=${offset.x.toFixed(3)}, Y=${offset.y.toFixed(3)}`);
  }

  dispose(): void {
    this.unsubscribeTracker?.();
    this.listeners.clear();
  }

  subscribe(listener: (event: ProcessedHandEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleFrame(frame: HandFrame): void {
    const smoothedLandmarks = frame.landmarks.map((landmark, index) => this.smoothLandmark(frame, index, landmark));
    const cursor = this.toCursor(smoothedLandmarks[8] ?? smoothedLandmarks[0]);
    const rawCursor = this.toCursor(frame.landmarks[8] ?? frame.landmarks[0]);
    const gesture = this.classifyGesture(smoothedLandmarks, frame.landmarks);
    const stable = this.isStable(cursor, rawCursor);
    this.lastCursor = cursor;
    this.lastRawCursor = rawCursor;

    const event: ProcessedHandEvent = {
      raw: frame,
      gesture,
      smoothedLandmarks,
      cursor,
      stable,
    };

    this.listeners.forEach(listener => listener(event));
  }

  private getFilterKey(frame: HandFrame, index: number): string {
    return `${frame.handedness}-${index}`;
  }

  private smoothLandmark(frame: HandFrame, index: number, landmark: HandLandmark): HandLandmark {
    const key = this.getFilterKey(frame, index);
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
      return 'palm';
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

      if (rawPinch <= this.gestureConfig.pinchThreshold) {
        return 'pinch';
      }

      if (rawCurl <= this.gestureConfig.fistThreshold) {
        return 'fist';
      }
    }

    if (pinchDistance <= this.gestureConfig.pinchThreshold) {
      return 'pinch';
    }

    if (averageCurl <= this.gestureConfig.fistThreshold) {
      return 'fist';
    }

    return 'palm';
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

  private toCursor(landmark: HandLandmark): { x: number; y: number } {
    // 1. Normalize to Virtual Pad (0..1)
    let relativeX = (landmark.x - this.virtualPad.origin.x) / this.virtualPad.width;
    let relativeY = (landmark.y - this.virtualPad.origin.y) / this.virtualPad.height;

    // 2. Apply Calibration Offset (both axes)
    // If calibrationOffset is 0.5 (center), and input is 0.5, result should be 0.5 (center).
    // The Game expects 0..1 range.
    // We want the user's "natural center" to map to 0.5 output.
    // output = input - calibrationOffset + 0.5
    relativeX = relativeX - this.calibrationOffsetX + 0.5;
    relativeY = relativeY - this.calibrationOffsetY + 0.5;

    return {
      x: Math.min(Math.max(relativeX, 0), 1),
      y: Math.min(Math.max(relativeY, 0), 1),
    };
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
