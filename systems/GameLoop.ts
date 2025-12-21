type FrameHook = (context: FrameContext) => void;

interface FrameHooks {
  input?: FrameHook;
  particles?: FrameHook;
  simulation?: FrameHook;
  render?: FrameHook;
}

export interface FrameContext {
  deltaMs: number;
  timeScale: number;
  now: number;
}

interface PerfTotals {
  frames: number;
  inputTime: number;
  particleTime: number;
  logicTime: number;
  renderTime: number;
  totalTime: number;
}

interface GameLoopOptions {
  targetFps?: number;
  debugPerf?: boolean;
  perfLogInterval?: number;
}

/**
 * GameLoop centralizes RAF scheduling, delta calculation, and profiling.
 * Callbacks are invoked sequentially per frame with a shared timing context.
 */
export class GameLoop {
  private hooks: FrameHooks;
  private readonly frameInterval: number;
  private readonly debugPerf: boolean;
  private readonly perfLogInterval: number;
  private running = false;
  private rafId = 0;
  private lastFrameTime = 0;
  private perfTotals: PerfTotals = {
    frames: 0,
    inputTime: 0,
    particleTime: 0,
    logicTime: 0,
    renderTime: 0,
    totalTime: 0,
  };

  constructor(hooks: FrameHooks, options: GameLoopOptions = {}) {
    this.hooks = hooks;
    const targetFps = options.targetFps ?? 60;
    this.frameInterval = 1000 / targetFps;
    this.debugPerf = options.debugPerf ?? false;
    this.perfLogInterval = options.perfLogInterval ?? 60;
  }

  updateHooks(nextHooks: FrameHooks) {
    this.hooks = nextHooks;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    if (!this.running) return;
    cancelAnimationFrame(this.rafId);
    this.running = false;
  }

  private tick = (time: number) => {
    if (!this.running) return;

    const delta = time - this.lastFrameTime;
    if (delta < this.frameInterval) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    this.lastFrameTime = time - (delta % this.frameInterval);
    const now = performance.now();
    const context: FrameContext = {
      deltaMs: delta,
      timeScale: Math.min(delta / this.frameInterval, 4.0),
      now,
    };

    let tStart = 0;
    let prev = 0;
    if (this.debugPerf) {
      tStart = performance.now();
      prev = tStart;
    }

    this.hooks.input?.(context);
    if (this.debugPerf) {
      const t = performance.now();
      this.perfTotals.inputTime += t - prev;
      prev = t;
    }

    this.hooks.particles?.(context);
    if (this.debugPerf) {
      const t = performance.now();
      this.perfTotals.particleTime += t - prev;
      prev = t;
    }

    this.hooks.simulation?.(context);
    if (this.debugPerf) {
      const t = performance.now();
      this.perfTotals.logicTime += t - prev;
      prev = t;
    }

    this.hooks.render?.(context);
    if (this.debugPerf) {
      const tEnd = performance.now();
      this.perfTotals.renderTime += tEnd - prev;
      this.perfTotals.totalTime += tEnd - tStart;
      this.perfTotals.frames++;
      this.maybeLogPerf();
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private maybeLogPerf() {
    if (!this.debugPerf) return;
    if (this.perfTotals.frames < this.perfLogInterval) return;

    const f = this.perfTotals.frames;
    console.log(
      `[PERF] Frame breakdown (${f} frames avg): ` +
        `Input: ${(this.perfTotals.inputTime / f).toFixed(2)}ms | ` +
        `Particles: ${(this.perfTotals.particleTime / f).toFixed(2)}ms | ` +
        `Logic: ${(this.perfTotals.logicTime / f).toFixed(2)}ms | ` +
        `Render: ${(this.perfTotals.renderTime / f).toFixed(2)}ms | ` +
        `TOTAL: ${(this.perfTotals.totalTime / f).toFixed(2)}ms`,
    );
    this.perfTotals = {
      frames: 0,
      inputTime: 0,
      particleTime: 0,
      logicTime: 0,
      renderTime: 0,
      totalTime: 0,
    };
  }
}
