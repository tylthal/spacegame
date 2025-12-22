import { useEffect, useRef, useState } from 'react';
import { GamePhase, TrackingStatus } from '../../types';
import { HelpState } from '../../systems/PhaseManager';
import { WeaponStatus } from '../../systems/WeaponController';

export interface CalibrationStatus {
  stalled: boolean;
  cameraReady?: boolean;
  permissionPending?: boolean;
  fallbackCta?: boolean;
  message?: string;
}

export interface OverlayState {
  phase: GamePhase;
  score: number;
  calibrationProgress: number;
  trackingStatus: TrackingStatus;
  weaponStatus: WeaponStatus;
  helpState?: HelpState;
  calibrationStatus?: CalibrationStatus;
}

const cloneState = (state: OverlayState): OverlayState => ({
  ...state,
  trackingStatus: { ...state.trackingStatus },
  weaponStatus: { ...state.weaponStatus },
  helpState: state.helpState ? { ...state.helpState } : undefined,
  calibrationStatus: state.calibrationStatus ? { ...state.calibrationStatus } : undefined,
});

const isEqual = (a: OverlayState, b: OverlayState) =>
  a.phase === b.phase &&
  a.score === b.score &&
  a.calibrationProgress === b.calibrationProgress &&
  a.trackingStatus.aimer === b.trackingStatus.aimer &&
  a.trackingStatus.trigger === b.trackingStatus.trigger &&
  a.trackingStatus.health === b.trackingStatus.health &&
  a.weaponStatus.heat === b.weaponStatus.heat &&
  a.weaponStatus.isOverheated === b.weaponStatus.isOverheated &&
  a.weaponStatus.missileProgress === b.weaponStatus.missileProgress &&
  ((!a.calibrationStatus && !b.calibrationStatus) ||
    (!!a.calibrationStatus &&
      !!b.calibrationStatus &&
      a.calibrationStatus.stalled === b.calibrationStatus.stalled &&
      a.calibrationStatus.cameraReady === b.calibrationStatus.cameraReady &&
      a.calibrationStatus.permissionPending === b.calibrationStatus.permissionPending &&
      a.calibrationStatus.fallbackCta === b.calibrationStatus.fallbackCta &&
      a.calibrationStatus.message === b.calibrationStatus.message)) &&
  ((!a.helpState && !b.helpState) ||
    (!!a.helpState && !!b.helpState &&
      a.helpState.page === b.helpState.page &&
      a.helpState.enemyIndex === b.helpState.enemyIndex));

/**
 * useOverlayStateAdapter
 * ----------------------
 * Consumes the high-frequency game refs and publishes overlay-friendly state at
 * a throttled cadence using requestIdleCallback when available. React re-renders
 * only when a shallow comparison shows meaningful changes.
 */
export const useOverlayStateAdapter = (
  sourceRef: React.MutableRefObject<OverlayState>,
  intervalMs = 90,
) => {
  const [overlayState, setOverlayState] = useState<OverlayState>(() => cloneState(sourceRef.current));
  const idleHandle = useRef<number | null>(null);
  const timeoutHandle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hasIdleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window;

    const schedule = () => {
      if (cancelled) return;
      if (hasIdleCallback) {
        idleHandle.current = (window as any).requestIdleCallback(tick, { timeout: intervalMs });
      } else {
        timeoutHandle.current = setTimeout(tick, intervalMs);
      }
    };

    const tick = () => {
      if (cancelled) return;
      const next = sourceRef.current;
      setOverlayState(prev => (isEqual(prev, next) ? prev : cloneState(next)));
      schedule();
    };

    schedule();

    return () => {
      cancelled = true;
      if (idleHandle.current !== null && hasIdleCallback) {
        (window as any).cancelIdleCallback(idleHandle.current);
      }
      if (timeoutHandle.current) clearTimeout(timeoutHandle.current);
    };
  }, [intervalMs, sourceRef]);

  return overlayState;
};

export default useOverlayStateAdapter;
