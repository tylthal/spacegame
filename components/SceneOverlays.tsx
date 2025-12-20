import React from 'react';
import { GamePhase, TrackingStatus } from '../types';
import WeaponStatus from './ui/WeaponStatus';
import CalibrationOverlay from './ui/CalibrationOverlay';
import ReadyOverlay from './ui/ReadyOverlay';
import PauseOverlay from './ui/PauseOverlay';
import GameOverOverlay from './ui/GameOverOverlay';
import HelpOverlay from './ui/HelpOverlay';

interface WeaponStatusData {
    heat: number;
    isOverheated: boolean;
    missileProgress: number;
}

interface HelpState {
    page: number; // 0: Mechanics, 1: Enemies
    enemyIndex: number;
}

interface Props {
  phase: GamePhase;
  score: number;
  calibrationProgress: number;
  trackingStatus: TrackingStatus;
  weaponStatus: WeaponStatusData;
  helpState?: HelpState;
}

const SceneOverlays: React.FC<Props> = ({ phase, score, calibrationProgress, trackingStatus, weaponStatus, helpState }) => {
  return (
    <>
      {/* HUD Elements */}
      {(phase === 'PLAYING' || phase === 'READY') && (
        <WeaponStatus 
            heat={weaponStatus.heat} 
            isOverheated={weaponStatus.isOverheated} 
            missileProgress={weaponStatus.missileProgress} 
        />
      )}

      {/* Overlays */}
      {phase === 'CALIBRATING' && (
        <CalibrationOverlay progress={calibrationProgress} trackingStatus={trackingStatus} />
      )}

      {phase === 'READY' && <ReadyOverlay />}

      {phase === 'PAUSED' && <PauseOverlay />}

      {phase === 'GAMEOVER' && <GameOverOverlay score={score} />}
      
      {phase === 'HELP' && helpState && <HelpOverlay helpState={helpState} />}
    </>
  );
};

export default SceneOverlays;
