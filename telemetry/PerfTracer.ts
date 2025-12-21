export type TelemetrySpan = 'input' | 'logic' | 'render' | 'hand-detect' | string;

interface PerfTracerOptions {
  enabled?: boolean;
  logInterval?: number;
  frameWindow?: number;
}

interface SpanWindow {
  durations: number[];
  total: number;
  min: number;
  max: number;
}

export interface SpanStats {
  average: number;
  min: number;
  max: number;
  samples: number;
}

/**
 * PerfTracer records named spans per frame and logs rolling statistics.
 * It is disabled automatically in production builds to avoid unnecessary overhead.
 */
export class PerfTracer {
  private readonly enabled: boolean;
  private readonly logInterval: number;
  private readonly frameWindow: number;
  private frameCount = 0;
  private spans: Record<string, SpanWindow> = {};

  constructor(options: PerfTracerOptions = {}) {
    const isProd = this.isProduction();
    const requestedEnabled = options.enabled ?? !isProd;
    this.enabled = requestedEnabled && !isProd;
    this.logInterval = options.logInterval ?? 60;
    this.frameWindow = options.frameWindow ?? 180;
  }

  static create(options: PerfTracerOptions = {}) {
    return new PerfTracer(options);
  }

  startSpan(name: TelemetrySpan): number | null {
    if (!this.enabled) return null;
    return performance.now();
  }

  endSpan(name: TelemetrySpan, startTime: number | null) {
    if (!this.enabled || startTime === null) return;
    const duration = performance.now() - startTime;
    this.pushSample(name, duration);
  }

  /**
   * Convenience wrapper that measures the runtime of a callback.
   */
  traceSpan<T>(name: TelemetrySpan, fn: () => T): T {
    const start = this.startSpan(name);
    const result = fn();
    this.endSpan(name, start);
    return result;
  }

  isEnabled() {
    return this.enabled;
  }

  finalizeFrame() {
    if (!this.enabled) return;
    this.frameCount++;
    if (this.frameCount % this.logInterval === 0) {
      this.logSpans();
    }
  }

  getStats(name: TelemetrySpan): SpanStats | null {
    const span = this.spans[name];
    if (!span || span.durations.length === 0) return null;
    return {
      average: span.total / span.durations.length,
      min: span.min,
      max: span.max,
      samples: span.durations.length,
    };
  }

  getAllStats(): Record<string, SpanStats> {
    const stats: Record<string, SpanStats> = {};
    for (const key of Object.keys(this.spans)) {
      const spanStats = this.getStats(key);
      if (spanStats) {
        stats[key] = spanStats;
      }
    }
    return stats;
  }

  private pushSample(name: TelemetrySpan, duration: number) {
    if (!this.spans[name]) {
      this.spans[name] = {
        durations: [],
        total: 0,
        min: Number.POSITIVE_INFINITY,
        max: 0,
      };
    }

    const span = this.spans[name];
    span.durations.push(duration);
    span.total += duration;
    span.min = Math.min(span.min, duration);
    span.max = Math.max(span.max, duration);

    if (span.durations.length > this.frameWindow) {
      const removed = span.durations.shift() as number;
      span.total -= removed;
      if (removed === span.min || removed === span.max) {
        span.min = Math.min(...span.durations);
        span.max = Math.max(...span.durations);
      }
    }
  }

  private logSpans() {
    const stats = this.getAllStats();
    const entries = Object.entries(stats);
    if (!entries.length) return;

    const summary = entries
      .map(([name, span]) =>
        `${name}: avg=${span.average.toFixed(2)}ms min=${span.min.toFixed(2)}ms max=${span.max.toFixed(2)}ms`,
      )
      .join(' | ');

    console.log(`[Telemetry] Rolling (${this.frameWindow} frames): ${summary}`);
  }

  private isProduction() {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return Boolean((import.meta as any).env.PROD);
    }
    if (typeof process !== 'undefined' && process.env && 'NODE_ENV' in process.env) {
      return process.env.NODE_ENV === 'production';
    }
    return false;
  }
}

export const perfTracer = new PerfTracer();
