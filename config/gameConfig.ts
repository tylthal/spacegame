import type { EnemyKind } from '../rendering/EnemyFactory';

/**
 * Centralized Game Configuration
 * 
 * Single source of truth for game balance, physics, and behavior settings.
 * Modify these values to tune gameplay without hunting through multiple files.
 */

export const GAME_CONFIG = {
    // Combat settings
    combat: {
        /** Starting hull integrity for the space station */
        hull: 100,
        /** Milliseconds between bullet shots when firing */
        fireIntervalMs: 125,
        /** Hitbox radius per enemy type (must match rendering) */
        enemyRadius: {
            drone: 1.5,
            scout: 2.0,
            bomber: 2.5
        } as Record<EnemyKind, number>,
        /** Movement speed per millisecond per enemy type */
        enemySpeedPerMs: {
            drone: 0.02,
            scout: 0.015,
            bomber: 0.01
        } as Record<EnemyKind, number>,
        /** Hull damage dealt per enemy type when they reach the station */
        enemyDamage: {
            drone: 5,
            scout: 8,
            bomber: 15
        } as Record<EnemyKind, number>,
        /** Distance from camera where enemies spawn */
        spawnRadius: 400,
        /** Bullet speed multiplier per millisecond */
        bulletSpeed: 0.18,
        /** Maximum concurrent enemies on screen */
        maxEnemies: 6,
    },

    // Weapon heat system
    heat: {
        /** Heat generated per bullet fired */
        perShot: 4,
        /** Heat dissipation rate per millisecond when not firing */
        cooldownRatePerMs: 0.015,
        /** Maximum heat before overheat */
        maxHeat: 100,
        /** Heat threshold to exit overheat state */
        recoveryThreshold: 30,
    },

    // Missile system
    missile: {
        /** Cooldown between missile launches in milliseconds */
        cooldownMs: 3000,
        /** Missile speed multiplier per millisecond */
        speed: 0.08,
        /** Proximity distance to trigger detonation (larger = easier to hit) */
        detonationProximity: 14,
        /** Delay in ms after triggering before explosion */
        detonationDelayMs: 500,
        /** Blast radius for area damage (larger = more enemies hit) */
        blastRadius: 30,
    },

    // Pause gesture detection
    pause: {
        /** Hold time required for both-palm pause gesture */
        holdMs: 600,
        /** Minimum consecutive frames with palm gesture */
        minFrames: 5,
    },

    // Scoring
    scoring: {
        drone: 100,
        scout: 200,
        bomber: 500,
    },

    // Difficulty settings
    difficulty: {
        easy: {
            speedMultiplier: 0.6,
            label: 'EASY',
            description: 'Slower enemies for beginners',
        },
        normal: {
            speedMultiplier: 1.0,
            label: 'NORMAL',
            description: 'Standard challenge',
        },
        hard: {
            speedMultiplier: 1.4,
            label: 'HARD',
            description: 'Fast enemies for veterans',
        },
    },
} as const;

// Difficulty type
export type Difficulty = 'easy' | 'normal' | 'hard';

// Type exports for consumers
export type GameConfig = typeof GAME_CONFIG;
export type CombatConfig = typeof GAME_CONFIG.combat;
export type HeatConfig = typeof GAME_CONFIG.heat;
export type MissileConfig = typeof GAME_CONFIG.missile;
export type DifficultyConfig = typeof GAME_CONFIG.difficulty;
