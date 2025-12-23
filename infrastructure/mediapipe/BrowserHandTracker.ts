
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandFrame, HandTracker, HandLandmark, Handedness } from '../../input/HandTracker';

export class BrowserHandTracker implements HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private listeners = new Set<(frame: HandFrame) => void>();
  private requestAnimationFrameId: number | null = null;
  private lastVideoTime = -1;

  constructor() {}

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
      numHands: 1, // We only support single-hand play for now
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

      if (result.landmarks && result.landmarks.length > 0) {
        // Map MediaPipe result to our internal HandFrame
        // We only take the first hand
        const landmarks = result.landmarks[0];
        const handednessStr = result.handedness[0][0].displayName; 
        
        // Normalize handedness string if needed. MediaPipe returns "Left" or "Right" usually.
        // Note: MP front-facing camera often flips handedness (mirrored). 
        // We will pass it through as-is for now, consumers might need to invert if mirrored.
        
        const frame: HandFrame = {
            timestamp: startTimeMs,
            handedness: (handednessStr === 'Left' || handednessStr === 'Right') ? handednessStr : 'Right',
            landmarks: landmarks.map(l => ({ x: l.x, y: l.y, z: l.z }))
        };

        this.emit(frame);
      }
    }
  }

  subscribe(handler: (frame: HandFrame) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(frame: HandFrame) {
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
