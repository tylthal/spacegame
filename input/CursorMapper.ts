import { INPUT_CONFIG } from './inputConfig';

/**
 * Utility to clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * CursorMapper - Transforms raw hand positions to screen coordinates.
 * 
 * Implements the "virtual mousepad" strategy where a small region of
 * physical hand movement maps to the full screen.
 * 
 * Features:
 * - Calibration support (user's natural position = screen center)
 * - Configurable sensitivity via virtual pad size
 * - Axis inversion for webcam mirror correction
 * - Dead zone to prevent jitter when holding still
 */
export class CursorMapper {
    private calibrationOffset = { x: 0.5, y: 0.5 };
    private lastCursor = { x: 0.5, y: 0.5 };
    private readonly config = INPUT_CONFIG;

    /**
     * Set the calibration offset (user's natural center position)
     */
    setCalibration(offset: { x: number; y: number }): void {
        this.calibrationOffset = { ...offset };
    }

    /**
     * Get the current calibration offset
     */
    getCalibration(): { x: number; y: number } {
        return { ...this.calibrationOffset };
    }

    /**
     * Reset last cursor position (call when cursor becomes invisible)
     */
    resetLastPosition(): void {
        this.lastCursor = { x: 0.5, y: 0.5 };
    }

    /**
     * Transform raw hand position to screen coordinates (0-1).
     * 
     * The calibrated position maps to screen center (0.5, 0.5).
     * The virtual pad size determines sensitivity - smaller = more sensitive.
     * Includes dead zone to prevent jitter when holding still.
     * 
     * @param pos - Raw MediaPipe position (0 = left/top, 1 = right/bottom)
     * @returns Screen position (0-1), calibrated and scaled
     */
    toCursor(pos: { x: number; y: number }): { x: number; y: number } {
        const { width, height } = this.config.virtualPad;
        const { invertX, invertY } = this.config.axes;
        const deadZone = this.config.virtualPad.deadZone ?? 0.01;

        // Calculate offset from calibrated center
        const offsetX = pos.x - this.calibrationOffset.x;
        const offsetY = pos.y - this.calibrationOffset.y;

        // Scale by virtual pad size and apply inversion
        const xMultiplier = invertX ? -1 : 1;
        const yMultiplier = invertY ? -1 : 1;

        const scaledX = (xMultiplier * offsetX / width) + 0.5;
        const scaledY = (yMultiplier * offsetY / height) + 0.5;

        const newCursor = {
            x: clamp(scaledX, 0, 1),
            y: clamp(scaledY, 0, 1),
        };

        // Apply dead zone - ignore small movements to reduce jitter
        const deltaX = Math.abs(newCursor.x - this.lastCursor.x);
        const deltaY = Math.abs(newCursor.y - this.lastCursor.y);
        const totalDelta = Math.hypot(deltaX, deltaY);

        if (totalDelta < deadZone) {
            // Movement too small, keep last position
            return { ...this.lastCursor };
        }

        // Update last cursor and return new position
        this.lastCursor = newCursor;
        return newCursor;
    }

    /**
     * Transform a position for a specific virtual pad size (override default)
     * Useful for calibration screen which may want different sensitivity
     */
    toCursorWithSize(
        pos: { x: number; y: number },
        padSize: number
    ): { x: number; y: number } {
        const { invertX, invertY } = this.config.axes;
        const deadZone = this.config.virtualPad.deadZone ?? 0.01;

        const offsetX = pos.x - this.calibrationOffset.x;
        const offsetY = pos.y - this.calibrationOffset.y;

        const xMultiplier = invertX ? -1 : 1;
        const yMultiplier = invertY ? -1 : 1;

        const scaledX = (xMultiplier * offsetX / padSize) + 0.5;
        const scaledY = (yMultiplier * offsetY / padSize) + 0.5;

        const newCursor = {
            x: clamp(scaledX, 0, 1),
            y: clamp(scaledY, 0, 1),
        };

        // Apply dead zone
        const totalDelta = Math.hypot(
            Math.abs(newCursor.x - this.lastCursor.x),
            Math.abs(newCursor.y - this.lastCursor.y)
        );

        if (totalDelta < deadZone) {
            return { ...this.lastCursor };
        }

        this.lastCursor = newCursor;
        return newCursor;
    }
}

// Singleton instance for simple use cases
export const cursorMapper = new CursorMapper();
