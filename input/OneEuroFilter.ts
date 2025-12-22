export interface OneEuroConfig {
  minCutoff: number;
  beta: number;
  dCutoff: number;
}

const TWO_PI = 2 * Math.PI;

function smoothingFactor(timeDelta: number, cutoff: number): number {
  const r = TWO_PI * cutoff * timeDelta;
  return r / (r + 1);
}

export class OneEuroFilter {
  private lastValue: number | undefined;
  private lastTimestamp: number | undefined;
  private lastDerivation: number | undefined;

  constructor(private readonly config: OneEuroConfig) {}

  filter(value: number, timestampMs: number): number {
    if (this.lastValue === undefined || this.lastTimestamp === undefined) {
      this.lastValue = value;
      this.lastTimestamp = timestampMs;
      this.lastDerivation = 0;
      return value;
    }

    const dt = Math.max((timestampMs - this.lastTimestamp) / 1000, Number.EPSILON);
    const dx = (value - this.lastValue) / dt;
    const alphaD = smoothingFactor(dt, this.config.dCutoff);
    const dHat = alphaD * dx + (1 - alphaD) * (this.lastDerivation ?? dx);

    const cutoff = this.config.minCutoff + this.config.beta * Math.abs(dHat);
    const alpha = smoothingFactor(dt, cutoff);
    const filtered = alpha * value + (1 - alpha) * this.lastValue;

    this.lastValue = filtered;
    this.lastTimestamp = timestampMs;
    this.lastDerivation = dHat;

    return filtered;
  }
}
