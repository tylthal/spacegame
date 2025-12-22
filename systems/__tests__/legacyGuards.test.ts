import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');

const legacyModules = [
  'components/LiquidMetalScene.tsx',
  'components/WebcamOverlay.tsx',
  'services/handTracking.ts',
];

const bannedImportTokens = [
  'components/LiquidMetalScene',
  'components/WebcamOverlay',
  'services/handTracking',
];

const allowedSourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ignoredDirectories = new Set(['node_modules', '.git', '.vite', 'dist', 'coverage']);
const ignoredFiles = new Set(['legacyGuards.test.ts']);

function collectSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (ignoredDirectories.has(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(fullPath);
    }
    if (!allowedSourceExtensions.has(path.extname(entry.name))) return [];
    if (ignoredFiles.has(entry.name)) return [];
    return [fullPath];
  });
}

describe('Legacy quarantine', () => {
  it('removes known legacy entry points', () => {
    legacyModules.forEach(modulePath => {
      const fullPath = path.join(repoRoot, modulePath);
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });

  it('prevents imports of deleted legacy modules', () => {
    const sourceFiles = collectSourceFiles(repoRoot);
    const offenders = sourceFiles.filter(file => {
      const contents = fs.readFileSync(file, 'utf8');
      return bannedImportTokens.some(token => contents.includes(token));
    });

    expect(offenders).toEqual([]);
  });
});
