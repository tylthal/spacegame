/**
 * OneEuroFilter
 * A jitter-reduction filter designed for real-time tracking (human interface devices).
 * It minimizes lag (latency) while smoothing out high-frequency noise (jitter).
 * 
 * Algorithm by Gery Casiez, Nicolas Roussel, and Daniel Vogel.
 */
export class OneEuroFilter {
  private firstTime = true;
  private xPrev = 0;
  private dxPrev = 0;
  private lastTime = 0;

  constructor(
    private minCutoff: number = 0.5, // Minimum cutoff frequency
    private beta: number = 0.05,     // Speed coefficient
    private dCutoff: number = 1.0    // Cutoff for the derivative
  ) {}

  /**
   * alpha
   * Computes the smoothing factor based on cutoff frequency and time delta.
   */
  private alpha(cutoff: number, dt: number): number {
    const r = 2 * Math.PI * cutoff * dt;
    return r / (r + 1);
  }

  /**
   * filter
   * Applies the filter to a value.
   * @param value The noisy input value.
   * @param timestamp Current timestamp in milliseconds.
   */
  filter(value: number, timestamp: number): number {
    if (this.firstTime) {
      this.firstTime = false;
      this.xPrev = value;
      this.lastTime = timestamp;
      return value;
    }
    const dt = (timestamp - this.lastTime) / 1000;
    if (dt <= 0) return this.xPrev;
    
    const dValue = (value - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dx = dValue * aD + this.dxPrev * (1 - aD);
    this.dxPrev = dx;
    
    const cutoff = this.minCutoff + this.beta * Math.abs(dx);
    const a = this.alpha(cutoff, dt);
    
    const x = value * a + this.xPrev * (1 - a);
    this.xPrev = x;
    this.lastTime = timestamp;
    return x;
  }
}
