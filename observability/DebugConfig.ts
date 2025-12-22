export interface EnvSource {
  [key: string]: string | boolean | undefined;
}

export interface DebugConfig {
  debugPanels: boolean;
  traceLogging: boolean;
  diagnosticsMode: boolean;
}

const DEFAULT_KEYS = {
  debugPanels: ['VITE_DEBUG_PANELS', 'DEBUG_PANELS'],
  traceLogging: ['VITE_TRACE_LOGGING', 'TRACE_LOGGING'],
  diagnosticsMode: ['VITE_DIAGNOSTICS_MODE', 'DIAGNOSTICS_MODE'],
};

const TRUE_VALUES = new Set(['1', 'true', 'on', true]);

function toBoolean(value: string | boolean | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  return TRUE_VALUES.has(value.toLowerCase());
}

function readFirst(env: EnvSource, keys: string[]): string | boolean | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

export function resolveDebugConfig(env: EnvSource = detectEnv()): DebugConfig {
  return {
    debugPanels: toBoolean(readFirst(env, DEFAULT_KEYS.debugPanels)),
    traceLogging: toBoolean(readFirst(env, DEFAULT_KEYS.traceLogging)),
    diagnosticsMode: toBoolean(readFirst(env, DEFAULT_KEYS.diagnosticsMode)),
  };
}

export function detectEnv(): EnvSource {
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    return import.meta.env as EnvSource;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvSource;
  }
  return {};
}

export function describeConfig(config: DebugConfig): string[] {
  const lines = [] as string[];
  lines.push(config.debugPanels ? 'Debug panels enabled' : 'Debug panels disabled');
  lines.push(config.traceLogging ? 'Trace logging enabled' : 'Trace logging disabled');
  lines.push(config.diagnosticsMode ? 'Diagnostics mode enabled' : 'Diagnostics mode disabled');
  return lines;
}
