import React from 'react';
import WeaponStatus from './ui/WeaponStatus';
import CalibrationOverlay from './ui/CalibrationOverlay';
import ReadyOverlay from './ui/ReadyOverlay';
import PauseOverlay from './ui/PauseOverlay';
import GameOverOverlay from './ui/GameOverOverlay';
import HelpOverlay from './ui/HelpOverlay';
import { OverlayState } from './ui/OverlayStateAdapter';

type Props = OverlayState & {
  onStartWithoutTracking?: () => void;
  onRetryCamera?: () => void;
  onRestartCalibration?: () => void;
  onContinueFromCalibration?: () => void;
  videoStream?: MediaStream | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
};

const SceneOverlays: React.FC<Props> = ({
  phase,
  score,
  calibrationProgress,
  trackingStatus,
  weaponStatus,
  helpState,
  calibrationStatus,
  onStartWithoutTracking,
  onRetryCamera,
  onRestartCalibration,
  onContinueFromCalibration,
  videoStream,
  videoRef,
}) => {
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
        <CalibrationOverlay
          progress={calibrationProgress}
          trackingStatus={trackingStatus}
          calibrationStatus={calibrationStatus}
          onStartWithoutTracking={onStartWithoutTracking}
          onRetryCamera={onRetryCamera}
          onRestartCalibration={onRestartCalibration}
          onContinue={onContinueFromCalibration}
          videoStream={videoStream}
          videoRef={videoRef}
        />
      )}

      {phase === 'READY' && <ReadyOverlay />}

      {phase === 'PAUSED' && <PauseOverlay />}

      {phase === 'GAMEOVER' && <GameOverOverlay score={score} />}
      
      {phase === 'HELP' && helpState && <HelpOverlay helpState={helpState} />}
    </>
  );
};

export default SceneOverlays;
