import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GamePhase, EnemyData, MissileData, InputSnapshot } from '../types';
import SceneOverlays from './SceneOverlays';
import { DIFFICULTY, MISSILE, SCENE_CONFIG, BULLET_SPEED, AIM } from '../config/constants';
import { AssetManager } from '../systems/AssetManager';
import { ParticleSystem } from '../systems/ParticleSystem';
import { InputProcessor } from '../systems/InputProcessor';
import { EnemyFactory } from '../systems/EnemyFactory';
import { GameLoop, FrameContext } from '../systems/GameLoop';
import { SceneComposer } from '../systems/SceneComposer';
import { PhaseManager } from '../systems/PhaseManager';
import { WeaponController, WeaponStatus } from '../systems/WeaponController';
import { BulletPool } from '../systems/BulletPool';
import { MissilePool } from '../systems/MissilePool';
import { CalibrationService, calibrateCamera, clearCalibrateCameraHandler, setCalibrateCameraHandler } from '../services/CalibrationService';
import { ResourceLifecycle } from '../systems/ResourceLifecycle';
import { isDevFeatureEnabled } from '../utils/devMode';
import { PerfTracer, perfTracer } from '../telemetry/PerfTracer';
import useOverlayStateAdapter, { OverlayState } from './ui/OverlayStateAdapter';

/**
 * GameScene
 * ---------
 * Imperative orchestrator that owns the Three.js scene, render loop, and the high-frequency
 * game simulation. React passes low-frequency state (score, hull, lives) while everything
 * time-critical (hand tracking, particles, physics) lives in refs to avoid reconciliation cost.
 *
 * Frame anatomy (60fps target):
 * 1) Interpret latest MediaPipe results via InputProcessor.
 * 2) Advance pooled particle buffers and weapon/enemy simulation.
 * 3) Update reticle/laser and interactive menu targets.
 * 4) Render the Three.js scene, then sync overlay state back to React.
 */

interface Props {
  handResultRef: React.RefObject<any>;
  onScoreUpdate: (points: number) => void;
  onDamage: (amount: number) => void;
  onReset: () => void;
  score: number;
  hull: number;
  lives: number;
  handTrackingEnabled: boolean;
  cameraPermissionGranted: boolean;
  cameraReady: boolean;
  cameraPermissionPending: boolean;
  onRetryCamera?: () => void;
  videoStream?: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const getCameraMessage = (
  cameraPermissionGranted: boolean,
  cameraReady: boolean,
  cameraPermissionPending: boolean,
) => {
  if (cameraPermissionPending && !cameraPermissionGranted) {
    return 'Enable camera access in your browser prompt to continue calibration.';
  }
  if (!cameraPermissionGranted) {
    return 'Camera access required. Turn on a webcam and allow browser permissions to continue.';
  }
  if (!cameraReady) return 'Starting camera feed — ensure your webcam is connected and accessible.';
  return undefined;
};

// Memory Optimization Globals - Pooled strictly to avoid GC and per-frame allocations
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _closestPt = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _menuZVec = new THREE.Vector3(0, 0, 1);
const _forward = new THREE.Vector3(0, 0, -1);
const _right = new THREE.Vector3(1, 0, 0);

const GameScene: React.FC<Props> = ({
  handResultRef,
  onScoreUpdate,
  onDamage,
  onReset,
  score,
  hull,
  lives,
  handTrackingEnabled,
  cameraPermissionGranted,
  cameraReady,
  cameraPermissionPending,
  onRetryCamera,
  videoStream,
  videoRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const enemiesRef = useRef<EnemyData[]>([]);
  // Pool for EnemyData objects to avoid creating JS objects every spawn
  const enemyDataPoolRef = useRef<EnemyData[]>([]);

  const bulletPoolRef = useRef<BulletPool | null>(null);
  const missilePoolRef = useRef<MissilePool | null>(null);
  const weaponControllerRef = useRef<WeaponController | null>(null);
  
  const weaponStatusRef = useRef<WeaponStatus>({ heat: 0, isOverheated: false, missileProgress: 1.0 });
  const initialPhase: GamePhase = handTrackingEnabled ? 'CALIBRATING' : 'READY';

  const overlayStateRef = useRef<OverlayState>({
    phase: initialPhase,
    score,
    calibrationProgress: 0,
    trackingStatus: { aimer: handTrackingEnabled, trigger: handTrackingEnabled, health: handTrackingEnabled ? 0 : 1 },
    weaponStatus: weaponStatusRef.current,
    helpState: { page: 0, enemyIndex: 0 },
    calibrationStatus: {
      stalled: false,
      cameraReady,
      permissionPending: cameraPermissionPending,
      fallbackCta: !cameraPermissionGranted,
      message: getCameraMessage(cameraPermissionGranted, cameraReady, cameraPermissionPending),
    },
  });

  const calibrationStartRef = useRef<number | null>(null);
  const lastLandmarkTimeRef = useRef<number | null>(null);
  const fallbackReadyTriggeredRef = useRef(false);
  const hasLiveHandDataRef = useRef(false);
  const manualGestureBypassRef = useRef(false);
  const phaseManagerRef = useRef<PhaseManager | null>(null);
  const totalPlayTimeRef = useRef(0);
  const TARGET_FPS = 60;

  const propsRef = useRef({ hull, lives, score });

  const benchmarkModeEnabled = isDevFeatureEnabled('benchmark');
  const noGestureDevBypass = isDevFeatureEnabled('nogestures');

  useEffect(() => {
    propsRef.current = { hull, lives, score };
    overlayStateRef.current.score = score;
  }, [hull, lives, score]);

  useEffect(() => {
    const currentStatus = overlayStateRef.current.calibrationStatus || {
      stalled: false,
      fallbackCta: false,
    };
    overlayStateRef.current.calibrationStatus = {
      ...currentStatus,
      cameraReady,
      permissionPending: cameraPermissionPending,
      fallbackCta: !cameraPermissionGranted,
      message: getCameraMessage(cameraPermissionGranted, cameraReady, cameraPermissionPending),
    };
  }, [cameraPermissionGranted, cameraReady, cameraPermissionPending]);

  useEffect(() => {
    const handler = () => {
      calibrationServiceRef.current.resetHold();
      calibrationStartRef.current = null;
      lastLandmarkTimeRef.current = null;
      fallbackReadyTriggeredRef.current = false;
      hasLiveHandDataRef.current = false;
      manualGestureBypassRef.current = noGestureDevBypass;
      overlayStateRef.current.calibrationProgress = 0;
      overlayStateRef.current.calibrationStatus = {
        stalled: false,
        fallbackCta: !cameraPermissionGranted,
        cameraReady,
        permissionPending: cameraPermissionPending,
        message: getCameraMessage(cameraPermissionGranted, cameraReady, cameraPermissionPending),
      };

      const phaseManager = phaseManagerRef.current;
      const currentPhase = phaseManager?.getPhase();
      if (phaseManager && currentPhase !== 'CALIBRATING') {
        phaseManager.transitionTo('CALIBRATING');
      }
    };

    setCalibrateCameraHandler(handler);

    return () => clearCalibrateCameraHandler(handler);
  }, [cameraPermissionGranted, cameraReady, cameraPermissionPending, noGestureDevBypass]);

  const overlayState = useOverlayStateAdapter(overlayStateRef, 90);

  const assetManagerRef = useRef<AssetManager | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const inputProcessorRef = useRef<InputProcessor>(new InputProcessor());
  const sceneComposerRef = useRef<SceneComposer | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const inputSnapshotRef = useRef<InputSnapshot | null>(null);
  const calibrationServiceRef = useRef<CalibrationService>(new CalibrationService());
  const fallbackInputSnapshotRef = useRef<InputSnapshot>({
    aim: { rotation: new THREE.Euler(0, 0, 0), direction: new THREE.Vector3(0, 0, -1), offset: { x: 0, y: 0 }, tip: { x: 0.5, y: 0.5 } },
    gestures: { pause: false, pinch: false, fist: false, tip: { x: 0.5, y: 0.5 } },
    tracking: { aimer: true, trigger: true, health: 1 },
  });
  const fallbackControlState = useRef({
    offset: { x: 0, y: 0 },
    tip: { x: 0.5, y: 0.5 },
    pause: false,
    firePrimary: false,
    fireMissile: false,
  });
  const shakeRef = useRef(0);
  const pauseGestureCooldown = useRef(0);
  const CALIBRATION_STALL_MS = 6000;
  const CALIBRATION_AUTO_READY_MS = 9000;

  useEffect(() => {
    const updatePointer = (x: number, y: number) => {
      const nx = Math.min(1, Math.max(0, x / window.innerWidth));
      const ny = Math.min(1, Math.max(0, y / window.innerHeight));
      fallbackControlState.current.tip = { x: nx, y: ny };
      fallbackControlState.current.offset = { x: (nx - 0.5) * 2, y: (ny - 0.5) * 2 };
    };

    const handleMouseMove = (event: MouseEvent) => updatePointer(event.clientX, event.clientY);
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) fallbackControlState.current.firePrimary = true;
      if (event.button === 2) fallbackControlState.current.fireMissile = true;
    };
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0) fallbackControlState.current.firePrimary = false;
      if (event.button === 2) fallbackControlState.current.fireMissile = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') fallbackControlState.current.firePrimary = true;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') fallbackControlState.current.fireMissile = true;
      if (event.code === 'Escape') fallbackControlState.current.pause = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') fallbackControlState.current.firePrimary = false;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') fallbackControlState.current.fireMissile = false;
      if (event.code === 'Escape') fallbackControlState.current.pause = false;
    };

    const preventContextMenu = (event: MouseEvent) => {
      if (event.button === 2) event.preventDefault();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', preventContextMenu);
      fallbackControlState.current = {
        offset: { x: 0, y: 0 },
        tip: { x: 0.5, y: 0.5 },
        pause: false,
        firePrimary: false,
        fireMissile: false,
      };
    };
  }, []);

  // Scene bootstrap: one-time construction of renderer, systems, and the animation loop
  useEffect(() => {
    overlayStateRef.current.phase = initialPhase;
    overlayStateRef.current.calibrationProgress = 0;
    calibrationStartRef.current = performance.now();
    lastLandmarkTimeRef.current = null;
    fallbackReadyTriggeredRef.current = false;
    manualGestureBypassRef.current = noGestureDevBypass;

    if (!mountRef.current) return;
    const lifecycle = new ResourceLifecycle();

    const assets = new AssetManager();
    assetManagerRef.current = assets;
    lifecycle.add(assets);

    const composer = new SceneComposer(mountRef.current, lifecycle, assets);
    const { scene, camera, gunAnchor, gunPivot, muzzle, reticle, laser, enemyGroup, startGroup, pauseGroup, helpGroup, helpSpotlight, gameOverGroup, targets } = composer.graph;
    sceneComposerRef.current = composer;

    const particles = new ParticleSystem(scene);
    particleSystemRef.current = particles;
    lifecycle.add(() => particles.dispose());

    const weaponController = new WeaponController();
    weaponController.reset(performance.now());
    weaponControllerRef.current = weaponController;

    const startTargetObj = targets.startTarget;
    const restartTargetObj = targets.pauseTargets.restart;
    const recalibrateTargetObj = targets.pauseTargets.recalibrate;
    const intelTargetObj = targets.pauseTargets.intel;
    const resumeTargetObj = targets.pauseTargets.resume;
    const helpReturnTargetObj = targets.helpTargets.returnTarget;
    const helpNextPageTargetObj = targets.helpTargets.nextPage;
    const helpCycleEnemyTargetObj = targets.helpTargets.cycleEnemy;
    const rebootTargetObj = targets.gameOverTarget;

    const spawnExplosion = (pos: THREE.Vector3, isMissile: boolean = false, type: string = 'STANDARD') => {
        const dist = Math.abs(pos.z - SCENE_CONFIG.CAMERA_Z);
        const s = 1.0 / (1.0 + dist / 2000); 

        let baseCount = 80; let baseSpread = 20; let decay = 0.03; let primaryColor = 0x00ffff; let secondaryColor: number | null = null; let shakeAmt = 10;

        switch(type) {
            case 'DREADNOUGHT': baseCount = 400; baseSpread = 60; decay = 0.015; primaryColor = 0xff4500; secondaryColor = 0xffff00; shakeAmt = 40; break;
            case 'WRAITH': baseCount = 120; baseSpread = 25; decay = 0.015; primaryColor = 0x8800ff; secondaryColor = 0x00ffff; shakeAmt = 15; break;
            case 'ELITE':
            case 'INTERCEPTOR': baseCount = 120; baseSpread = 30; decay = 0.03; primaryColor = 0xff0000; secondaryColor = 0xffaa00; shakeAmt = 20; break;
            case 'SCOUT': baseCount = 60; baseSpread = 18; decay = 0.04; primaryColor = 0xffff00; shakeAmt = 5; break;
            default: baseCount = 80; baseSpread = 18; decay = 0.03; primaryColor = 0x00ffff; shakeAmt = 10; break;
        }

        const spread = baseSpread * s;
        const count = Math.floor(baseCount * Math.max(0.3, s));
        
        particles.spawnImpact(pos, primaryColor, count, spread, decay);
        if (secondaryColor !== null) particles.spawnImpact(pos, secondaryColor, Math.floor(count * 0.5), spread * 0.6, decay * 1.2);

        if (isMissile) {
            particles.spawnImpact(pos, 0xff4500, Math.floor(250 * s), 35 * s, 0.025);
            particles.spawnShockwave(pos, MISSILE.BLAST_RADIUS * s); 
            shakeAmt += 20;
        }
        shakeRef.current += shakeAmt * s;
    };

    const updateEnemyHealth = (e: EnemyData) => {
        // Health bar is now pre-created by EnemyFactory, we just toggle it
        const bar = e.mesh.getObjectByName('health_bar');
        if (bar) {
            bar.visible = true;
            const pct = Math.max(0, e.hp / e.maxHp);
            const fg = bar.getObjectByName('health_fg') as THREE.Mesh;
            if (fg) {
                fg.scale.x = 23 * pct;
                // Update shared material instead of creating one
                if (pct < 0.3) fg.material = assets.assets.mats.hpFgCritical;
                else if (pct < 0.6) fg.material = assets.assets.mats.hpFgWarning;
                else fg.material = assets.assets.mats.hpFgFull;
            }
        }
    };

    bulletPoolRef.current = new BulletPool({
      scene,
      geometry: assets.assets.geos.bullet,
      material: assets.assets.mats.bullet,
    });

    missilePoolRef.current = new MissilePool({
      scene,
      geometry: assets.assets.geos.missile,
      material: assets.assets.mats.missile,
    });

    const removeEnemy = (index: number) => {
        const e = enemiesRef.current[index];
        EnemyFactory.releaseMesh(e.mesh, e.type);
        enemyGroup.remove(e.mesh); // Standard remove from parent (Group)
        
        // Return Data Object to Pool
        enemyDataPoolRef.current.push(e);
        
        // Swap-and-Pop to avoid O(N) array shift
        const lastIndex = enemiesRef.current.length - 1;
        if (index !== lastIndex) {
            enemiesRef.current[index] = enemiesRef.current[lastIndex];
        }
        enemiesRef.current.pop();
    };

    const clearEnemies = () => {
        // Release all to pool
        enemiesRef.current.forEach(e => {
            EnemyFactory.releaseMesh(e.mesh, e.type);
            enemyGroup.remove(e.mesh);
            enemyDataPoolRef.current.push(e);
        });
        enemiesRef.current = [];
    };

    const spawnEnemy = (playTimeInSeconds: number) => {
        const unlockedEnemies = DIFFICULTY.ENEMIES.filter(e => playTimeInSeconds >= e.unlockTime);
        const totalWeight = unlockedEnemies.reduce((sum, e) => sum + e.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        let selectedEnemyConfig = unlockedEnemies[0];
        for (const e of unlockedEnemies) {
            randomWeight -= e.weight;
            if (randomWeight <= 0) { selectedEnemyConfig = e; break; }
        }

        const { type, points, hp, speed } = selectedEnemyConfig;
        const speedBase = speed + (Math.random() * 1.2); 
        let radius = 25.0; 
        if (type === 'DREADNOUGHT') radius = 50;
        else if (type === 'WRAITH') radius = 25;
        else if (type === 'SCOUT') radius = 18;
        else if (type === 'ELITE') radius = 22;

        const mesh = EnemyFactory.getMesh(type, assets); // Use Pooled Mesh
        const sX = (Math.random() - 0.5) * SCENE_CONFIG.SPAWN_X_RANGE;
        const sY = SCENE_CONFIG.SPAWN_Y + (Math.random() - 0.5) * 500; 
        const sZ = SCENE_CONFIG.SPAWN_Z + (Math.random() - 0.5) * 800; 
        _v1.set(sX, sY, sZ);
        const targetX = sX * (0.1 + Math.random() * 0.3); 
        const targetY = SCENE_CONFIG.TARGET_Y + (Math.random() - 0.5) * 50; 
        _v2.set(targetX, targetY, SCENE_CONFIG.TARGET_Z);
        _v3.subVectors(_v2, _v1).normalize().multiplyScalar(speedBase);

        mesh.position.copy(_v1);
        mesh.lookAt(_v2);
        enemyGroup.add(mesh);

        // reuse or create EnemyData
        const data = enemyDataPoolRef.current.pop() || { 
            mesh: mesh, 
            velocity: new THREE.Vector3(), 
            type: type, 
            spawnX: 0, spawnY: 0, hitRadius: 0, points: 0, materials: [], offset: 0, hp: 0, maxHp: 0 
        };
        
        data.mesh = mesh;
        data.velocity.copy(_v3);
        data.type = type;
        data.spawnX = sX;
        data.spawnY = sY;
        data.hitRadius = radius;
        data.points = points;
        data.offset = Math.random() * Math.PI * 2;
        data.hp = hp;
        data.maxHp = hp;

        enemiesRef.current.push(data);
    };

    const raycaster = new THREE.Raycaster();
    const menuPlane = new THREE.Plane(_menuZVec, -SCENE_CONFIG.MENU_Z);

    const resetWeapons = () => {
      const controller = weaponControllerRef.current;
      if (!controller) return;
      controller.reset(performance.now());
      const status = controller.getStatus();
      weaponStatusRef.current = status;
      overlayStateRef.current.weaponStatus = status;
    };

    const resetTransientObjects = () => {
      bulletPoolRef.current?.reset();
      missilePoolRef.current?.reset();
    };

    const phaseManager = new PhaseManager({
      visibilityTargets: { startGroup, pauseGroup, gameOverGroup, enemyGroup, helpGroup, helpSpotlight },
      scene,
      initialPhase,
      onPhaseChange: newPhase => {
        overlayStateRef.current.phase = newPhase;
        pauseGestureCooldown.current = performance.now() + 1500;
      },
      onHelpStateChange: state => {
        overlayStateRef.current.helpState = state;
      },
      onTransition: phase => {
        resetTransientObjects();
        if (phase === 'CALIBRATING') {
          overlayStateRef.current.calibrationProgress = 0;
          calibrationServiceRef.current.resetHold();
          calibrationStartRef.current = null;
          lastLandmarkTimeRef.current = null;
          fallbackReadyTriggeredRef.current = false;
          hasLiveHandDataRef.current = false;
          overlayStateRef.current.calibrationStatus = {
            stalled: false,
            fallbackCta: !cameraPermissionGranted,
            cameraReady,
            permissionPending: cameraPermissionPending,
          };
          if (!manualGestureBypassRef.current) manualGestureBypassRef.current = noGestureDevBypass;
        }
      },
      phaseHandlers: {
        CALIBRATING: () => { clearEnemies(); resetWeapons(); },
        READY: () => { totalPlayTimeRef.current = 0; clearEnemies(); resetWeapons(); },
        GAMEOVER: () => { clearEnemies(); resetWeapons(); },
        HELP: () => { clearEnemies(); },
      },
    });
    phaseManagerRef.current = phaseManager;

    const transitionPhase = (next: GamePhase) => phaseManagerRef.current?.transitionTo(next);

    if (benchmarkModeEnabled) console.log("Performance Profiler Initialized");

    const buildFallbackSnapshot = () => {
      const snapshot = fallbackInputSnapshotRef.current;
      const { offset, tip, pause, firePrimary, fireMissile } = fallbackControlState.current;

      snapshot.aim.offset = offset;
      snapshot.aim.tip = tip;
      snapshot.aim.rotation.set(-offset.y * AIM.MAX_PITCH, offset.x * AIM.MAX_YAW, 0);
      snapshot.aim.direction.set(0, 0, -1).applyEuler(snapshot.aim.rotation);

      snapshot.gestures.pause = pause;
      snapshot.gestures.fist = fireMissile;
      snapshot.gestures.pinch = firePrimary;
      snapshot.gestures.tip = tip;

      snapshot.tracking.aimer = true;
      snapshot.tracking.trigger = true;
      snapshot.tracking.health = 1;

      return snapshot;
    };

    const handleInputStage = ({ now }: FrameContext) => {
      const calibrationPoint = calibrationServiceRef.current.getCalibrationPoint();
      const handSnapshot = handTrackingEnabled
        ? inputProcessorRef.current.processFrame(handResultRef.current, calibrationPoint, now)
        : null;

      if (
        handSnapshot?.tracking &&
        (handSnapshot.tracking.aimer || handSnapshot.tracking.trigger || handSnapshot.tracking.health > 0)
      ) {
        lastLandmarkTimeRef.current = now;
      }

      const shouldBypassGestures = manualGestureBypassRef.current || noGestureDevBypass;
      const shouldUseFallback = !handTrackingEnabled || shouldBypassGestures || !handSnapshot?.gestures?.tip;
      const snapshot = shouldUseFallback ? buildFallbackSnapshot() : handSnapshot;

      hasLiveHandDataRef.current = !!handSnapshot && !shouldUseFallback;
      inputSnapshotRef.current = snapshot || buildFallbackSnapshot();
      overlayStateRef.current.trackingStatus = handSnapshot?.tracking || snapshot?.tracking || overlayStateRef.current.trackingStatus;
    };

    const handleParticleStage = ({ timeScale }: FrameContext) => {
      particles.update(timeScale);
    };

    const handleSimulationStage = ({ deltaMs, timeScale, now }: FrameContext) => {
      const inputSnapshot = inputSnapshotRef.current;
      const gestures = inputSnapshot?.gestures;
      const aimData = inputSnapshot?.aim;

      const phaseManager = phaseManagerRef.current;
      const currentPhase = phaseManager?.getPhase() ?? 'CALIBRATING';
      const weaponController = weaponControllerRef.current;
      const bulletPool = bulletPoolRef.current;
      const missilePool = missilePoolRef.current;

      if (!weaponController || !bulletPool || !missilePool) return;

      if (currentPhase === 'PLAYING') totalPlayTimeRef.current += deltaMs;
      const playTimeSeconds = totalPlayTimeRef.current / 1000;

      weaponController.update(deltaMs, now);
      const status = weaponController.getStatus();
      const prevStatus = weaponStatusRef.current;
      if (
        Math.abs(prevStatus.heat - status.heat) > 1.0 ||
        prevStatus.isOverheated !== status.isOverheated ||
        Math.abs(prevStatus.missileProgress - status.missileProgress) > 0.01
      ) {
        weaponStatusRef.current = status;
        overlayStateRef.current.weaponStatus = status;
      }

      shakeRef.current *= 0.9;
      const currentCamZ = camera.position.z;
      camera.position.set(
        (Math.random() - 0.5) * shakeRef.current,
        (Math.random() - 0.5) * shakeRef.current,
        currentCamZ,
      );
      gunPivot.position.z = weaponController.getRecoilOffset();

      if (propsRef.current.lives === 0 && currentPhase !== 'GAMEOVER') transitionPhase('GAMEOVER');

      if (currentPhase === 'HELP' && phaseManager) {
          const helpStateSnapshot = phaseManager.getHelpState();
          if (helpStateSnapshot.page === 0) {
              helpGroup.add(helpNextPageTargetObj.group); helpGroup.remove(helpCycleEnemyTargetObj.group);
              const existing = phaseManager.getHelpShowcase();
              if (existing) { scene.remove(existing); phaseManager.clearHelpShowcase(); }
          } else {
              helpGroup.add(helpNextPageTargetObj.group); helpGroup.add(helpCycleEnemyTargetObj.group);
              const existing = phaseManager.getHelpShowcase();
              if (!existing || existing.userData.idx !== helpStateSnapshot.enemyIndex) {
                  if (existing) scene.remove(existing);
                  const mesh = EnemyFactory.createMesh(DIFFICULTY.ENEMIES[helpStateSnapshot.enemyIndex].type, assets);
                  mesh.position.set(0, 0, SCENE_CONFIG.MENU_Z + 50); mesh.scale.setScalar(2.0);
                  mesh.userData.idx = helpStateSnapshot.enemyIndex; scene.add(mesh); phaseManager.setHelpShowcase(mesh);
              }
              const showcase = phaseManager.getHelpShowcase();
              if (showcase) {
                  showcase.rotation.y += 0.01 * timeScale;
                  showcase.rotation.x = Math.sin(now * 0.001) * 0.2;
                  const rot = showcase.getObjectByName('rotator');
                  if (rot) rot.rotateZ(0.05 * timeScale);
              }
          }
      }

      if (currentPhase === 'PLAYING') {
          const rampFactor = Math.min(playTimeSeconds / DIFFICULTY.RAMP_UP_DURATION, 1.0);
          const currentSpawnChance = DIFFICULTY.START_SPAWN_CHANCE + (DIFFICULTY.MAX_SPAWN_CHANCE - DIFFICULTY.START_SPAWN_CHANCE) * rampFactor;
          if (enemiesRef.current.length < DIFFICULTY.MAX_ON_SCREEN && Math.random() < (enemiesRef.current.length === 0 ? 0.05 : currentSpawnChance)) spawnEnemy(playTimeSeconds);

          const camQuat = camera.quaternion;
          for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
              const e = enemiesRef.current[i];
              e.mesh.position.addScaledVector(e.velocity, timeScale);
              if (Math.random() < 0.3) {
                 _v1.copy(e.mesh.position).add(_v4.set((Math.random()-0.5)*5, (Math.random()-0.5)*5, 10));
                 let trailColor = 0x00ffff;
                 if (['ELITE', 'INTERCEPTOR'].includes(e.type)) trailColor = 0xff00aa;
                 else if (e.type === 'DREADNOUGHT') trailColor = 0xff4500;
                 else if (e.type === 'WRAITH') trailColor = 0x8800ff;
                 else if (e.type === 'SCOUT') trailColor = 0xffff00;
                 particles.spawnImpact(_v1, trailColor, 1, 0.5 / (1.0 + Math.abs(e.mesh.position.z - currentCamZ) / 2000), 0.15);
              }
              const hb = e.mesh.getObjectByName('health_bar');
              if (hb) hb.quaternion.copy(camQuat);

              if (e.type === 'SCOUT') { e.mesh.position.x += Math.cos(now*0.005 + e.offset)*2.5*timeScale; e.mesh.position.y += Math.sin(now*0.008+e.offset)*1.5*timeScale; e.mesh.rotateZ(0.05*timeScale); }
              else if (e.type === 'INTERCEPTOR') { e.mesh.position.x += Math.cos(now*0.003+e.offset)*3.0*timeScale; e.mesh.position.y += Math.sin(now*0.003+e.offset)*3.0*timeScale; e.mesh.rotateZ(0.15*timeScale); }
              else if (e.type === 'WRAITH') { e.mesh.position.x += Math.sin(now*0.001+e.offset)*0.8*timeScale; e.mesh.position.y += Math.cos(now*0.0015+e.offset)*0.8*timeScale; const c=e.mesh.getObjectByName('rotator'); if(c){ c.rotateX(0.02*timeScale); c.rotateY(0.03*timeScale); } }
              else if (e.type === 'STANDARD') { const r=e.mesh.getObjectByName('rotator'); if(r) r.rotateZ(0.1*timeScale); }
              else if (e.type === 'ELITE') { e.mesh.rotateY(0.02*timeScale); }
              else e.mesh.position.y += Math.sin(now*0.002+e.offset)*0.2*timeScale;

              if (e.mesh.position.y < SCENE_CONFIG.TARGET_Y + 10 || e.mesh.position.z > 60) {
                onDamage(15); shakeRef.current += 15;
                removeEnemy(i);
              }
          }
      }
      const handleBulletCollision = (segment: THREE.Line3) => {
        let hit = false;

        const attemptTransition = (next: GamePhase) => {
          if (next === 'CALIBRATING' && !handTrackingEnabled) return false;
          const manager = phaseManagerRef.current;
          return manager ? manager.transitionTo(next) : false;
        };

        const checkTarget = (obj: any, next: GamePhase, resetScore = false, action?: () => void) => {
          _v3.setFromMatrixPosition(obj.group.matrixWorld);
          segment.closestPointToPoint(_v3, true, _closestPt);
          if (_closestPt.distanceTo(_v3) < obj.radius) {
            particles.spawnImpact(_v3, 0x00ffff);
            const transitioned = action ? (action(), true) : attemptTransition(next);
            if (transitioned && resetScore) onReset();
            hit = true;
          }
        };

        if (currentPhase === 'READY') checkTarget(startTargetObj, 'PLAYING');
        if (currentPhase === 'GAMEOVER') checkTarget(rebootTargetObj, 'READY', true);
        if (currentPhase === 'PAUSED') {
          checkTarget(resumeTargetObj, 'PLAYING');
          if (!hit) checkTarget(restartTargetObj, 'READY', true);
          if (!hit) checkTarget(recalibrateTargetObj, 'CALIBRATING');
          if (!hit) checkTarget(intelTargetObj, 'HELP');
        }
        if (currentPhase === 'HELP') {
          checkTarget(helpReturnTargetObj, 'PAUSED');
          if (!hit && phaseManager) checkTarget(helpNextPageTargetObj, 'HELP', false, () => { phaseManager.toggleHelpPage(); });
          if (!hit && phaseManager?.getHelpState().page === 1) {
            checkTarget(helpCycleEnemyTargetObj, 'HELP', false, () => {
              phaseManager.cycleHelpEnemy(DIFFICULTY.ENEMIES.length);
            });
          }
        }

        if (currentPhase === 'PLAYING' && !hit) {
          for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
            const e = enemiesRef.current[j];
            if (Math.abs(e.mesh.position.z - segment.end.z) > 100) continue;
            _targetPos.copy(e.mesh.position);
            segment.closestPointToPoint(_targetPos, true, _closestPt);
            if (_closestPt.distanceTo(_targetPos) < e.hitRadius) {
              e.hp--;
              if (e.hp <= 0) {
                onScoreUpdate(e.points);
                spawnExplosion(_targetPos, false, e.type);
                removeEnemy(j);
              } else { particles.spawnImpact(_targetPos, 0x00ffff, 15, 5); updateEnemyHealth(e); }
              hit = true; break;
            }
          }
        }
        return hit;
      };

      bulletPool.update(timeScale, now, handleBulletCollision);

      const shouldDetonate = (missile: MissileData) => {
        const mp = missile.mesh.position;
        for (const e of enemiesRef.current) { if (mp.distanceTo(e.mesh.position) < MISSILE.PROXIMITY_RADIUS) return true; }
        return false;
      };

      const detonateMissile = (missile: MissileData) => {
        const mp = missile.mesh.position;
        spawnExplosion(mp, true, 'STANDARD');
        for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
          const e = enemiesRef.current[j];
          if (mp.distanceTo(e.mesh.position) < MISSILE.BLAST_RADIUS) {
            e.hp -= MISSILE.DAMAGE;
            if (e.hp <= 0) { onScoreUpdate(e.points); spawnExplosion(e.mesh.position, false, e.type); removeEnemy(j); }
            else updateEnemyHealth(e);
          }
        }
      };

      missilePool.update(timeScale, now, shouldDetonate, detonateMissile);

      if (currentPhase === 'CALIBRATING') {
        if (!cameraPermissionGranted || !cameraReady) {
          calibrationServiceRef.current.resetHold();
          calibrationStartRef.current = null;
          lastLandmarkTimeRef.current = null;
          fallbackReadyTriggeredRef.current = false;
          hasLiveHandDataRef.current = false;
          overlayStateRef.current.calibrationProgress = 0;
          overlayStateRef.current.calibrationStatus = {
            stalled: false,
            fallbackCta: !cameraPermissionGranted,
            cameraReady,
            permissionPending: cameraPermissionPending,
            message: getCameraMessage(cameraPermissionGranted, cameraReady, cameraPermissionPending),
          };
        } else {
          if (calibrationStartRef.current === null) {
            calibrationStartRef.current = now;
            lastLandmarkTimeRef.current = null;
            hasLiveHandDataRef.current = false;
          }

          const lastSeen = lastLandmarkTimeRef.current ?? calibrationStartRef.current ?? now;
          const timeSinceLandmark = now - lastSeen;
          const stalled = timeSinceLandmark > CALIBRATION_STALL_MS;
          overlayStateRef.current.calibrationStatus = {
            stalled,
            fallbackCta: stalled,
            cameraReady,
            permissionPending: cameraPermissionPending,
            message: stalled
              ? 'No hand data received. Verify the camera is connected and your hands are visible.'
              : undefined,
          };

          if (
            timeSinceLandmark > CALIBRATION_AUTO_READY_MS &&
            !fallbackReadyTriggeredRef.current
          ) {
            fallbackReadyTriggeredRef.current = true;
            manualGestureBypassRef.current = true;
            transitionPhase('READY');
          }

          if (handTrackingEnabled && !manualGestureBypassRef.current && gestures && aimData && hasLiveHandDataRef.current) {
            const { progress, completed } = calibrationServiceRef.current.update(gestures.pinch, aimData.tip, now);
            overlayStateRef.current.calibrationProgress = progress;
            if (completed) transitionPhase('READY');
          } else {
            calibrationServiceRef.current.resetHold();
            overlayStateRef.current.calibrationProgress = 0;
          }
        }
      } else {
        calibrationServiceRef.current.resetHold();
        overlayStateRef.current.calibrationStatus = {
          stalled: false,
          fallbackCta: !cameraPermissionGranted,
          cameraReady,
          permissionPending: cameraPermissionPending,
          message: getCameraMessage(cameraPermissionGranted, cameraReady, cameraPermissionPending),
        };
      }

      if (gestures) {
          if (phaseManager && currentPhase === 'PLAYING' && now - pauseGestureCooldown.current > 0) {
              if (phaseManager.updatePauseHold(gestures.pause, now)) transitionPhase('PAUSED');
          } else if (phaseManager) phaseManager.resetPauseHold();
      } else if (phaseManager) phaseManager.resetPauseHold();

      if (currentPhase !== 'CALIBRATING' && aimData && gestures) {
          if (gestures.fist && weaponController.canFireMissile(now)) {
              weaponController.recordMissileFire(now);
              gunPivot.getWorldQuaternion(_q1); _v1.setFromMatrixPosition(muzzle.matrixWorld); _v2.copy(_forward).applyQuaternion(_q1);
              missilePool.spawn(_v1, _q1, _v2.clone().multiplyScalar(MISSILE.SPEED), now);
              particles.spawnImpact(_v1, 0xff8800, 120, 20, 0.035);
              const updatedStatus = weaponController.getStatus();
              weaponStatusRef.current = updatedStatus;
              overlayStateRef.current.weaponStatus = updatedStatus;
          }

          if (aimData.tip && weaponController.canFirePrimary(now)) {
              weaponController.recordPrimaryFire(now);

              const jitterX = (Math.random() - 0.5) * 0.005;
              const jitterY = (Math.random() - 0.5) * 0.005;

              raycaster.setFromCamera({ x: aimData.offset.x * 1.3 + jitterX, y: aimData.offset.y * 1.1 + jitterY }, camera);
              raycaster.ray.at(200, _v1);
              raycaster.ray.direction.addScaledVector(_right, (Math.random() - 0.5) * 0.03);
              raycaster.ray.direction.normalize();

              muzzle.getWorldPosition(_v2);
              gunPivot.getWorldQuaternion(_q1);
              raycaster.ray.origin.copy(_v2);
              raycaster.ray.direction.normalize();
              raycaster.ray.at(1000, _v3);

              bulletPool.spawn(_v2, _q1, _v3.sub(_v2).normalize().multiplyScalar(BULLET_SPEED), now);

              particles.spawnMuzzleFlash(_v2, raycaster.ray.direction);
              const updatedStatus = weaponController.getStatus();
              weaponStatusRef.current = updatedStatus;
              overlayStateRef.current.weaponStatus = updatedStatus;
          }
      }

      if (currentPhase !== 'CALIBRATING' && aimData?.tip) {
          _euler.copy(aimData.rotation);
          _euler.y = THREE.MathUtils.clamp(_euler.y, SCENE_CONFIG.GUN_TILT_MIN, SCENE_CONFIG.GUN_TILT_MAX);

          gunAnchor.rotation.set(_euler.x * 0.55, 0, 0);
          gunPivot.rotation.set(_euler.x * 0.55, _euler.y, 0);

          gunAnchor.updateMatrixWorld(true);

          _v1.setFromMatrixPosition(muzzle.matrixWorld); gunPivot.getWorldQuaternion(_q1); _v2.copy(_forward).applyQuaternion(_q1);
          raycaster.set(_v1, _v2);
          if (raycaster.ray.intersectPlane(menuPlane, _v3)) {
              reticle.position.copy(_v3); reticle.lookAt(camera.position); reticle.visible = true;
              const pos = laser.geometry.attributes.position;
              pos.setXYZ(0, _v1.x, _v1.y, _v1.z); pos.setXYZ(1, _v3.x, _v3.y, _v3.z); pos.needsUpdate = true; laser.visible = true;
          }
      } else { reticle.visible = laser.visible = false; if (phaseManager) phaseManager.resetPauseHold(); if (currentPhase === 'CALIBRATING') { overlayStateRef.current.calibrationProgress = 0; } }
    };

    const handleRenderStage = () => {
      if (!sceneComposerRef.current?.canRender()) return;
      const renderer = sceneComposerRef.current.graph.renderer;
      camera.lookAt(0, 10, -500);
      renderer.render(scene, camera);
    };

    const tracer = benchmarkModeEnabled ? perfTracer : PerfTracer.create({ enabled: false });

    const loop = new GameLoop(
      {
        input: handleInputStage,
        particles: handleParticleStage,
        simulation: handleSimulationStage,
        render: handleRenderStage,
      },
      { targetFps: TARGET_FPS, tracer, telemetryEnabled: benchmarkModeEnabled, perfLogInterval: 60 },
    );
    gameLoopRef.current = loop;
    lifecycle.add(() => loop.stop());
    loop.start();

    return () => {
      calibrationStartRef.current = null;
      lastLandmarkTimeRef.current = null;
      fallbackReadyTriggeredRef.current = false;
      manualGestureBypassRef.current = false;
      lifecycle.disposeAll();
    };
  }, [benchmarkModeEnabled, handTrackingEnabled, cameraPermissionGranted, noGestureDevBypass]);

  const handleStartWithoutTracking = () => {
    manualGestureBypassRef.current = true;
    fallbackReadyTriggeredRef.current = true;
    calibrationServiceRef.current.resetHold();
    overlayStateRef.current.calibrationStatus = {
      stalled: false,
      fallbackCta: false,
      cameraReady: cameraPermissionGranted,
    };
    overlayStateRef.current.calibrationProgress = 0;
    phaseManagerRef.current?.transitionTo('READY');
  };

  const handleContinueAfterCalibration = () => {
    fallbackReadyTriggeredRef.current = true;
    if (!handTrackingEnabled) {
      manualGestureBypassRef.current = true;
    }
    calibrationServiceRef.current.resetHold();
    overlayStateRef.current.calibrationStatus = {
      stalled: false,
      fallbackCta: false,
      cameraReady: cameraPermissionGranted,
    };
    overlayStateRef.current.calibrationProgress = 1;
    phaseManagerRef.current?.transitionTo('READY');
  };

  const handleRestartCalibration = () => {
    fallbackReadyTriggeredRef.current = false;
    manualGestureBypassRef.current = noGestureDevBypass;
    calibrationServiceRef.current.resetHold();
    overlayStateRef.current.calibrationProgress = 0;
    calibrateCamera();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      <SceneOverlays
        {...overlayState}
        onStartWithoutTracking={handleStartWithoutTracking}
        onRetryCamera={onRetryCamera}
        onRestartCalibration={handleRestartCalibration}
        onContinueFromCalibration={handleContinueAfterCalibration}
        videoStream={videoStream}
        videoRef={videoRef}
      />
    </div>
  );
};

export default GameScene;
