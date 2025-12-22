import { describe, expect, it } from 'vitest';
import { describeConfig, resolveDebugConfig } from '../observability/DebugConfig';

describe('resolveDebugConfig', () => {
  it('parses boolean-ish strings', () => {
    const config = resolveDebugConfig({
      VITE_DEBUG_PANELS: 'true',
      VITE_TRACE_LOGGING: '0',
      VITE_DIAGNOSTICS_MODE: '1',
    });

    expect(config.debugPanels).toBe(true);
    expect(config.traceLogging).toBe(false);
    expect(config.diagnosticsMode).toBe(true);
  });

  it('falls back to disabled flags when missing', () => {
    const config = resolveDebugConfig({});

    expect(config.debugPanels).toBe(false);
    expect(config.traceLogging).toBe(false);
    expect(config.diagnosticsMode).toBe(false);
  });

  it('describes the resolved config in human-readable terms', () => {
    const lines = describeConfig({ debugPanels: true, traceLogging: false, diagnosticsMode: true });

    expect(lines).toContain('Debug panels enabled');
    expect(lines).toContain('Trace logging disabled');
    expect(lines).toContain('Diagnostics mode enabled');
  });
});
