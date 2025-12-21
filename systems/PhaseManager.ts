import * as THREE from 'three';
import { CALIBRATION_HOLD_TIME_MS, PAUSE_HOLD_TIME_MS } from '../config/constants';
import { GamePhase } from '../types';

export type HelpState = { page: number; enemyIndex: number };

interface VisibilityTargets {
  startGroup: THREE.Group;
  pauseGroup: THREE.Group;
  gameOverGroup: THREE.Group;
  enemyGroup: THREE.Group;
  helpGroup: THREE.Group;
  helpSpotlight: THREE.Object3D;
}

interface PhaseManagerOptions {
  visibilityTargets: VisibilityTargets;
  scene?: THREE.Scene;
  initialPhase?: GamePhase;
  onPhaseChange?: (phase: GamePhase) => void;
  onHelpStateChange?: (state: HelpState) => void;
  onTransition?: (phase: GamePhase) => void;
  phaseHandlers?: Partial<Record<GamePhase, () => void>>;
}

const ACTIVATION_DELAY_MS = 800;

export class PhaseManager {
  private current: GamePhase;
  private transitionTime: number;
  private pauseHoldStart: number;
  private calibrationHoldStart: number;
  private helpState: HelpState;
  private helpShowcase: THREE.Group | null;
  private readonly visibilityTargets: VisibilityTargets;
  private readonly onPhaseChange?: (phase: GamePhase) => void;
  private readonly onHelpStateChange?: (state: HelpState) => void;
  private readonly onTransition?: (phase: GamePhase) => void;
  private readonly phaseHandlers?: Partial<Record<GamePhase, () => void>>;
  private readonly scene?: THREE.Scene;

  private static transitions: Record<GamePhase, GamePhase[]> = {
    CALIBRATING: ['READY'],
    READY: ['PLAYING'],
    PLAYING: ['PAUSED', 'GAMEOVER'],
    PAUSED: ['PLAYING', 'READY', 'CALIBRATING', 'HELP'],
    HELP: ['PAUSED'],
    GAMEOVER: ['READY'],
  };

  constructor(options: PhaseManagerOptions) {
    const { visibilityTargets, onPhaseChange, onHelpStateChange, onTransition, phaseHandlers, scene, initialPhase = 'CALIBRATING' } = options;
    this.visibilityTargets = visibilityTargets;
    this.current = initialPhase;
    this.transitionTime = performance.now();
    this.pauseHoldStart = 0;
    this.calibrationHoldStart = 0;
    this.helpState = { page: 0, enemyIndex: 0 };
    this.helpShowcase = null;
    this.onPhaseChange = onPhaseChange;
    this.onHelpStateChange = onHelpStateChange;
    this.onTransition = onTransition;
    this.phaseHandlers = phaseHandlers;
    this.scene = scene;

    this.applyVisibility(initialPhase);
    this.notifyHelpState();
  }

  getPhase(): GamePhase {
    return this.current;
  }

  canTransitionTo(next: GamePhase): boolean {
    return PhaseManager.transitions[this.current]?.includes(next) ?? false;
  }

  getHelpState(): HelpState {
    return { ...this.helpState };
  }

  getLastTransitionTime(): number {
    return this.transitionTime;
  }

  getHelpShowcase(): THREE.Group | null {
    return this.helpShowcase;
  }

  setHelpShowcase(mesh: THREE.Group | null): void {
    this.helpShowcase = mesh;
  }

  clearHelpShowcase(): void {
    if (this.helpShowcase && this.scene) {
      this.scene.remove(this.helpShowcase);
    }
    this.helpShowcase = null;
  }

  transitionTo(next: GamePhase): boolean {
    if (!this.canTransitionTo(next)) return false;

    const previousPhase = this.current;
    this.current = next;
    this.transitionTime = performance.now();
    this.pauseHoldStart = 0;
    this.calibrationHoldStart = 0;

    this.applyVisibility(next);

    if (next === 'HELP') {
      this.helpState = { page: 0, enemyIndex: 0 };
      this.notifyHelpState();
      this.clearHelpShowcase();
    }
    if (previousPhase === 'HELP' && next !== 'HELP') this.clearHelpShowcase();

    this.onPhaseChange?.(next);
    this.phaseHandlers?.[next]?.();
    this.onTransition?.(next);

    return true;
  }

  updatePauseHold(isGestureActive: boolean, now: number): boolean {
    if (this.current !== 'PLAYING') {
      this.pauseHoldStart = 0;
      return false;
    }

    if (!isGestureActive) {
      this.pauseHoldStart = 0;
      return false;
    }

    if (this.pauseHoldStart === 0) this.pauseHoldStart = now;

    if (now - this.pauseHoldStart >= PAUSE_HOLD_TIME_MS) {
      this.pauseHoldStart = 0;
      return true;
    }

    return false;
  }

  resetPauseHold(): void {
    this.pauseHoldStart = 0;
  }

  updateCalibrationHold(isPinching: boolean, now: number): { progress: number; completed: boolean } {
    if (this.current !== 'CALIBRATING' || !isPinching || now - this.transitionTime < ACTIVATION_DELAY_MS) {
      this.calibrationHoldStart = 0;
      return { progress: 0, completed: false };
    }

    if (this.calibrationHoldStart === 0) this.calibrationHoldStart = now;
    const elapsed = now - this.calibrationHoldStart;
    const progress = Math.min(elapsed / CALIBRATION_HOLD_TIME_MS, 1.0);

    if (progress >= 1) {
      this.calibrationHoldStart = 0;
      return { progress: 1, completed: true };
    }

    return { progress, completed: false };
  }

  toggleHelpPage(): HelpState {
    this.helpState.page = this.helpState.page === 0 ? 1 : 0;
    this.notifyHelpState();
    return this.getHelpState();
  }

  cycleHelpEnemy(totalEnemies: number): HelpState {
    if (totalEnemies > 0) {
      this.helpState.enemyIndex = (this.helpState.enemyIndex + 1) % totalEnemies;
      this.notifyHelpState();
    }
    return this.getHelpState();
  }

  private notifyHelpState() {
    this.onHelpStateChange?.(this.getHelpState());
  }

  private applyVisibility(phase: GamePhase) {
    const { startGroup, pauseGroup, gameOverGroup, enemyGroup, helpGroup, helpSpotlight } = this.visibilityTargets;
    startGroup.visible = phase === 'READY';
    pauseGroup.visible = phase === 'PAUSED';
    gameOverGroup.visible = phase === 'GAMEOVER';
    enemyGroup.visible = phase === 'PLAYING' || phase === 'GAMEOVER';
    helpGroup.visible = helpSpotlight.visible = phase === 'HELP';
  }
}

export default PhaseManager;
