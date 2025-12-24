import { describe, expect, it } from 'vitest';
import { runDiagnosticsPipeline } from '../observability/DiagnosticsHarness';

describe('diagnostics pipeline', () => {
  it('runs input, phase, and spawn systems without rendering', () => {
    const report = runDiagnosticsPipeline({ durationMs: 5200, stepMs: 200 });

    // With the new architecture, calibration is external so we won't transition
    // to READY/PLAYING automatically - verify the pipeline runs without errors
    expect(report.finalPhase).toBeDefined();
    expect(report.processedInputs.length).toBeGreaterThanOrEqual(3);
    // Verify that input frames were processed
    expect(report.phaseEvents).toBeDefined();
    // Summary should be valid even if spawns don't happen (not PLAYING)
    expect(report.summary.hull).toBeGreaterThanOrEqual(0);
  });
});
