export interface RandomSource {
  next(): number;
}

export class SeededRng implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    // LCG parameters from Numerical Recipes; produces reproducible 32-bit output.
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 2 ** 32;
  }
}
