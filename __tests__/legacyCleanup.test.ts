import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const legacyPaths = [
  'components/CalibrationGuide.tsx',
  'components/GameScene.tsx',
  'components/SceneOverlays.tsx',
  'components/WebcamFeed.tsx',
  'components/ui',
  'services',
  'systems',
  'telemetry',
  'utils',
  'config/constants.ts',
  'types.ts',
];

describe('Legacy quarantine', () => {
  it.each(legacyPaths)('%s has been removed from the new base', relativePath => {
    const fullPath = join(repoRoot, relativePath);
    expect(existsSync(fullPath)).toBe(false);
  });
});
