
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandFrame, HandTracker, Handedness, FrameResult } from '../../input/HandTracker';

// P3 Optimization: Adaptive frame rate based on tracking state
const FAST_INTERVAL_MS = 33;   // ~30fps - used when hands lost or just acquired
const SLOW_INTERVAL_MS = 50;   // ~20fps - used when tracking is stable

// Transition thresholds
const STABLE_FRAMES_THRESHOLD = 10; // After 10 consecutive frames with hands, slow down
const LOST_TIMEOUT_MS = 200;         // After 200ms without hands, stay fast

export class BrowserHandTracker implements HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private listeners = new Set<(frame: FrameResult) => void>();
  private lastVideoTime = -1;

  // P3: Adaptive rate state
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentInterval = FAST_INTERVAL_MS;
  private consecutiveFramesWithHands = 0;
  private lastHandsDetectedTime = 0;

  constructor() { }

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.video = videoElement;

    // Load WASM assets from CDN
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2, // Support dual-hand calibration
      // Increased confidence thresholds to reduce false positives from background
      minHandDetectionConfidence: 0.7,  // Default 0.5 - higher = more certain detection
      minHandPresenceConfidence: 0.7,   // Default 0.5 - track only when hand clearly visible
      minTrackingConfidence: 0.7,       // Default 0.5 - require stable tracking between frames
    });

    this.startLoop();
  }

  private startLoop() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processFrame(), this.currentInterval);
  }

  // P3: Dynamically adjust interval based on tracking state
  private adjustInterval(handsDetected: boolean) {
    const now = performance.now();

    if (handsDetected) {
      this.consecutiveFramesWithHands++;
      this.lastHandsDetectedTime = now;

      // After stable tracking, slow down to save power
      if (this.consecutiveFramesWithHands >= STABLE_FRAMES_THRESHOLD &&
        this.currentInterval !== SLOW_INTERVAL_MS) {
        this.setInterval(SLOW_INTERVAL_MS);
      }
    } else {
      this.consecutiveFramesWithHands = 0;

      // Hands lost - switch to fast detection
      if (this.currentInterval !== FAST_INTERVAL_MS) {
        this.setInterval(FAST_INTERVAL_MS);
      }
    }
  }

  private setInterval(newInterval: number) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.currentInterval = newInterval;
    this.intervalId = setInterval(() => this.processFrame(), this.currentInterval);
  }

  private processFrame() {
    if (!this.handLandmarker || !this.video) return;

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const startTimeMs = performance.now();

      const result = this.handLandmarker.detectForVideo(this.video, startTimeMs);
      const hands: HandFrame[] = [];

      if (result.landmarks && result.landmarks.length > 0) {
        // Iterate over all detected hands
        for (let i = 0; i < result.landmarks.length; i++) {
          const landmarks = result.landmarks[i];
          const handednessStr = result.handedness[i][0].displayName;

          // Normalize handedness string
          // Swap Handedness because camera is mirrored vs MediaPipe expectation
          const handedness = (handednessStr === 'Left' || handednessStr === 'Right')
            ? (handednessStr === 'Left' ? 'Right' : 'Left')
            : 'Right';

          const frame: HandFrame = {
            timestamp: startTimeMs,
            handedness: handedness,
            // Invert X because camera is mirrored (CSS transform scaleX(-1))
            // This ensures that:
            // - Real Right Hand (Screen Right side) -> x > 0.5
            // - Real Left Hand (Screen Left side) -> x < 0.5
            landmarks: landmarks.map(l => ({ x: 1 - l.x, y: l.y, z: l.z }))
          };
          hands.push(frame);
        }
      }

      // P3: Adjust frame rate based on tracking state
      this.adjustInterval(hands.length > 0);

      // Always emit a frame result, even if empty (for stability checks)
      this.emit({ timestamp: startTimeMs, hands });
    }
  }

  subscribe(handler: (frame: FrameResult) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(frame: FrameResult) {
    this.listeners.forEach(l => l(frame));
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.handLandmarker?.close();
  }
}
