import * as THREE from 'three';
import { PAUSE_HOLD_TIME_MS } from '../../config/constants';
import { PhaseManager, HelpState } from '../PhaseManager';
import { describe, expect, it } from 'vitest';

const createManager = () => {
  const startGroup = new THREE.Group();
  const pauseGroup = new THREE.Group();
  const gameOverGroup = new THREE.Group();
  const enemyGroup = new THREE.Group();
  const helpGroup = new THREE.Group();
  const helpSpotlight = new THREE.Group();
  const scene = new THREE.Scene();

  const helpStates: HelpState[] = [];

  const manager = new PhaseManager({
    visibilityTargets: { startGroup, pauseGroup, gameOverGroup, enemyGroup, helpGroup, helpSpotlight },
    scene,
    onHelpStateChange: state => helpStates.push(state),
  });

  return { manager, groups: { startGroup, pauseGroup, gameOverGroup, enemyGroup, helpGroup, helpSpotlight }, scene, helpStates };
};

describe('PhaseManager transitions', () => {
  it('blocks disallowed transitions and updates visibility on valid moves', () => {
    const { manager, groups } = createManager();

    expect(manager.transitionTo('PLAYING')).toBe(false);
    expect(manager.getPhase()).toBe('CALIBRATING');

    expect(manager.transitionTo('READY')).toBe(true);
    expect(groups.startGroup.visible).toBe(true);
    expect(groups.enemyGroup.visible).toBe(false);

    expect(manager.transitionTo('PLAYING')).toBe(true);
    expect(groups.enemyGroup.visible).toBe(true);
    expect(groups.pauseGroup.visible).toBe(false);

    expect(manager.transitionTo('PAUSED')).toBe(true);
    expect(groups.pauseGroup.visible).toBe(true);
    expect(groups.enemyGroup.visible).toBe(false);
  });

  it('resets help state when entering help and clears showcases on exit', () => {
    const { manager, scene, helpStates } = createManager();

    manager.transitionTo('READY');
    manager.transitionTo('PLAYING');
    manager.transitionTo('PAUSED');
    manager.transitionTo('HELP');

    expect(manager.getHelpState()).toEqual({ page: 0, enemyIndex: 0 });
    expect(helpStates.at(-1)).toEqual({ page: 0, enemyIndex: 0 });

    manager.toggleHelpPage();
    expect(manager.getHelpState().page).toBe(1);

    const showcase = new THREE.Group();
    scene.add(showcase);
    manager.setHelpShowcase(showcase);
    expect(scene.children.includes(showcase)).toBe(true);

    manager.transitionTo('PAUSED');
    expect(scene.children.includes(showcase)).toBe(false);
    expect(manager.getHelpShowcase()).toBeNull();
  });

  it('honors hold timers for pause interactions', () => {
    const { manager } = createManager();

    manager.transitionTo('READY');
    manager.transitionTo('PLAYING');

    const pauseStart = manager.getLastTransitionTime();
    expect(manager.updatePauseHold(true, pauseStart + 10)).toBe(false);
    expect(manager.updatePauseHold(true, pauseStart + PAUSE_HOLD_TIME_MS + 20)).toBe(true);
  });
});
