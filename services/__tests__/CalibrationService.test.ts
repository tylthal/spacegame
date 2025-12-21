import { describe, expect, it } from 'vitest';
import { CALIBRATION_HOLD_TIME_MS } from '../../config/constants';
import { CalibrationService } from '../CalibrationService';

describe('CalibrationService', () => {
  it('tracks progress while pinching and updates the calibration point when complete', () => {
    const service = new CalibrationService();

    const startPoint = service.getCalibrationPoint();
    expect(startPoint).toEqual({ x: 0.5, y: 0.5 });

    const begin = service.update(true, { x: 0.2, y: 0.3 }, 0);
    expect(begin.progress).toBe(0);
    expect(begin.completed).toBe(false);

    const halfway = service.update(true, { x: 0.2, y: 0.3 }, CALIBRATION_HOLD_TIME_MS / 2);
    expect(halfway.progress).toBeGreaterThan(0);
    expect(halfway.completed).toBe(false);

    const finish = service.update(true, { x: 0.2, y: 0.3 }, CALIBRATION_HOLD_TIME_MS + 1);
    expect(finish.completed).toBe(true);
    expect(finish.point).toEqual({ x: 0.2, y: 0.3 });

    const reset = service.update(false, null, CALIBRATION_HOLD_TIME_MS + 50);
    expect(reset.progress).toBe(0);
    expect(reset.completed).toBe(false);
  });
});
