import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/constants';
import { ResourceLifecycle } from './ResourceLifecycle';
import { AssetManager } from './AssetManager';

export interface InteractiveTarget {
  group: THREE.Group;
  radius: number;
}

export interface SceneTargets {
  startTarget: InteractiveTarget;
  pauseTargets: {
    resume: InteractiveTarget;
    restart: InteractiveTarget;
    recalibrate: InteractiveTarget;
    intel: InteractiveTarget;
  };
  helpTargets: {
    returnTarget: InteractiveTarget;
    nextPage: InteractiveTarget;
    cycleEnemy: InteractiveTarget;
  };
  gameOverTarget: InteractiveTarget;
}

export interface SceneGraph {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  gunAnchor: THREE.Group;
  gunPivot: THREE.Group;
  muzzle: THREE.Group;
  reticle: THREE.Group;
  laser: THREE.Line;
  enemyGroup: THREE.Group;
  startGroup: THREE.Group;
  pauseGroup: THREE.Group;
  helpGroup: THREE.Group;
  helpSpotlight: THREE.SpotLight;
  gameOverGroup: THREE.Group;
  targets: SceneTargets;
}

export class SceneComposer {
  private readonly mount: HTMLElement;
  private resizeHandler: () => void;
  private resizeObserver?: ResizeObserver;
  private pausedOverlay: HTMLDivElement;
  private renderPausedReason: string | null = null;
  public readonly graph: SceneGraph;

  constructor(mount: HTMLElement, lifecycle: ResourceLifecycle, assets: AssetManager) {
    this.mount = mount;

    this.pausedOverlay = document.createElement('div');
    if (getComputedStyle(this.mount).position === 'static') {
      this.mount.style.position = 'relative';
    }
    Object.assign(this.pausedOverlay.style, {
      position: 'absolute',
      inset: '0px',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, rgba(5,16,40,0.6), rgba(5,16,40,0.85))',
      color: '#7dd3fc',
      fontFamily: 'monospace',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      zIndex: '10',
      pointerEvents: 'none',
    });
    this.pausedOverlay.textContent = 'Renderer paused - awaiting canvas';
    this.mount.appendChild(this.pausedOverlay);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000003);
    scene.fog = new THREE.Fog(0x000003, 500, 5500);

    const { width: initialWidth, height: initialHeight } = this.getMountSize();
    const safeInitialWidth = initialWidth || window.innerWidth || 1;
    const safeInitialHeight = initialHeight || window.innerHeight || 1;
    const camera = new THREE.PerspectiveCamera(75, safeInitialWidth / safeInitialHeight, 0.1, 50000);
    camera.position.set(0, 0, SCENE_CONFIG.CAMERA_Z);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(safeInitialWidth, safeInitialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (!this.tryAttachRenderer(renderer)) {
      this.pauseRendering('Renderer paused - unable to attach canvas');
    }
    lifecycle.add(() => {
      renderer.dispose();
      this.detachRenderer(renderer);
    });

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(0, 50, 50);
    scene.add(mainLight);

    const starfield = assets.createStarfieldInstance();
    scene.add(starfield);
    lifecycle.add(() => assets.releaseStarfieldInstance(starfield));

    const startGroup = new THREE.Group();
    scene.add(startGroup);
    const startTarget = this.createInteractiveTarget(0, 10, SCENE_CONFIG.MENU_Z, 0x00ffff, lifecycle, assets);
    startGroup.add(startTarget.group);

    const pauseGroup = new THREE.Group();
    scene.add(pauseGroup);
    const restartTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0xffff00, lifecycle, assets, 15);
    const recalibrateTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0xff00ff, lifecycle, assets, 15);
    const intelTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0x0088ff, lifecycle, assets, 15);
    const resumeTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0x00ff00, lifecycle, assets, 18);
    pauseGroup.add(resumeTarget.group, restartTarget.group, recalibrateTarget.group, intelTarget.group);
    pauseGroup.visible = false;

    const helpGroup = new THREE.Group();
    scene.add(helpGroup);
    const helpReturnTarget = this.createInteractiveTarget(0, -70, SCENE_CONFIG.MENU_Z, 0xff8800, lifecycle, assets, 25);
    const helpNextPageTarget = this.createInteractiveTarget(140, 0, SCENE_CONFIG.MENU_Z, 0x00ffff, lifecycle, assets, 20);
    const helpCycleEnemyTarget = this.createInteractiveTarget(-140, 0, SCENE_CONFIG.MENU_Z, 0xff00ff, lifecycle, assets, 20);
    helpGroup.add(helpReturnTarget.group);
    helpGroup.visible = false;

    const helpSpotlight = new THREE.SpotLight(0xffffff, 30.0);
    helpSpotlight.position.set(20, 50, 50);
    helpSpotlight.target.position.set(0, 0, SCENE_CONFIG.MENU_Z + 50);
    helpSpotlight.angle = Math.PI / 4;
    helpSpotlight.penumbra = 0.5;
    helpSpotlight.visible = false;
    scene.add(helpSpotlight);
    scene.add(helpSpotlight.target);

    const gameOverGroup = new THREE.Group();
    scene.add(gameOverGroup);
    const gameOverTarget = this.createInteractiveTarget(0, -10, SCENE_CONFIG.MENU_Z, 0xff0000, lifecycle, assets, 25);
    gameOverGroup.add(gameOverTarget.group);
    gameOverGroup.visible = false;

    const gunAnchor = new THREE.Group();
    gunAnchor.position.copy(SCENE_CONFIG.GUN_POS);
    scene.add(gunAnchor);
    const gunPivot = new THREE.Group();
    gunAnchor.add(gunPivot);
    const muzzle = new THREE.Group();
    muzzle.position.z = -15;
    gunPivot.add(muzzle);

    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, depthWrite: false });
    const reticle = new THREE.Group();
    reticle.add(
      new THREE.Mesh(new THREE.TorusGeometry(8, 0.3, 16, 32), reticleMat),
      new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), reticleMat),
    );
    reticle.visible = false;
    lifecycle.add(() => {
      reticleMat.dispose();
      reticle.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });
    });
    scene.add(reticle);
    const laser = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 }),
    );
    lifecycle.add(() => {
      laser.geometry.dispose();
      (laser.material as THREE.Material).dispose();
    });
    scene.add(laser);

    const enemyGroup = new THREE.Group();
    scene.add(enemyGroup);

    this.graph = {
      scene,
      camera,
      renderer,
      gunAnchor,
      gunPivot,
      muzzle,
      reticle,
      laser,
      enemyGroup,
      startGroup,
      pauseGroup,
      helpGroup,
      helpSpotlight,
      gameOverGroup,
      targets: {
        startTarget,
        pauseTargets: {
          resume: resumeTarget,
          restart: restartTarget,
          recalibrate: recalibrateTarget,
          intel: intelTarget,
        },
        helpTargets: {
          returnTarget: helpReturnTarget,
          nextPage: helpNextPageTarget,
          cycleEnemy: helpCycleEnemyTarget,
        },
        gameOverTarget,
      },
    };

    this.resizeHandler = () => this.handleResize();
    this.handleResize();
    lifecycle.addEventListener(window, 'resize', this.resizeHandler);
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.mount);
    lifecycle.add(() => this.resizeObserver?.disconnect());
    lifecycle.add(() => {
      this.mount.contains(this.pausedOverlay) && this.mount.removeChild(this.pausedOverlay);
      scene.remove(reticle, laser, enemyGroup, startGroup, pauseGroup, helpGroup, helpSpotlight, gameOverGroup, gunAnchor);
      scene.clear();
    });
  }

  private createInteractiveTarget(
    x: number,
    y: number,
    z: number,
    color: number,
    lifecycle: ResourceLifecycle,
    assets: AssetManager,
    size = 20,
  ): InteractiveTarget {
    const group = assets.acquireMenuTarget(size, color);
    group.position.set(x, y, z);
    group.updateMatrix();
    lifecycle.add(() => assets.releaseMenuTarget(group, size, color));
    return { group, radius: size * 1.3 };
  }

  private handleResize() {
    const { camera, renderer, targets } = this.graph;
    const { width, height } = this.getMountSize();
    if (width === 0 || height === 0) {
      console.warn('[SceneComposer] Mount has zero dimensions; pausing render');
      this.pauseRendering('Renderer paused - awaiting layout');
      return;
    }

    if (!this.mount.contains(renderer.domElement)) {
      const appended = this.tryAttachRenderer(renderer);
      if (!appended) {
        this.pauseRendering('Renderer paused - canvas missing');
        return;
      }
    }

    this.resumeRendering();

    const w = width;
    const h = height;
    const aspect = w / h;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    if (aspect < 1.0) {
      camera.position.z = SCENE_CONFIG.CAMERA_Z + 80 * (1 - aspect);
    } else {
      camera.position.z = SCENE_CONFIG.CAMERA_Z;
    }

    const dist = camera.position.z - SCENE_CONFIG.MENU_Z;
    const vFOV = THREE.MathUtils.degToRad(75);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    const visibleWidth = visibleHeight * camera.aspect;

    targets.pauseTargets.restart.group.position.x = -0.35 * visibleWidth;
    targets.pauseTargets.restart.group.updateMatrix();

    targets.pauseTargets.recalibrate.group.position.x = -0.125 * visibleWidth;
    targets.pauseTargets.recalibrate.group.updateMatrix();

    targets.pauseTargets.intel.group.position.x = 0.125 * visibleWidth;
    targets.pauseTargets.intel.group.updateMatrix();

    targets.pauseTargets.resume.group.position.x = 0.35 * visibleWidth;
    targets.pauseTargets.resume.group.updateMatrix();
  }

  public canRender() {
    if (this.renderPausedReason) return false;
    if (!this.mount.contains(this.graph.renderer.domElement)) {
      if (this.tryAttachRenderer(this.graph.renderer)) {
        this.resumeRendering();
        return true;
      }
      this.pauseRendering('Renderer paused - canvas missing');
      return false;
    }
    return true;
  }

  private getMountSize() {
    const width = Math.floor(this.mount.clientWidth);
    const height = Math.floor(this.mount.clientHeight);
    if (width === 0 || height === 0) {
      console.warn('[SceneComposer] Mount returned zero dimensions; falling back to viewport');
      const fallback = { width: window.innerWidth, height: window.innerHeight };
      if (fallback.width === 0 || fallback.height === 0) {
        console.error('[SceneComposer] Computed dimensions are 0; cannot size renderer');
      }
      return fallback;
    }
    return { width, height };
  }

  private tryAttachRenderer(renderer: THREE.WebGLRenderer) {
    try {
      this.mount.appendChild(renderer.domElement);
    } catch (error) {
      console.error('[SceneComposer] Failed to append renderer canvas', error);
      return false;
    }

    if (!this.mount.contains(renderer.domElement)) {
      console.error('[SceneComposer] Renderer canvas not attached after append');
      return false;
    }

    return true;
  }

  private detachRenderer(renderer: THREE.WebGLRenderer) {
    if (this.mount.contains(renderer.domElement)) {
      this.mount.removeChild(renderer.domElement);
    }
  }

  private pauseRendering(reason: string) {
    this.renderPausedReason = reason;
    this.pausedOverlay.textContent = reason;
    this.pausedOverlay.style.display = 'flex';
  }

  private resumeRendering() {
    this.renderPausedReason = null;
    this.pausedOverlay.style.display = 'none';
  }
}
