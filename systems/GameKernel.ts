import { FrameContext, FrameHooks, GameLoop } from './GameLoop';

export interface LoopAdapter {
  start(): void;
  stop(): void;
  updateHooks(hooks: FrameHooks): void;
}

export interface GameSystem {
  id: string;
  tick: (context: FrameContext) => void;
}

export interface KernelDependencies {
  systems?: GameSystem[];
  loopFactory?: (hooks: FrameHooks) => LoopAdapter;
}

export class GameKernel {
  private loop: LoopAdapter;
  private systems = new Map<string, GameSystem>();

  constructor({ systems = [], loopFactory }: KernelDependencies = {}) {
    const initialHooks = this.createHooks();
    this.loop = (loopFactory ?? (hooks => new GameLoop(hooks)))(initialHooks);
    systems.forEach(system => this.registerSystem(system));
  }

  start() {
    this.loop.start();
  }

  stop() {
    this.loop.stop();
  }

  registerSystem(system: GameSystem) {
    this.systems.set(system.id, system);
    this.loop.updateHooks(this.createHooks());
  }

  removeSystem(systemId: string) {
    this.systems.delete(systemId);
    this.loop.updateHooks(this.createHooks());
  }

  private createHooks(): FrameHooks {
    return {
      simulation: this.dispatchSystems,
    };
  }

  private dispatchSystems = (context: FrameContext) => {
    this.systems.forEach(system => system.tick(context));
  };
}
