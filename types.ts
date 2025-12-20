import * as THREE from 'three';

/**
 * Centralized Type Definitions
 * Stores shared types and interfaces used across the application to prevent circular dependencies.
 */

export type GamePhase = 'CALIBRATING' | 'READY' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'HELP';

export type EnemyType = 'STANDARD' | 'ELITE' | 'SCOUT' | 'INTERCEPTOR' | 'WRAITH' | 'DREADNOUGHT';

export interface TrackingStatus {
  aimer: boolean;   // Right Hand
  trigger: boolean; // Left Hand
}

export interface EnemyData {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  type: EnemyType;
  spawnX: number;
  spawnY: number;
  hitRadius: number;
  points: number;
  materials: THREE.Material[]; 
  offset: number;
  hp: number;
  maxHp: number;
}

export interface BulletData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  prevPosition: THREE.Vector3; // Used for continuous collision detection (CCD)
}

export interface MissileData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  id: number;
}