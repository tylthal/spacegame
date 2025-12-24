import { describe, expect, it } from 'vitest';
import { InputProcessor } from '../input/InputProcessor';
import { InMemoryHandTracker, FrameResult } from '../input/HandTracker';
import { fistFrame, jitteredOpenPalm, openPalmFrame, pinchFrame } from '../input/fixtures/handFrames';

// Helper to wrap HandFrame in FrameResult format
const toFrameResult = (frame: typeof openPalmFrame): FrameResult => ({
  timestamp: frame.timestamp,
  hands: [frame],
});

describe('InputProcessor', () => {
  it('classifies pinch, fist, and palm gestures deterministically', () => {
    const tracker = new InMemoryHandTracker();
    const processor = new InputProcessor(tracker);
    const gestures: string[] = [];

    processor.subscribe(event => gestures.push(event.gesture));

    tracker.emit(toFrameResult(openPalmFrame));
    tracker.emit(toFrameResult(pinchFrame));
    tracker.emit(toFrameResult(fistFrame));

    expect(gestures).toEqual(['palm', 'pinch', 'fist']);
    processor.dispose();
  });

  it('smooths jitter while keeping cursor movement within the virtual pad', () => {
    const tracker = new InMemoryHandTracker();
    const processor = new InputProcessor(tracker, {
      gesture: { minCutoff: 1.2, beta: 0.004 },
      virtualPad: { stabilityTolerance: 0.02 },
    });

    const cursorPositions: { x: number; y: number }[] = [];
    processor.subscribe(event => cursorPositions.push(event.cursor));

    tracker.emit(toFrameResult(openPalmFrame));
    tracker.emit(toFrameResult(jitteredOpenPalm(0.06, 8)));
    tracker.emit(toFrameResult(jitteredOpenPalm(-0.04, 16)));

    expect(cursorPositions[0].x).toBeGreaterThan(0);
    expect(cursorPositions[0].x).toBeLessThanOrEqual(1);

    const rawDelta = 0.06; // raw x jitter we injected
    const filteredDelta = Math.abs(cursorPositions[1].x - cursorPositions[0].x);
    expect(filteredDelta).toBeLessThan(rawDelta);

    const recoveryDelta = Math.abs(cursorPositions[2].x - cursorPositions[1].x);
    expect(recoveryDelta).toBeLessThanOrEqual(rawDelta);

    processor.dispose();
  });

  it('marks frames as stable when cursor drift is below the tolerance', () => {
    const tracker = new InMemoryHandTracker();
    const processor = new InputProcessor(tracker, {
      virtualPad: { stabilityTolerance: 0.015 },
    });

    const stability: boolean[] = [];
    processor.subscribe(event => stability.push(event.stable));

    tracker.emit(toFrameResult(openPalmFrame));
    tracker.emit(toFrameResult(jitteredOpenPalm(0.005, 12)));

    expect(stability[0]).toBe(true);
    expect(stability[1]).toBe(true);

    tracker.emit(toFrameResult(jitteredOpenPalm(0.05, 24)));

    expect(stability[2]).toBe(false);
    processor.dispose();
  });
});
