import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GamePhase, EnemyData, BulletData, MissileData } from '../types';
import SceneOverlays from './SceneOverlays';
import { DIFFICULTY, WEAPON, MISSILE, SCENE_CONFIG, BULLET_SPEED, BULLET_LIFESPAN } from '../config/constants';
import { AssetManager } from '../systems/AssetManager';
import { ParticleSystem } from '../systems/ParticleSystem';
import { InputProcessor } from '../systems/InputProcessor';
import { EnemyFactory } from '../systems/EnemyFactory';
import { GameLoop, FrameContext } from '../systems/GameLoop';
import { SceneComposer } from '../systems/SceneComposer';
import { PhaseManager } from '../systems/PhaseManager';

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
}

// Memory Optimization Globals - Pooled strictly to avoid GC and per-frame allocations
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _bulletSeg = new THREE.Line3();
const _closestPt = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _menuZVec = new THREE.Vector3(0, 0, 1);
const _forward = new THREE.Vector3(0, 0, -1);
const _right = new THREE.Vector3(1, 0, 0);

// PERFORMANCE MONITORING FLAG
const DEBUG_PERF = true;

interface PooledBullet extends BulletData {
    active: boolean;
}

const GameScene: React.FC<Props> = ({ handResultRef, onScoreUpdate, onDamage, onReset, score, hull, lives }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const enemiesRef = useRef<EnemyData[]>([]);
  // Pool for EnemyData objects to avoid creating JS objects every spawn
  const enemyDataPoolRef = useRef<EnemyData[]>([]); 

  const bulletPoolRef = useRef<PooledBullet[]>([]); 
  const missilesRef = useRef<MissileData[]>([]);
  
  const [phase, setPhase] = useState<GamePhase>('CALIBRATING');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [trackingStatus, setTrackingStatus] = useState({ aimer: false, trigger: false });
  const [weaponStatus, setWeaponStatus] = useState({ heat: 0, isOverheated: false, missileProgress: 1.0 });
  const [helpState, setHelpState] = useState({ page: 0, enemyIndex: 0 });

  const phaseManagerRef = useRef<PhaseManager | null>(null);
  const totalPlayTimeRef = useRef(0);
  const TARGET_FPS = 60;

  const propsRef = useRef({ hull, lives, score });
  useEffect(() => { propsRef.current = { hull, lives, score }; }, [hull, lives, score]);

  const assetManagerRef = useRef<AssetManager | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const inputProcessorRef = useRef<InputProcessor>(new InputProcessor());
  const sceneComposerRef = useRef<SceneComposer | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  const handInputRef = useRef<{ aimer: any; trigger: any } | null>(null);

  const calibrationPoint = useRef({ x: 0.5, y: 0.5 });
  const fireCooldownRef = useRef(0);
  const missileCooldownRef = useRef(0);
  const heatRef = useRef(0);
  const isOverheatedRef = useRef(false);
  const overheatUnlockRef = useRef(0);
  const lastHeatUpdateRef = useRef(0);
  const lastMissileProgressRef = useRef(1.0);
  const missileIdCounter = useRef(0);

  const recoilRef = useRef(0);
  const shakeRef = useRef(0);
  const pauseGestureCooldown = useRef(0);

  // Scene bootstrap: one-time construction of renderer, systems, and the animation loop
  useEffect(() => {
    if (!mountRef.current) return;
    const composer = new SceneComposer(mountRef.current);
    const { scene, camera, renderer, gunAnchor, gunPivot, muzzle, reticle, laser, enemyGroup, startGroup, pauseGroup, helpGroup, helpSpotlight, gameOverGroup, targets } = composer.graph;
    sceneComposerRef.current = composer;

    const assets = new AssetManager();
    assetManagerRef.current = assets;

    const particles = new ParticleSystem(scene);
    particleSystemRef.current = particles;

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

    const spawnBullet = (pos: THREE.Vector3, quat: THREE.Quaternion, vel: THREE.Vector3, now: number) => {
        let bullet = bulletPoolRef.current.find(b => !b.active);
        if (!bullet) {
            const mesh = new THREE.Mesh(assets.assets.geos.bullet, assets.assets.mats.bullet);
            // Manual Matrix Update optimization for linear projectiles
            mesh.matrixAutoUpdate = false; 
            scene.add(mesh);
            bullet = { mesh, velocity: new THREE.Vector3(), startTime: 0, prevPosition: new THREE.Vector3(), active: true };
            bulletPoolRef.current.push(bullet);
        }
        bullet.active = true;
        bullet.mesh.visible = true;
        bullet.mesh.position.copy(pos);
        bullet.mesh.quaternion.copy(quat);
        bullet.mesh.updateMatrix(); // Initial update
        bullet.velocity.copy(vel);
        bullet.startTime = now;
        bullet.prevPosition.copy(pos);
    };

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
      heatRef.current = 0;
      isOverheatedRef.current = false;
      setWeaponStatus({ heat: 0, isOverheated: false, missileProgress: 1.0 });
    };

    const resetTransientObjects = () => {
      bulletPoolRef.current.forEach(b => { b.active = false; b.mesh.visible = false; });
      missilesRef.current.forEach(m => scene.remove(m.mesh));
      missilesRef.current = [];
    };

    const phaseManager = new PhaseManager({
      visibilityTargets: { startGroup, pauseGroup, gameOverGroup, enemyGroup, helpGroup, helpSpotlight },
      scene,
      onPhaseChange: newPhase => { setPhase(newPhase); pauseGestureCooldown.current = performance.now() + 1500; },
      onHelpStateChange: setHelpState,
      onTransition: resetTransientObjects,
      phaseHandlers: {
        CALIBRATING: () => { setCalibrationProgress(0); clearEnemies(); resetWeapons(); },
        READY: () => { totalPlayTimeRef.current = 0; clearEnemies(); resetWeapons(); },
        GAMEOVER: () => { clearEnemies(); resetWeapons(); },
        HELP: () => { clearEnemies(); },
      },
    });
    phaseManagerRef.current = phaseManager;

    const transitionPhase = (next: GamePhase) => phaseManagerRef.current?.transitionTo(next);

    if (DEBUG_PERF) console.log("Performance Profiler Initialized");

    const handleInputStage = (_context: FrameContext) => {
      const handData = inputProcessorRef.current.getHandData(handResultRef.current);
      handInputRef.current = handData;
      setTrackingStatus({ aimer: !!handData?.aimer, trigger: !!handData?.trigger });
    };

    const handleParticleStage = ({ timeScale }: FrameContext) => {
      particles.update(timeScale);
    };

    const handleSimulationStage = ({ deltaMs, timeScale, now }: FrameContext) => {
      const input = handInputRef.current || {};
      const { aimer, trigger } = input as any;

      const phaseManager = phaseManagerRef.current;
      const currentPhase = phaseManager?.getPhase() ?? 'CALIBRATING';

      if (currentPhase === 'PLAYING') totalPlayTimeRef.current += deltaMs;
      const playTimeSeconds = totalPlayTimeRef.current / 1000;
      const dtSeconds = deltaMs / 1000;

      if (isOverheatedRef.current) { if (now > overheatUnlockRef.current) { isOverheatedRef.current = false; heatRef.current = 0; } }
      else if (heatRef.current > 0) { heatRef.current = Math.max(0, heatRef.current - (WEAPON.COOLING_RATE * dtSeconds)); }

      const missileProgress = Math.min(1.0, (now - missileCooldownRef.current) / MISSILE.COOLDOWN_MS);
      if (Math.abs(heatRef.current - lastHeatUpdateRef.current) > 1.0 || isOverheatedRef.current !== (heatRef.current >= WEAPON.MAX_HEAT) || Math.abs(missileProgress - lastMissileProgressRef.current) > 0.01) {
         setWeaponStatus({ heat: heatRef.current, isOverheated: isOverheatedRef.current, missileProgress });
         lastHeatUpdateRef.current = heatRef.current; lastMissileProgressRef.current = missileProgress;
      }

      recoilRef.current *= 0.85; shakeRef.current *= 0.9;
      const currentCamZ = camera.position.z;
      camera.position.set(
          (Math.random()-0.5)*shakeRef.current,
          (Math.random()-0.5)*shakeRef.current,
          currentCamZ
      );
      gunPivot.position.z = recoilRef.current;

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

      for (let i = 0; i < bulletPoolRef.current.length; i++) {
        const b = bulletPoolRef.current[i];
        if (!b.active) continue;
        b.prevPosition.copy(b.mesh.position);
        b.mesh.position.addScaledVector(b.velocity, timeScale);
        b.mesh.updateMatrix();

        _bulletSeg.set(b.prevPosition, b.mesh.position);
        let hit = false;

        const attemptTransition = (next: GamePhase) => {
            const manager = phaseManagerRef.current;
            return manager ? manager.transitionTo(next) : false;
        };

        const checkTarget = (obj: any, next: GamePhase, resetScore = false, action?: () => void) => {
            _v3.setFromMatrixPosition(obj.group.matrixWorld);
            _bulletSeg.closestPointToPoint(_v3, true, _closestPt);
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
            if(!hit) checkTarget(restartTargetObj, 'READY', true);
            if(!hit) checkTarget(recalibrateTargetObj, 'CALIBRATING');
            if(!hit) checkTarget(intelTargetObj, 'HELP');
        }
        if (currentPhase === 'HELP') {
            checkTarget(helpReturnTargetObj, 'PAUSED');
            if (!hit && phaseManager) checkTarget(helpNextPageTargetObj, 'HELP', false, () => { phaseManager.toggleHelpPage(); });
            if (!hit && phaseManager?.getHelpState().page === 1) checkTarget(helpCycleEnemyTargetObj, 'HELP', false, () => { phaseManager.cycleHelpEnemy(DIFFICULTY.ENEMIES.length); });
        }

        if (currentPhase === 'PLAYING' && !hit) {
            for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                const e = enemiesRef.current[j];
                if (Math.abs(e.mesh.position.z - b.mesh.position.z) > 100) continue;
                _targetPos.copy(e.mesh.position);
                _bulletSeg.closestPointToPoint(_targetPos, true, _closestPt);
                if (_closestPt.distanceTo(_targetPos) < e.hitRadius) {
                    e.hp--;
                    if (e.hp <= 0) {
                        onScoreUpdate(e.points);
                        spawnExplosion(_targetPos, false, e.type);
                        removeEnemy(j);
                    }
                    else { particles.spawnImpact(_targetPos, 0x00ffff, 15, 5); updateEnemyHealth(e); }
                    hit = true; break;
                }
            }
        }
        if (hit || (now - b.startTime > BULLET_LIFESPAN)) { b.active = false; b.mesh.visible = false; }
      }

      for (let i = missilesRef.current.length - 1; i >= 0; i--) {
        const m = missilesRef.current[i];
        m.mesh.position.addScaledVector(m.velocity, timeScale);
        let detonate = false;
        const mp = m.mesh.position;
        for (const e of enemiesRef.current) { if (mp.distanceTo(e.mesh.position) < MISSILE.PROXIMITY_RADIUS) { detonate = true; break; } }
        if (now - m.startTime > MISSILE.LIFESPAN_MS) detonate = true;
        if (detonate) {
           spawnExplosion(mp, true, 'STANDARD');
           for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
               const e = enemiesRef.current[j];
               if (mp.distanceTo(e.mesh.position) < MISSILE.BLAST_RADIUS) {
                   e.hp -= MISSILE.DAMAGE;
                   if (e.hp <= 0) {
                       onScoreUpdate(e.points); spawnExplosion(e.mesh.position, false, e.type);
                       removeEnemy(j);
                   }
                   else updateEnemyHealth(e);
               }
           }
           scene.remove(m.mesh); missilesRef.current.splice(i, 1);
        } else m.mesh.rotateZ(0.2 * timeScale);
      }

      if (aimer) {
          const { isPauseGesture, isPinching, isFist, tip } = inputProcessorRef.current.detectGestures(aimer, trigger);
          if (phaseManager && currentPhase === 'PLAYING' && now - pauseGestureCooldown.current > 0) {
              if (phaseManager.updatePauseHold(isPauseGesture, now)) transitionPhase('PAUSED');
          } else if (phaseManager) phaseManager.resetPauseHold();
          if (trigger) {
              if (phaseManager && currentPhase === 'CALIBRATING') {
                  const { progress, completed } = phaseManager.updateCalibrationHold(isPinching, now);
                  setCalibrationProgress(progress);
                  if (completed) { calibrationPoint.current = { x: tip.x, y: tip.y }; transitionPhase('READY'); }
              }
              if (currentPhase !== 'CALIBRATING') {
                  if (isFist && now - missileCooldownRef.current > MISSILE.COOLDOWN_MS) {
                      missileCooldownRef.current = now; recoilRef.current = 25.0;
                      gunPivot.getWorldQuaternion(_q1); _v1.setFromMatrixPosition(muzzle.matrixWorld); _v2.copy(_forward).applyQuaternion(_q1);
                      const m = new THREE.Mesh(assets.assets.geos.missile, assets.assets.mats.missile);
                      m.position.copy(_v1); m.quaternion.copy(_q1); scene.add(m);
                      missilesRef.current.push({ mesh: m, velocity: _v2.clone().multiplyScalar(MISSILE.SPEED), startTime: now, id: missileIdCounter.current++ });
                      particles.spawnImpact(m.position, 0xff8800, 120, 20, 0.035);
                      setWeaponStatus({ heat: heatRef.current, isOverheated: isOverheatedRef.current, missileProgress: 0 });
                  }
                  if (now > fireCooldownRef.current && !isOverheatedRef.current) {
                      heatRef.current = Math.min(WEAPON.MAX_HEAT, heatRef.current + WEAPON.HEAT_PER_SHOT);
                      if (heatRef.current >= WEAPON.MAX_HEAT) { isOverheatedRef.current = true; overheatUnlockRef.current = now + WEAPON.OVERHEAT_DURATION_MS; }

                      const jitterX = (Math.random() - 0.5) * 0.005;
                      const jitterY = (Math.random() - 0.5) * 0.005;
                      fireCooldownRef.current = now + (1000 / WEAPON.FIRE_RATE);

                      recoilRef.current += 3.0 + (heatRef.current / WEAPON.MAX_HEAT) * 5.0;

                      raycaster.setFromCamera({ x: (tip.x - calibrationPoint.current.x) * 1.3 + jitterX, y: (tip.y - calibrationPoint.current.y) * 1.1 + jitterY }, camera);
                      raycaster.ray.at(200, _v1);
                      raycaster.ray.direction.addScaledVector(_right, (Math.random() - 0.5) * 0.03);
                      raycaster.ray.direction.normalize();

                      muzzle.getWorldPosition(_v2);
                      raycaster.ray.origin.copy(_v2);
                      raycaster.ray.direction.normalize();
                      raycaster.ray.at(1000, _v3);

                      spawnBullet(_v2, raycaster.ray.quaternion(), _v3.sub(_v2).normalize().multiplyScalar(BULLET_SPEED), now);

                      particles.spawnMuzzleFlash(_v2, raycaster.ray.direction);
                  }
              }
          }

          if (currentPhase !== 'CALIBRATING') {
              const q = aimer.quaternion; _euler.setFromQuaternion(q);
              _euler.y += (Math.PI/4) * (aimer.gestures.roll ? aimer.gestures.roll : 0);
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
          }
      } else { reticle.visible = laser.visible = false; if (phaseManager) phaseManager.resetPauseHold(); if (currentPhase === 'CALIBRATING') { setCalibrationProgress(0); } }
    };

    const handleRenderStage = () => {
      camera.lookAt(0, 10, -500);
      renderer.render(scene, camera);
    };

    const loop = new GameLoop(
      {
        input: handleInputStage,
        particles: handleParticleStage,
        simulation: handleSimulationStage,
        render: handleRenderStage,
      },
      { targetFps: TARGET_FPS, debugPerf: DEBUG_PERF, perfLogInterval: 60 },
    );
    gameLoopRef.current = loop;
    loop.start();

    return () => {
        loop.stop();
        assetManagerRef.current?.dispose();
        particleSystemRef.current?.dispose();
        composer.dispose();
    };
  }, []); 

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      <SceneOverlays 
        phase={phase} score={score} calibrationProgress={calibrationProgress}
        trackingStatus={trackingStatus} weaponStatus={weaponStatus} helpState={helpState}
      />
    </div>
  );
};

export default GameScene;