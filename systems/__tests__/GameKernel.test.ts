import { describe, expect, it, vi } from 'vitest';
import { FrameContext, FrameHooks } from '../GameLoop';
import { GameKernel, GameSystem, LoopAdapter } from '../GameKernel';

class FakeLoop implements LoopAdapter {
  hooks: FrameHooks;
  startCalls = 0;
  stopCalls = 0;

  constructor(hooks: FrameHooks) {
    this.hooks = hooks;
  }

  start(): void {
    this.startCalls += 1;
  }

  stop(): void {
    this.stopCalls += 1;
  }

  updateHooks(hooks: FrameHooks): void {
    this.hooks = hooks;
  }

  runOnce(context: FrameContext) {
    this.hooks.simulation?.(context);
  }
}

describe('GameKernel', () => {
  const createKernel = (systems: GameSystem[] = []) => {
    const loop = new FakeLoop({});
    const kernel = new GameKernel({
      systems,
      loopFactory: hooks => {
        loop.updateHooks(hooks);
        return loop;
      },
    });

    return { kernel, loop };
  };

  it('dispatches ticks to registered systems', () => {
    const tickA = vi.fn();
    const tickB = vi.fn();
    const { kernel, loop } = createKernel();
    const context: FrameContext = { deltaMs: 16, now: 100, timeScale: 1 };

    kernel.registerSystem({ id: 'physics', tick: tickA });
    kernel.registerSystem({ id: 'ai', tick: tickB });

    loop.runOnce(context);

    expect(tickA).toHaveBeenCalledWith(context);
    expect(tickB).toHaveBeenCalledWith(context);
  });

  it('controls the injected loop lifecycle', () => {
    const { kernel, loop } = createKernel();

    kernel.start();
    kernel.stop();

    expect(loop.startCalls).toBe(1);
    expect(loop.stopCalls).toBe(1);
  });
});
