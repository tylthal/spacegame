#!/usr/bin/env node
import { spawn } from 'node:child_process';

const port = process.env.SMOKE_PREVIEW_PORT ?? '4173';
const host = '127.0.0.1';
const url = `http://${host}:${port}/`;

const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '0.0.0.0', '--port', port], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, FORCE_COLOR: 'true' },
});
const previewExit = new Promise(resolve => preview.on('exit', resolve));

const shutdown = async () => {
  if (preview.exitCode !== null) return;
  preview.kill('SIGTERM');
  await Promise.race([
    previewExit,
    wait(2000).then(() => {
      if (preview.exitCode === null) {
        preview.kill('SIGKILL');
      }
    }),
  ]);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForPreview = async () => {
  const timeoutMs = 20000;
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    if (preview.exitCode !== null) {
      throw new Error(`Preview process exited early with code ${preview.exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        const body = await response.text();
        return body;
      }
      lastError = new Error(`Preview returned status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await wait(500);
  }

  throw new Error(`Preview did not become ready: ${lastError?.message ?? 'unknown error'}`);
};

const assertPageHealthy = (body) => {
  const hasRoot = body.includes('<div id="root"></div>') || body.includes('<div id="root">');
  const hasBundle = /<script[^>]+src=\"(?:\.\/)?assets\/index-[^\"]+\.js\"/i.test(body);

  if (!hasRoot || !hasBundle) {
    throw new Error('Smoke check failed: preview HTML did not include the root mount or bundle reference');
  }
};

const run = async () => {
  try {
    console.log(`Starting preview on ${url}...`);
    const body = await waitForPreview();
    assertPageHealthy(body);
    console.log('Smoke check passed: preview served the landing screen.');
    process.exitCode = 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await shutdown();
  }
};

run();
