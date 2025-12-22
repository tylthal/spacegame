export class SceneNode {
  readonly children: SceneNode[] = [];
  parent?: SceneNode;

  constructor(public readonly name: string) {}

  add(child: SceneNode): void {
    if (child.parent) {
      child.parent.remove(child);
    }
    this.children.push(child);
    child.parent = this;
  }

  remove(child: SceneNode): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parent = undefined;
    }
  }

  removeAll(): void {
    while (this.children.length) {
      const child = this.children.pop();
      if (child) {
        child.parent = undefined;
      }
    }
  }

  countNodes(): number {
    return 1 + this.children.reduce((sum, child) => sum + child.countNodes(), 0);
  }
}

export class Camera extends SceneNode {
  constructor(name = 'camera') {
    super(name);
  }
}

export class Light extends SceneNode {
  constructor(name: string, public readonly kind: 'key' | 'fill' | 'ambient') {
    super(name);
  }
}

export class Starfield extends SceneNode {
  constructor(public readonly starCount: number, name = 'starfield') {
    super(name);
  }
}

export interface Clock {
  now(): number;
}

export interface Renderer {
  render(scene: SceneNode, camera: Camera): void;
  clear?(): void;
}
