import { describe, expect, it } from 'vitest';
import { runDiagnosticsPipeline } from '../observability/DiagnosticsHarness';

describe('diagnostics pipeline', () => {
  it('runs input, phase, and spawn systems without rendering', () => {
    const report = runDiagnosticsPipeline({ durationMs: 5200, stepMs: 200 });

    const transitions = report.phaseEvents.filter(event => event.type === 'transition');
    const transitionTargets = transitions.map(event => event.to);

    expect(transitionTargets).toContain('READY');
    expect(transitionTargets).toContain('PLAYING');
    expect(report.spawns.length).toBeGreaterThan(0);
    expect(report.summary.hull).toBeGreaterThanOrEqual(0);
    expect(Object.values(report.summary.spawns).some(count => count > 0)).toBe(true);
    expect(report.processedInputs.length).toBeGreaterThanOrEqual(3);
  });
});
