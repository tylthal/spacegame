import { CALIBRATION_HOLD_TIME_MS } from '../config/constants';

type CalibrationPoint = { x: number; y: number };

/**
 * CalibrationService
 * -------------------
 * Owns the zero-point anchor for hand aiming along with the hold-to-calibrate flow.
 * Keeps the timers and progress tracking isolated from the render loop so it can be
 * unit tested without Three.js context.
 */
export class CalibrationService {
  private point: CalibrationPoint = { x: 0.5, y: 0.5 };
  private holdStart = -1;
  private progress = 0;

  getCalibrationPoint(): CalibrationPoint {
    return { ...this.point };
  }

  resetHold(): void {
    this.holdStart = -1;
    this.progress = 0;
  }

  /**
   * update
   * Drives the calibration hold timer. When completed, updates the zero-point using
   * the provided fingertip coordinate.
   */
  update(isPinching: boolean, tip: { x: number; y: number } | null, now: number) {
    if (!isPinching || !tip) {
      this.resetHold();
      return { progress: 0, completed: false, point: this.getCalibrationPoint() };
    }

    if (this.holdStart < 0) this.holdStart = now;

    const elapsed = now - this.holdStart;
    this.progress = Math.min(elapsed / CALIBRATION_HOLD_TIME_MS, 1.0);

    if (this.progress >= 1) {
      this.point = { x: tip.x, y: tip.y };
      this.resetHold();
      return { progress: 1, completed: true, point: this.getCalibrationPoint() };
    }

    return { progress: this.progress, completed: false, point: this.getCalibrationPoint() };
  }
}

export default CalibrationService;
