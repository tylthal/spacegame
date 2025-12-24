
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandFrame, HandTracker, HandLandmark, Handedness, FrameResult } from '../../input/HandTracker';

export class BrowserHandTracker implements HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private listeners = new Set<(frame: FrameResult) => void>();
  private requestAnimationFrameId: number | null = null;
  private lastVideoTime = -1;

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
    });

    this.startLoop();
  }

  private startLoop() {
    if (this.requestAnimationFrameId) return;

    const loop = () => {
      this.processFrame();
      this.requestAnimationFrameId = requestAnimationFrame(loop);
    };
    loop();
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
    if (this.requestAnimationFrameId) {
      cancelAnimationFrame(this.requestAnimationFrameId);
      this.requestAnimationFrameId = null;
    }
    this.handLandmarker?.close();
  }
}
