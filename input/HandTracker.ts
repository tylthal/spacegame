export type Handedness = 'Left' | 'Right';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandFrame {
  /** Timestamp in milliseconds, matching the source camera clock. */
  timestamp: number;
  handedness: Handedness;
  landmarks: readonly HandLandmark[];
}

export interface HandTracker {
  /**
   * Subscribe to processed hand frames. Returns an unsubscribe function to detach the listener.
   */
  subscribe(handler: (frame: HandFrame) => void): () => void;
}

export class InMemoryHandTracker implements HandTracker {
  private listeners = new Set<(frame: HandFrame) => void>();

  subscribe(handler: (frame: HandFrame) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  emit(frame: HandFrame): void {
    this.listeners.forEach(listener => listener(frame));
  }
}
