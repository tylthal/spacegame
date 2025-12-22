import { PerfTracer, perfTracer as defaultTracer } from '../telemetry/PerfTracer';

export type FrameHook = (context: FrameContext) => void;

export interface FrameHooks {
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

interface GameLoopOptions {
  targetFps?: number;
  debugPerf?: boolean;
  telemetryEnabled?: boolean;
  perfLogInterval?: number;
  perfWindow?: number;
  tracer?: PerfTracer;
}

/**
 * GameLoop centralizes RAF scheduling, delta calculation, and profiling.
 * Callbacks are invoked sequentially per frame with a shared timing context.
 */
export class GameLoop {
  private hooks: FrameHooks;
  private readonly frameInterval: number;
  private readonly tracer: PerfTracer;
  private running = false;
  private rafId = 0;
  private lastFrameTime = 0;

  constructor(hooks: FrameHooks, options: GameLoopOptions = {}) {
    this.hooks = hooks;
    const targetFps = options.targetFps ?? 60;
    this.frameInterval = 1000 / targetFps;
    const requestedEnabled = options.telemetryEnabled ?? options.debugPerf;
    const baseTracer = options.tracer ?? defaultTracer;
    const shouldRebuild =
      !options.tracer &&
      (typeof requestedEnabled === 'boolean' ||
        typeof options.perfLogInterval === 'number' ||
        typeof options.perfWindow === 'number');

    this.tracer = shouldRebuild
      ? PerfTracer.create({
          enabled: requestedEnabled ?? baseTracer.isEnabled(),
          logInterval: options.perfLogInterval,
          frameWindow: options.perfWindow,
        })
      : baseTracer;
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

    const inputStart = this.tracer.startSpan('input');
    this.hooks.input?.(context);
    this.tracer.endSpan('input', inputStart);

    const logicStart = this.tracer.startSpan('logic');
    this.hooks.particles?.(context);
    this.hooks.simulation?.(context);
    this.tracer.endSpan('logic', logicStart);

    const renderStart = this.tracer.startSpan('render');
    this.hooks.render?.(context);
    this.tracer.endSpan('render', renderStart);

    this.tracer.finalizeFrame();

    this.rafId = requestAnimationFrame(this.tick);
  };
}
