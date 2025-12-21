import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/constants';

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
  public readonly graph: SceneGraph;

  constructor(mount: HTMLElement) {
    this.mount = mount;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000003);
    scene.fog = new THREE.Fog(0x000003, 500, 5500);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000);
    camera.position.set(0, 0, SCENE_CONFIG.CAMERA_Z);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(0, 50, 50);
    scene.add(mainLight);

    const starfield = this.createStarfield();
    scene.add(starfield);

    const startGroup = new THREE.Group();
    scene.add(startGroup);
    const startTarget = this.createInteractiveTarget(0, 10, SCENE_CONFIG.MENU_Z, 0x00ffff);
    startGroup.add(startTarget.group);

    const pauseGroup = new THREE.Group();
    scene.add(pauseGroup);
    const restartTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0xffff00, 15);
    const recalibrateTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0xff00ff, 15);
    const intelTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0x0088ff, 15);
    const resumeTarget = this.createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0x00ff00, 18);
    pauseGroup.add(resumeTarget.group, restartTarget.group, recalibrateTarget.group, intelTarget.group);
    pauseGroup.visible = false;

    const helpGroup = new THREE.Group();
    scene.add(helpGroup);
    const helpReturnTarget = this.createInteractiveTarget(0, -70, SCENE_CONFIG.MENU_Z, 0xff8800, 25);
    const helpNextPageTarget = this.createInteractiveTarget(140, 0, SCENE_CONFIG.MENU_Z, 0x00ffff, 20);
    const helpCycleEnemyTarget = this.createInteractiveTarget(-140, 0, SCENE_CONFIG.MENU_Z, 0xff00ff, 20);
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
    const gameOverTarget = this.createInteractiveTarget(0, -10, SCENE_CONFIG.MENU_Z, 0xff0000, 25);
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
    scene.add(reticle);
    const laser = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 }),
    );
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
    window.addEventListener('resize', this.resizeHandler);
  }

  dispose() {
    window.removeEventListener('resize', this.resizeHandler);
    this.graph.renderer.dispose();
    this.graph.scene.clear();
    this.mount.removeChild(this.graph.renderer.domElement);
  }

  private createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(15000 * 3);
    for (let i = 0; i < 15000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 5000 + Math.random() * 5000;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x888888, size: 1.5, transparent: true, opacity: 0.5, fog: false });
    const starfield = new THREE.Points(starGeo, starMat);
    starfield.matrixAutoUpdate = false;
    starfield.updateMatrix();
    return starfield;
  }

  private createInteractiveTarget(x: number, y: number, z: number, color: number, size = 20): InteractiveTarget {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const targetGeo = new THREE.IcosahedronGeometry(size, 1);
    const targetMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 2.5, wireframe: true });
    group.add(new THREE.Mesh(targetGeo, targetMat));
    const coreGeo = new THREE.SphereGeometry(size * 0.4, 16, 16);
    group.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })));
    group.matrixAutoUpdate = false;
    group.updateMatrix();
    return { group, radius: size * 1.3 };
  }

  private handleResize() {
    const { camera, renderer, targets } = this.graph;
    const w = window.innerWidth;
    const h = window.innerHeight;
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
}
