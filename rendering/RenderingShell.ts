import { Camera, Clock, Light, Renderer, SceneNode, Starfield } from './SceneGraph';

export interface SceneShellOptions {
  starCount?: number;
}

export class RenderingShell {
  readonly scene: SceneNode;
  readonly camera: Camera;
  readonly starfield: Starfield;
  readonly lights: Light[];

  private lastTimestamp: number;

  constructor(private readonly renderer: Renderer, private readonly clock: Clock, options: SceneShellOptions = {}) {
    this.scene = new SceneNode('root');
    this.camera = new Camera('main-camera');
    this.starfield = new Starfield(options.starCount ?? 240);
    this.lights = [new Light('key-light', 'key'), new Light('fill-light', 'fill')];

    this.scene.add(this.camera);
    this.scene.add(this.starfield);
    this.lights.forEach(light => this.scene.add(light));

    this.lastTimestamp = this.clock.now();
  }

  attach(node: SceneNode): void {
    this.scene.add(node);
  }

  detach(node: SceneNode): void {
    this.scene.remove(node);
  }

  frame(): { timestamp: number; delta: number } {
    const timestamp = this.clock.now();
    const delta = Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;

    this.renderer.render(this.scene, this.camera);

    return { timestamp, delta };
  }
}
