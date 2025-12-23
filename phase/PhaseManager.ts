import type { Gesture } from '../input/InputProcessor';

export type Phase = 'TITLE' | 'CALIBRATING' | 'READY' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

type TransitionReason =
  | 'start-calibration'
  | 'calibration-complete'
  | 'start-gesture'
  | 'help-requested'
  | 'resume'
  | 'playtime-limit'
  | 'player-died'
  | 'manual-end'
  | 'reset';

type GuardedAction = 'start' | 'end' | 'help' | 'resume';

export interface PhaseSample {
  timestamp: number;
  stable?: boolean;
  gesture?: Gesture;
}

export interface PhaseGuards {
  requiredCalibrationStableMs: number;
  maxUnstableBeforeStartMs: number;
  pauseHoldMs: number;
  maxPlayTimeMs: number;
  startGestures: Gesture[];
  pauseGestures: Gesture[];
  resumeGestures: Gesture[];
}

export const DEFAULT_PHASE_GUARDS: PhaseGuards = {
  requiredCalibrationStableMs: 1200,
  maxUnstableBeforeStartMs: 750,
  pauseHoldMs: 800,
  maxPlayTimeMs: 120000,
  startGestures: ['pinch', 'fist'],
  pauseGestures: ['palm'],
  resumeGestures: ['pinch', 'fist'],
};

export type PhaseEvent =
  | { type: 'transition'; from: Phase; to: Phase; reason: TransitionReason; at: number }
  | { type: 'guard_rejected'; from: Phase; attempted: GuardedAction; reason: string; at: number };

export class PhaseManager {
  private state: Phase = 'TITLE';
  private listeners = new Set<(event: PhaseEvent) => void>();
  private calibrationStableMs = 0;
  private lastTimestamp?: number;
  private lastStableTimestamp?: number;
  private pauseHoldStartedAt?: number;
  private elapsedPlayMs = 0;

  constructor(private readonly guards: PhaseGuards = DEFAULT_PHASE_GUARDS) { }

  get phase(): Phase {
    return this.state;
  }

  get calibrationProgress(): number {
    return Math.min(1, this.calibrationStableMs / this.guards.requiredCalibrationStableMs);
  }



  subscribe(listener: (event: PhaseEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  startSession(): Phase {
    if (this.state === 'TITLE') {
      return this.transition('CALIBRATING', 'start-calibration', Date.now());
    }
    return this.state;
  }

  ingest(sample: PhaseSample): Phase {
    const timestamp = sample.timestamp;
    const delta = this.lastTimestamp !== undefined ? Math.max(0, timestamp - this.lastTimestamp) : 0;
    this.lastTimestamp = timestamp;

    const stable = sample.stable ?? false;
    if (stable) {
      this.lastStableTimestamp = timestamp;
    }

    if (this.state === 'PLAYING') {
      this.elapsedPlayMs += delta;
      if (this.elapsedPlayMs >= this.guards.maxPlayTimeMs) {
        return this.transition('GAMEOVER', 'playtime-limit', timestamp);
      }
    }

    // NOTE: Calibration transition is now handled by CalibrationScreen component
    // via its onComplete callback. We no longer auto-transition here.
    // The CalibrationScreen requires user to pinch-click a button to proceed.
    if (this.state === 'CALIBRATING') {
      // Still track stability for potential diagnostics, but don't auto-transition
      this.calibrationStableMs = stable ? this.calibrationStableMs + delta : 0;
      // Old auto-transition code (disabled):
      // if (this.calibrationStableMs >= this.guards.requiredCalibrationStableMs) {
      //   return this.transition('READY', 'calibration-complete', timestamp);
      // }
      return this.state;
    }

    if (this.state === 'READY') {
      if (sample.gesture && this.guards.startGestures.includes(sample.gesture)) {
        if (!this.lastStableTimestamp) {
          return this.reject('start', timestamp, 'no stable sample recorded');
        }
        if (timestamp - this.lastStableTimestamp > this.guards.maxUnstableBeforeStartMs) {
          return this.reject('start', timestamp, 'stability gap exceeded before start');
        }
        return this.transition('PLAYING', 'start-gesture', timestamp);
      }
      return this.state;
    }

    if (this.state === 'PLAYING') {
      if (sample.gesture && this.guards.pauseGestures.includes(sample.gesture)) {
        if (stable) {
          this.pauseHoldStartedAt ??= timestamp;
          if (timestamp - this.pauseHoldStartedAt >= this.guards.pauseHoldMs) {
            this.pauseHoldStartedAt = undefined;
            return this.transition('PAUSED', 'help-requested', timestamp);
          }
        } else {
          this.pauseHoldStartedAt = undefined;
        }
      } else {
        this.pauseHoldStartedAt = undefined;
      }
      return this.state;
    }

    if (this.state === 'PAUSED') {
      if (sample.gesture && this.guards.resumeGestures.includes(sample.gesture)) {
        return this.transition('PLAYING', 'resume', timestamp);
      }
      return this.state;
    }

    return this.state;
  }

  end(reason: 'player-died' | 'manual-end', timestamp: number): Phase {
    if (this.state !== 'PLAYING') {
      return this.reject('end', timestamp, 'cannot end when not playing');
    }
    return this.transition('GAMEOVER', reason, timestamp);
  }

  reset(timestamp = 0): Phase {
    const previous = this.state;
    this.state = 'TITLE';
    this.calibrationStableMs = 0;
    this.lastTimestamp = timestamp;
    this.lastStableTimestamp = undefined;
    this.pauseHoldStartedAt = undefined;
    this.elapsedPlayMs = 0;
    this.emit({ type: 'transition', from: previous, to: 'TITLE', reason: 'reset', at: timestamp });
    return this.state;
  }

  private transition(to: Phase, reason: TransitionReason, at: number): Phase {
    const from = this.state;
    if (from === to) return to;

    this.state = to;
    if (to === 'PLAYING') {
      this.elapsedPlayMs = 0;
      this.pauseHoldStartedAt = undefined;
    }
    if (to === 'READY') {
      this.calibrationStableMs = 0;
    }
    if (to === 'CALIBRATING') {
      this.lastStableTimestamp = undefined;
      this.calibrationStableMs = 0;
      this.elapsedPlayMs = 0;
      this.pauseHoldStartedAt = undefined;
    }

    this.emit({ type: 'transition', from, to, reason, at });
    return this.state;
  }

  private reject(attempted: GuardedAction, at: number, reason: string): Phase {
    this.emit({ type: 'guard_rejected', from: this.state, attempted, reason, at });
    return this.state;
  }

  private emit(event: PhaseEvent): void {
    this.listeners.forEach(listener => listener(event));
  }
}
