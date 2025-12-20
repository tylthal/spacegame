import * as THREE from 'three';
import { EnemyType } from '../types';

export const DIFFICULTY = {
  RAMP_UP_DURATION: 300, 
  START_SPAWN_CHANCE: 0.006, 
  MAX_SPAWN_CHANCE: 0.025,   
  MAX_ON_SCREEN: 6,          
  ENEMIES: [
    { type: 'STANDARD' as EnemyType,    weight: 100, unlockTime: 0,   points: 250,  speed: 4.5,  hp: 1, desc: "Standard drone. Spinning outer rim." },
    { type: 'SCOUT' as EnemyType,       weight: 60,  unlockTime: 30,  points: 500,  speed: 9.0,  hp: 1, desc: "High-speed recon unit. Hard to hit." },
    { type: 'ELITE' as EnemyType,       weight: 40,  unlockTime: 60,  points: 1000, speed: 5.5,  hp: 2, desc: "Armored cruiser. Dual-hull shielding." },
    { type: 'INTERCEPTOR' as EnemyType, weight: 30,  unlockTime: 120, points: 750,  speed: 7.0,  hp: 1, desc: "Agile fighter. Corkscrew evasion pattern." },
    { type: 'WRAITH' as EnemyType,      weight: 15,  unlockTime: 180, points: 1200, speed: 4.0,  hp: 1, desc: "Phased energy core. Rotating shield cage." },
    { type: 'DREADNOUGHT' as EnemyType, weight: 5,   unlockTime: 240, points: 3000, speed: 3.0,  hp: 25, desc: "Capital ship. Massive structural integrity." },
  ]
};

export const WEAPON = {
  FIRE_RATE_MS: 160,
  HEAT_PER_SHOT: 14.0,
  COOLING_RATE: 45.0,
  OVERHEAT_PENALTY_MS: 2000,
  MAX_HEAT: 100.0
};

export const MISSILE = {
  COOLDOWN_MS: 2000,
  SPEED: 25.0,
  PROXIMITY_RADIUS: 120.0,
  BLAST_RADIUS: 350.0,
  DAMAGE: 5,
  LIFESPAN_MS: 5000,
  FIST_THRESHOLD: 0.15
};

export const AIM = {
  INPUT_SENSITIVITY: 3.0, 
  MAX_YAW: 1.6,   
  MAX_PITCH: 1.0, 
  FILTER_BETA: 0.06,
  FILTER_MIN_CUTOFF: 0.8
};

export const SCENE_CONFIG = {
  MENU_Z: -220,
  SPAWN_Y: 2200,
  SPAWN_Z: -5000,
  SPAWN_X_RANGE: 5000,
  TARGET_Y: -140,
  TARGET_Z: 20,
  GUN_POS: new THREE.Vector3(0, -20, 15),
  CAMERA_Z: 40,
  MAX_PARTICLES: 12000
};

export const BULLET_LIFESPAN = 3000;
export const BULLET_SPEED = 38.0; 
export const PINCH_THRESHOLD = 0.03;
export const PAUSE_HOLD_TIME_MS = 600;
export const CALIBRATION_HOLD_TIME_MS = 2500;

export const ENEMY_INFO_UI = [
    { name: "Standard", desc: "Common drone. Spinning kinetic rim.", stats: "HP: Low | SPD: Avg" },
    { name: "Scout", desc: "High-speed recon. Hard to hit.", stats: "HP: Low | SPD: High" },
    { name: "Elite", desc: "Armored cruiser. Shielded hull.", stats: "HP: Med | SPD: Avg" },
    { name: "Interceptor", desc: "Agile fighter. Evasive maneuvers.", stats: "HP: Low | SPD: High" },
    { name: "Wraith", desc: "Phased energy core. Ghostly movement.", stats: "HP: Med | SPD: Low" },
    { name: "Dreadnought", desc: "Capital Class. Massive integrity.", stats: "HP: Boss | SPD: Low" },
];
