import { describe, expect, it } from 'vitest';
import { DEFAULT_PHASE_GUARDS, PhaseEvent, PhaseManager } from '../phase/PhaseManager';

const GUARDS = {
  ...DEFAULT_PHASE_GUARDS,
  requiredCalibrationStableMs: 400,
  pauseHoldMs: 300,
  maxPlayTimeMs: 900,
  maxUnstableBeforeStartMs: 250,
};

describe('PhaseManager', () => {
  it('transitions from calibration to ready once stability time accrues', () => {
    const manager = new PhaseManager(GUARDS);
    const events: PhaseEvent[] = [];
    manager.subscribe(event => events.push(event));

    manager.ingest({ timestamp: 0, stable: true });
    manager.ingest({ timestamp: 150, stable: true });
    manager.ingest({ timestamp: 300, stable: false });
    manager.ingest({ timestamp: 450, stable: true });
    manager.ingest({ timestamp: 700, stable: true });

    expect(manager.phase).toBe('READY');
    expect(events).toContainEqual({
      type: 'transition',
      from: 'CALIBRATING',
      to: 'READY',
      reason: 'calibration-complete',
      at: 700,
    });
  });

  it('requires a recent stable sample and start gesture to enter PLAYING', () => {
    const manager = new PhaseManager(GUARDS);
    const events: PhaseEvent[] = [];
    manager.subscribe(event => events.push(event));

    manager.ingest({ timestamp: 0, stable: true });
    manager.ingest({ timestamp: 200, stable: true });
    manager.ingest({ timestamp: 400, stable: true });
    manager.ingest({ timestamp: 600, gesture: 'pinch' });

    expect(manager.phase).toBe('PLAYING');
    expect(events.at(-1)).toEqual({
      type: 'transition',
      from: 'READY',
      to: 'PLAYING',
      reason: 'start-gesture',
      at: 600,
    });

    const guardEvents: PhaseEvent[] = [];
    manager.subscribe(event => guardEvents.push(event));

    manager.reset(0);
    manager.ingest({ timestamp: 0, stable: true });
    manager.ingest({ timestamp: 200, stable: true });
    manager.ingest({ timestamp: 400, stable: true });
    manager.ingest({ timestamp: 900, gesture: 'pinch' });

    expect(manager.phase).toBe('READY');
    expect(guardEvents.at(-1)).toEqual({
      type: 'guard_rejected',
      from: 'READY',
      attempted: 'start',
      reason: 'stability gap exceeded before start',
      at: 900,
    });
  });

  it('moves into PAUSED after a held palm and resumes with a start gesture', () => {
    const manager = new PhaseManager(GUARDS);

    manager.ingest({ timestamp: 0, stable: true });
    manager.ingest({ timestamp: 200, stable: true });
    manager.ingest({ timestamp: 400, stable: true });
    manager.ingest({ timestamp: 700, gesture: 'pinch', stable: true });

    expect(manager.phase).toBe('PLAYING');

    manager.ingest({ timestamp: 800, gesture: 'palm', stable: true });
    manager.ingest({ timestamp: 1150, gesture: 'palm', stable: true });

    expect(manager.phase).toBe('PAUSED');

    manager.ingest({ timestamp: 1200, gesture: 'fist', stable: true });

    expect(manager.phase).toBe('PLAYING');
  });

  it('lands in GAMEOVER when playtime exceeds the configured limit', () => {
    const manager = new PhaseManager(GUARDS);
    const events: PhaseEvent[] = [];
    manager.subscribe(event => events.push(event));

    manager.ingest({ timestamp: 0, stable: true });
    manager.ingest({ timestamp: 200, stable: true });
    manager.ingest({ timestamp: 400, stable: true });
    manager.ingest({ timestamp: 600, gesture: 'pinch', stable: true });

    manager.ingest({ timestamp: 1100, gesture: 'palm', stable: true });
    manager.ingest({ timestamp: 1600, stable: true });

    expect(manager.phase).toBe('GAMEOVER');
    expect(events.at(-1)).toEqual({
      type: 'transition',
      from: 'PLAYING',
      to: 'GAMEOVER',
      reason: 'playtime-limit',
      at: 1600,
    });
  });

  it('rejects invalid end calls when not playing', () => {
    const manager = new PhaseManager(GUARDS);
    const guardEvents: PhaseEvent[] = [];
    manager.subscribe(event => guardEvents.push(event));

    manager.end('manual-end', 0);

    expect(manager.phase).toBe('CALIBRATING');
    expect(guardEvents.at(-1)).toEqual({
      type: 'guard_rejected',
      from: 'CALIBRATING',
      attempted: 'end',
      reason: 'cannot end when not playing',
      at: 0,
    });
  });
});
