import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GamePhase, EnemyData, BulletData, MissileData } from '../types';
import SceneOverlays from './SceneOverlays';
import { DIFFICULTY, WEAPON, MISSILE, SCENE_CONFIG, BULLET_SPEED, BULLET_LIFESPAN, PAUSE_HOLD_TIME_MS, CALIBRATION_HOLD_TIME_MS } from '../config/constants';
import { AssetManager } from '../systems/AssetManager';
import { ParticleSystem } from '../systems/ParticleSystem';
import { InputProcessor } from '../systems/InputProcessor';
import { EnemyFactory } from '../systems/EnemyFactory';

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
  
  const phaseRef = useRef<GamePhase>('CALIBRATING');
  const lastFrameTimeRef = useRef(0);
  const totalPlayTimeRef = useRef(0); 
  const TARGET_FPS = 60;
  const frameInterval = 1000 / TARGET_FPS;

  // Performance Profiler Refs
  const perfRef = useRef({
      frames: 0,
      inputTime: 0,
      particleTime: 0,
      logicTime: 0,
      renderTime: 0,
      totalTime: 0
  });

  const propsRef = useRef({ hull, lives, score });
  useEffect(() => { propsRef.current = { hull, lives, score }; }, [hull, lives, score]);

  const assetManagerRef = useRef<AssetManager | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const inputProcessorRef = useRef<InputProcessor>(new InputProcessor());

  const calibrationPoint = useRef({ x: 0.5, y: 0.5 });
  const calibrationHoldStartTimeRef = useRef(0);
  const pauseHoldStartTimeRef = useRef(0);
  
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
  const phaseTransitionTime = useRef(0);

  const helpPageRef = useRef(0);
  const helpEnemyIndexRef = useRef(0);
  const helpShowcaseRef = useRef<THREE.Group | null>(null);

  // Scene bootstrap: one-time construction of renderer, systems, and the animation loop
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000003);
    scene.fog = new THREE.Fog(0x000003, 500, 5500);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000);
    // Initial Camera setup - adjusted in resize
    camera.position.set(0, 0, SCENE_CONFIG.CAMERA_Z);

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false,
        powerPreference: 'high-performance',
        precision: 'mediump'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(0, 50, 50);
    scene.add(mainLight);

    const assets = new AssetManager();
    assetManagerRef.current = assets;
    
    const particles = new ParticleSystem(scene);
    particleSystemRef.current = particles;

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(15000 * 3);
    for(let i=0; i<15000; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 5000 + Math.random() * 5000;
        starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i*3+2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x888888, size: 1.5, transparent: true, opacity: 0.5, fog: false });
    const starfield = new THREE.Points(starGeo, starMat);
    starfield.matrixAutoUpdate = false;
    starfield.updateMatrix();
    scene.add(starfield);

    const createInteractiveTarget = (x: number, y: number, z: number, color: number, size: number = 20) => {
      const group = new THREE.Group(); group.position.set(x, y, z);
      const targetGeo = new THREE.IcosahedronGeometry(size, 1);
      const targetMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 2.5, wireframe: true });
      group.add(new THREE.Mesh(targetGeo, targetMat));
      const coreGeo = new THREE.SphereGeometry(size * 0.4, 16, 16);
      group.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff })));
      // Static targets don't move, optimize matrix
      group.matrixAutoUpdate = false;
      group.updateMatrix();
      return { group, radius: size * 1.3 };
    };

    const startGroup = new THREE.Group(); scene.add(startGroup);
    const startTargetObj = createInteractiveTarget(0, 10, SCENE_CONFIG.MENU_Z, 0x00ffff); 
    startGroup.add(startTargetObj.group);

    const pauseGroup = new THREE.Group(); scene.add(pauseGroup);
    // Menu targets init with 0, adjusted in handleResize
    const restartTargetObj = createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0xffff00, 15);
    const recalibrateTargetObj = createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0xff00ff, 15);
    const intelTargetObj = createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0x0088ff, 15);
    const resumeTargetObj = createInteractiveTarget(0, 5, SCENE_CONFIG.MENU_Z, 0x00ff00, 18);
    pauseGroup.add(resumeTargetObj.group, restartTargetObj.group, recalibrateTargetObj.group, intelTargetObj.group); 
    pauseGroup.visible = false;

    const helpGroup = new THREE.Group(); scene.add(helpGroup);
    const helpReturnTargetObj = createInteractiveTarget(0, -70, SCENE_CONFIG.MENU_Z, 0xff8800, 25);
    const helpNextPageTargetObj = createInteractiveTarget(140, 0, SCENE_CONFIG.MENU_Z, 0x00ffff, 20);
    const helpCycleEnemyTargetObj = createInteractiveTarget(-140, 0, SCENE_CONFIG.MENU_Z, 0xff00ff, 20);
    helpGroup.add(helpReturnTargetObj.group);
    helpGroup.visible = false;

    const helpSpotlight = new THREE.SpotLight(0xffffff, 30.0);
    helpSpotlight.position.set(20, 50, 50);
    helpSpotlight.target.position.set(0, 0, SCENE_CONFIG.MENU_Z + 50);
    helpSpotlight.angle = Math.PI / 4;
    helpSpotlight.penumbra = 0.5;
    helpSpotlight.visible = false;
    scene.add(helpSpotlight); scene.add(helpSpotlight.target);

    const gameOverGroup = new THREE.Group(); scene.add(gameOverGroup);
    const rebootTargetObj = createInteractiveTarget(0, -10, SCENE_CONFIG.MENU_Z, 0xff0000, 25); 
    gameOverGroup.add(rebootTargetObj.group); 
    gameOverGroup.visible = false;

    const gunAnchor = new THREE.Group(); gunAnchor.position.copy(SCENE_CONFIG.GUN_POS); scene.add(gunAnchor);
    const gunPivot = new THREE.Group(); gunAnchor.add(gunPivot);
    const muzzle = new THREE.Group(); muzzle.position.z = -15; gunPivot.add(muzzle);

    const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, depthWrite: false });
    const reticle = new THREE.Group();
    reticle.add(new THREE.Mesh(new THREE.TorusGeometry(8, 0.3, 16, 32), reticleMat), new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), reticleMat));
    reticle.visible = false; scene.add(reticle);
    const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.35 }));
    scene.add(laser);

    const enemyGroup = new THREE.Group();
    scene.add(enemyGroup);

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

    // Centralized phase transition handler: mirrors React state and resets transient pools
    const setGamePhase = (newPhase: GamePhase) => {
      phaseRef.current = newPhase;
      setPhase(newPhase);
      phaseTransitionTime.current = performance.now();
      pauseGestureCooldown.current = performance.now() + 1500; 
      bulletPoolRef.current.forEach(b => { b.active = false; b.mesh.visible = false; });
      missilesRef.current.forEach(m => scene.remove(m.mesh));
      missilesRef.current = [];
      if (['GAMEOVER', 'READY', 'CALIBRATING'].includes(newPhase)) {
        clearEnemies(); // Use pooling clear
        if (newPhase === 'CALIBRATING') { calibrationHoldStartTimeRef.current = 0; setCalibrationProgress(0); }
        if (newPhase === 'READY') { totalPlayTimeRef.current = 0; }
        heatRef.current = 0; isOverheatedRef.current = false;
        setWeaponStatus({ heat: 0, isOverheated: false, missileProgress: 1.0 });
      }
      if (newPhase === 'HELP') {
          helpPageRef.current = 0; helpEnemyIndexRef.current = 0;
          setHelpState({ page: 0, enemyIndex: 0 });
          if (helpShowcaseRef.current) { scene.remove(helpShowcaseRef.current); helpShowcaseRef.current = null; }
          clearEnemies();
      } else if (helpShowcaseRef.current) { scene.remove(helpShowcaseRef.current); helpShowcaseRef.current = null; }
    };

    if (DEBUG_PERF) console.log("Performance Profiler Initialized");

    // Main render loop: input -> particles -> game logic -> render
    const animate = (time: number) => {
      // PERF: Start Total
      let tStart = 0;
      if (DEBUG_PERF) tStart = performance.now();

      const deltaTime = time - lastFrameTimeRef.current;
      if (deltaTime < frameInterval) return;
      lastFrameTimeRef.current = time - (deltaTime % frameInterval);

      const now = performance.now();
      const dtSeconds = deltaTime / 1000;
      const timeScale = Math.min(deltaTime / frameInterval, 4.0);

      // PERF: Start Input
      let tInputStart = 0;
      if (DEBUG_PERF) tInputStart = performance.now();

      const { aimer, trigger } = inputProcessorRef.current.getHandData(handResultRef.current);
      setTrackingStatus({ aimer: !!aimer, trigger: !!trigger });
      
      // PERF: Start Particles
      let tParticlesStart = 0;
      if (DEBUG_PERF) tParticlesStart = performance.now();

      particles.update(timeScale);

      // PERF: Start Game Logic
      let tLogicStart = 0;
      if (DEBUG_PERF) tLogicStart = performance.now();

      if (phaseRef.current === 'PLAYING') totalPlayTimeRef.current += deltaTime;
      const playTimeSeconds = totalPlayTimeRef.current / 1000;

      if (isOverheatedRef.current) { if (now > overheatUnlockRef.current) { isOverheatedRef.current = false; heatRef.current = 0; } }
      else if (heatRef.current > 0) { heatRef.current = Math.max(0, heatRef.current - (WEAPON.COOLING_RATE * dtSeconds)); }

      const missileProgress = Math.min(1.0, (now - missileCooldownRef.current) / MISSILE.COOLDOWN_MS);
      if (Math.abs(heatRef.current - lastHeatUpdateRef.current) > 1.0 || isOverheatedRef.current !== (heatRef.current >= WEAPON.MAX_HEAT) || Math.abs(missileProgress - lastMissileProgressRef.current) > 0.01) {
         setWeaponStatus({ heat: heatRef.current, isOverheated: isOverheatedRef.current, missileProgress });
         lastHeatUpdateRef.current = heatRef.current; lastMissileProgressRef.current = missileProgress;
      }

      recoilRef.current *= 0.85; shakeRef.current *= 0.9;
      // Adjust camera shake but maintain adaptive Z
      const currentCamZ = camera.position.z;
      camera.position.set(
          (Math.random()-0.5)*shakeRef.current, 
          (Math.random()-0.5)*shakeRef.current, 
          currentCamZ
      );
      gunPivot.position.z = recoilRef.current;

      if (propsRef.current.lives === 0 && phaseRef.current !== 'GAMEOVER') setGamePhase('GAMEOVER');

      startGroup.visible = phaseRef.current === 'READY';
      pauseGroup.visible = phaseRef.current === 'PAUSED';
      gameOverGroup.visible = phaseRef.current === 'GAMEOVER';
      enemyGroup.visible = phaseRef.current === 'PLAYING' || phaseRef.current === 'GAMEOVER';
      
      if (phaseRef.current === 'HELP') {
          helpGroup.visible = helpSpotlight.visible = true;
          if (helpPageRef.current === 0) {
              helpGroup.add(helpNextPageTargetObj.group); helpGroup.remove(helpCycleEnemyTargetObj.group);
              if (helpShowcaseRef.current) { scene.remove(helpShowcaseRef.current); helpShowcaseRef.current = null; }
          } else {
              helpGroup.add(helpNextPageTargetObj.group); helpGroup.add(helpCycleEnemyTargetObj.group);
              if (!helpShowcaseRef.current || helpShowcaseRef.current.userData.idx !== helpEnemyIndexRef.current) {
                  if (helpShowcaseRef.current) scene.remove(helpShowcaseRef.current);
                  // Not using pool for showcase (rare op), fine to create new
                  const mesh = EnemyFactory.createMesh(DIFFICULTY.ENEMIES[helpEnemyIndexRef.current].type, assets);
                  mesh.position.set(0, 0, SCENE_CONFIG.MENU_Z + 50); mesh.scale.setScalar(2.0);
                  mesh.userData.idx = helpEnemyIndexRef.current; scene.add(mesh); helpShowcaseRef.current = mesh;
              }
              if (helpShowcaseRef.current) {
                  helpShowcaseRef.current.rotation.y += 0.01 * timeScale;
                  helpShowcaseRef.current.rotation.x = Math.sin(now * 0.001) * 0.2;
                  const rot = helpShowcaseRef.current.getObjectByName('rotator');
                  if (rot) rot.rotateZ(0.05 * timeScale);
              }
          }
      } else helpGroup.visible = helpSpotlight.visible = false;

      if (phaseRef.current === 'PLAYING') {
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
              if (hb) hb.quaternion.copy(camQuat); // Billboarding optimization
              
              if (e.type === 'SCOUT') { e.mesh.position.x += Math.cos(now*0.005 + e.offset)*2.5*timeScale; e.mesh.position.y += Math.sin(now*0.008+e.offset)*1.5*timeScale; e.mesh.rotateZ(0.05*timeScale); } 
              else if (e.type === 'INTERCEPTOR') { e.mesh.position.x += Math.cos(now*0.003+e.offset)*3.0*timeScale; e.mesh.position.y += Math.sin(now*0.003+e.offset)*3.0*timeScale; e.mesh.rotateZ(0.15*timeScale); }
              else if (e.type === 'WRAITH') { e.mesh.position.x += Math.sin(now*0.001+e.offset)*0.8*timeScale; e.mesh.position.y += Math.cos(now*0.0015+e.offset)*0.8*timeScale; const c=e.mesh.getObjectByName('rotator'); if(c){ c.rotateX(0.02*timeScale); c.rotateY(0.03*timeScale); } }
              else if (e.type === 'STANDARD') { const r=e.mesh.getObjectByName('rotator'); if(r) r.rotateZ(0.1*timeScale); }
              else if (e.type === 'ELITE') { e.mesh.rotateY(0.02*timeScale); }
              else e.mesh.position.y += Math.sin(now*0.002+e.offset)*0.2*timeScale;
              
              if (e.mesh.position.y < SCENE_CONFIG.TARGET_Y + 10 || e.mesh.position.z > 60) {
                onDamage(15); shakeRef.current += 15; 
                removeEnemy(i); // Use swap-and-pop removal
              }
          }
      }

      for (let i = 0; i < bulletPoolRef.current.length; i++) {
        const b = bulletPoolRef.current[i];
        if (!b.active) continue;
        b.prevPosition.copy(b.mesh.position); 
        b.mesh.position.addScaledVector(b.velocity, timeScale);
        b.mesh.updateMatrix(); // Manual Update
        
        _bulletSeg.set(b.prevPosition, b.mesh.position);
        let hit = false;
        
        const checkTarget = (obj: any, next: GamePhase, resetScore = false, action?: () => void) => {
            _v3.setFromMatrixPosition(obj.group.matrixWorld);
            _bulletSeg.closestPointToPoint(_v3, true, _closestPt);
            if (_closestPt.distanceTo(_v3) < obj.radius) {
                particles.spawnImpact(_v3, 0x00ffff); if (action) action();
                else { if (resetScore) onReset(); setGamePhase(next); }
                hit = true;
            }
        };

        if (phaseRef.current === 'READY') checkTarget(startTargetObj, 'PLAYING');
        if (phaseRef.current === 'GAMEOVER') checkTarget(rebootTargetObj, 'READY', true);
        if (phaseRef.current === 'PAUSED') {
            checkTarget(resumeTargetObj, 'PLAYING');
            if(!hit) checkTarget(restartTargetObj, 'READY', true);
            if(!hit) checkTarget(recalibrateTargetObj, 'CALIBRATING');
            if(!hit) checkTarget(intelTargetObj, 'HELP');
        }
        if (phaseRef.current === 'HELP') {
            checkTarget(helpReturnTargetObj, 'PAUSED');
            if (!hit) checkTarget(helpNextPageTargetObj, 'HELP', false, () => { helpPageRef.current = helpPageRef.current === 0 ? 1 : 0; setHelpState(s => ({ ...s, page: helpPageRef.current })); });
            if (!hit && helpPageRef.current === 1) checkTarget(helpCycleEnemyTargetObj, 'HELP', false, () => { helpEnemyIndexRef.current = (helpEnemyIndexRef.current + 1) % DIFFICULTY.ENEMIES.length; setHelpState(s => ({ ...s, enemyIndex: helpEnemyIndexRef.current })); });
        }

        if (phaseRef.current === 'PLAYING' && !hit) {
            for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                const e = enemiesRef.current[j];
                if (Math.abs(e.mesh.position.z - b.mesh.position.z) > 100) continue;
                
                // CRITICAL ARCHITECTURE NOTE:
                // We use e.mesh.position (Direct Local Position) instead of e.mesh.matrixWorld.
                // REASON: matrixWorld updates happen at the end of the frame in Three.js standard loop,
                // or are manually triggered. Since we manually update Bullet matrices but not Enemy matrices
                // in this loop, matrixWorld lags one frame behind visually.
                // Using .position ensures detection matches exactly where the enemy is drawn this frame.
                _targetPos.copy(e.mesh.position);
                
                _bulletSeg.closestPointToPoint(_targetPos, true, _closestPt);
                if (_closestPt.distanceTo(_targetPos) < e.hitRadius) {
                    e.hp--;
                    if (e.hp <= 0) { 
                        onScoreUpdate(e.points); 
                        spawnExplosion(_targetPos, false, e.type); 
                        removeEnemy(j); // Swap-and-Pop
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
                       removeEnemy(j); // Swap-and-Pop
                   }
                   else updateEnemyHealth(e);
               }
           }
           scene.remove(m.mesh); missilesRef.current.splice(i, 1);
        } else m.mesh.rotateZ(0.2 * timeScale);
      }

      if (aimer) {
          const { isPauseGesture, isPinching, isFist, tip } = inputProcessorRef.current.detectGestures(aimer, trigger);
          if (phaseRef.current === 'PLAYING' && now - pauseGestureCooldown.current > 0) {
              if (isPauseGesture && (pauseHoldStartTimeRef.current === 0 || now - pauseHoldStartTimeRef.current > PAUSE_HOLD_TIME_MS)) {
                  if (pauseHoldStartTimeRef.current === 0) pauseHoldStartTimeRef.current = now;
                  else { setGamePhase('PAUSED'); pauseHoldStartTimeRef.current = 0; }
              } else if (!isPauseGesture) pauseHoldStartTimeRef.current = 0;
          }
          if (trigger) {
              if (phaseRef.current === 'CALIBRATING') {
                  if (isPinching && now - phaseTransitionTime.current > 800) {
                      if (calibrationHoldStartTimeRef.current === 0) calibrationHoldStartTimeRef.current = now;
                      const progress = Math.min((now - calibrationHoldStartTimeRef.current) / CALIBRATION_HOLD_TIME_MS, 1.0);
                      setCalibrationProgress(progress);
                      if (progress >= 1.0) { calibrationPoint.current = { x: tip.x, y: tip.y }; setGamePhase('READY'); }
                  } else { calibrationHoldStartTimeRef.current = 0; setCalibrationProgress(0); }
              }
              if (phaseRef.current !== 'CALIBRATING') {
                  if (isFist && now - missileCooldownRef.current > MISSILE.COOLDOWN_MS) {
                      missileCooldownRef.current = now; recoilRef.current = 25.0; 
                      gunPivot.getWorldQuaternion(_q1); _v1.setFromMatrixPosition(muzzle.matrixWorld); _v2.copy(_forward).applyQuaternion(_q1); 
                      const m = new THREE.Mesh(assets.assets.geos.missile, assets.assets.mats.missile);
                      m.position.copy(_v1); m.quaternion.copy(_q1); scene.add(m);
                      
                      // CRITICAL ARCHITECTURE NOTE:
                      // We must .clone() the velocity vector here.
                      // _v2 is a shared global vector used for aiming calculations.
                      // If we pass it by reference, the missile's velocity will change every frame
                      // as the player moves their hand, causing the missile to "steer" with the hand.
                      // Cloning ensures "Fire and Forget" behavior.
                      const missileVel = _v2.clone().multiplyScalar(MISSILE.SPEED);
                      
                      missileIdCounter.current++; 
                      missilesRef.current.push({ mesh: m, velocity: missileVel, startTime: now, id: missileIdCounter.current });
                  } else if (isPinching && !isFist && now - fireCooldownRef.current > WEAPON.FIRE_RATE_MS && !isOverheatedRef.current) {
                    fireCooldownRef.current = now; recoilRef.current = 12.0;
                    heatRef.current = Math.min(WEAPON.MAX_HEAT, heatRef.current + WEAPON.HEAT_PER_SHOT);
                    if (heatRef.current >= WEAPON.MAX_HEAT) { isOverheatedRef.current = true; overheatUnlockRef.current = now + WEAPON.OVERHEAT_PENALTY_MS; }
                    gunPivot.getWorldQuaternion(_q1); _v1.setFromMatrixPosition(muzzle.matrixWorld); _v2.copy(_forward).applyQuaternion(_q1).multiplyScalar(BULLET_SPEED); _v3.copy(_right).applyQuaternion(_q1);
                    spawnBullet(_v4.copy(_v1).addScaledVector(_v3, -2.0), _q1, _v2, now);
                    spawnBullet(_v4.copy(_v1).addScaledVector(_v3, 2.0), _q1, _v2, now);
                  }
              }
          }
          if (phaseRef.current !== 'CALIBRATING') {
              // Pass _euler to be filled by calculateRotation (No allocation)
              inputProcessorRef.current.calculateRotation(tip, calibrationPoint.current, now, _euler);
              gunPivot.rotation.set(_euler.x, _euler.y, 0);
              
              // CRITICAL ARCHITECTURE NOTE:
              // We force an immediate update of the Gun Anchor's World Matrix.
              // This is required because we just set the rotation above.
              // If we don't update now, the `muzzle.matrixWorld` accessed below for Raycasting
              // will rely on the *previous frame's* position, causing bullets to spawn "behind" the gun
              // during fast flick shots.
              gunAnchor.updateMatrixWorld(true);

              _v1.setFromMatrixPosition(muzzle.matrixWorld); gunPivot.getWorldQuaternion(_q1); _v2.copy(_forward).applyQuaternion(_q1);
              raycaster.set(_v1, _v2);
              if (raycaster.ray.intersectPlane(menuPlane, _v3)) {
                  reticle.position.copy(_v3); reticle.lookAt(camera.position); reticle.visible = true;
                  const pos = laser.geometry.attributes.position;
                  pos.setXYZ(0, _v1.x, _v1.y, _v1.z); pos.setXYZ(1, _v3.x, _v3.y, _v3.z); pos.needsUpdate = true; laser.visible = true;
              }
          }
      } else { reticle.visible = laser.visible = false; pauseHoldStartTimeRef.current = 0; if (phaseRef.current === 'CALIBRATING') { calibrationHoldStartTimeRef.current = 0; setCalibrationProgress(0); } }

      camera.lookAt(0, 10, -500);

      // PERF: Start Render
      let tRenderStart = 0;
      if (DEBUG_PERF) tRenderStart = performance.now();
      
      renderer.render(scene, camera);

      if (DEBUG_PERF) {
          const tEnd = performance.now();
          perfRef.current.inputTime += (tParticlesStart - tInputStart);
          perfRef.current.particleTime += (tLogicStart - tParticlesStart);
          perfRef.current.logicTime += (tRenderStart - tLogicStart);
          perfRef.current.renderTime += (tEnd - tRenderStart);
          perfRef.current.totalTime += (tEnd - tStart);
          perfRef.current.frames++;

          if (perfRef.current.frames >= 60) {
             const f = perfRef.current.frames;
             console.log(`[PERF] Frame breakdown (${f} frames avg): ` + 
                 `Input: ${(perfRef.current.inputTime / f).toFixed(2)}ms | ` +
                 `Particles: ${(perfRef.current.particleTime / f).toFixed(2)}ms | ` +
                 `Logic: ${(perfRef.current.logicTime / f).toFixed(2)}ms | ` +
                 `Render: ${(perfRef.current.renderTime / f).toFixed(2)}ms | ` +
                 `TOTAL: ${(perfRef.current.totalTime / f).toFixed(2)}ms`);
             perfRef.current = { frames: 0, inputTime: 0, particleTime: 0, logicTime: 0, renderTime: 0, totalTime: 0 };
          }
      }
    };

    renderer.setAnimationLoop(animate);
    const handleResize = () => { 
        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / h;
        
        camera.aspect = aspect;
        camera.updateProjectionMatrix(); 
        renderer.setSize(w, h);

        // --- ADAPTIVE PORTRAIT MODE ---
        if (aspect < 1.0) {
            camera.position.z = SCENE_CONFIG.CAMERA_Z + (80 * (1 - aspect));
        } else {
            camera.position.z = SCENE_CONFIG.CAMERA_Z;
        }

        // --- DYNAMIC PAUSE MENU ALIGNMENT ---
        // Calculate the visible width at the MENU depth (Z = -220)
        // Distance from camera to menu plane
        const dist = camera.position.z - SCENE_CONFIG.MENU_Z;
        
        // Visible height at this distance = 2 * dist * tan(fov/2)
        // Three.js default FOV is 75 degrees.
        const vFOV = THREE.MathUtils.degToRad(75);
        const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
        const visibleWidth = visibleHeight * camera.aspect;

        // Position targets to match the CSS percentages (15%, 37.5%, 62.5%, 85%)
        // Center is 0. Coordinates are relative to center.
        // 15% from left = -35% from center -> x = -0.35 * width
        // 37.5% from left = -12.5% from center -> x = -0.125 * width
        
        restartTargetObj.group.position.x = -0.35 * visibleWidth;
        restartTargetObj.group.updateMatrix();
        
        recalibrateTargetObj.group.position.x = -0.125 * visibleWidth;
        recalibrateTargetObj.group.updateMatrix();
        
        intelTargetObj.group.position.x = 0.125 * visibleWidth;
        intelTargetObj.group.updateMatrix();
        
        resumeTargetObj.group.position.x = 0.35 * visibleWidth;
        resumeTargetObj.group.updateMatrix();
    };
    
    // Initial call
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => { 
        window.removeEventListener('resize', handleResize); 
        renderer.setAnimationLoop(null);
        assetManagerRef.current?.dispose();
        particleSystemRef.current?.dispose();
        renderer.dispose(); 
        scene.clear(); 
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