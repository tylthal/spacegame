import { HandFrame, HandLandmark } from '../HandTracker';

const baseTimestamp = 1710000000000;

const wrist: HandLandmark = { x: 0.5, y: 0.8, z: 0.02 };
const thumbCmc: HandLandmark = { x: 0.45, y: 0.78, z: 0.02 };
const thumbMcp: HandLandmark = { x: 0.42, y: 0.75, z: 0.02 };
const thumbIp: HandLandmark = { x: 0.4, y: 0.72, z: 0.02 };
const thumbTipOpen: HandLandmark = { x: 0.38, y: 0.68, z: 0.02 };
const thumbTipPinch: HandLandmark = { x: 0.49, y: 0.63, z: 0.02 };
const thumbTipFist: HandLandmark = { x: 0.42, y: 0.76, z: 0.02 }; // Thumb curled, away from index

const indexMcp: HandLandmark = { x: 0.5, y: 0.7, z: 0.02 };
const indexPip: HandLandmark = { x: 0.52, y: 0.6, z: 0.02 };
const indexDip: HandLandmark = { x: 0.54, y: 0.52, z: 0.02 };
const indexTipOpen: HandLandmark = { x: 0.56, y: 0.46, z: 0.02 };
const indexTipPinch: HandLandmark = { x: 0.5, y: 0.62, z: 0.02 };
const indexTipFist: HandLandmark = { x: 0.52, y: 0.78, z: 0.02 };

const middleMcp: HandLandmark = { x: 0.54, y: 0.71, z: 0.02 };
const middlePip: HandLandmark = { x: 0.56, y: 0.62, z: 0.02 };
const middleDip: HandLandmark = { x: 0.58, y: 0.52, z: 0.02 };
const middleTipOpen: HandLandmark = { x: 0.6, y: 0.44, z: 0.02 };
const middleTipFist: HandLandmark = { x: 0.55, y: 0.8, z: 0.02 };

const ringMcp: HandLandmark = { x: 0.58, y: 0.72, z: 0.02 };
const ringPip: HandLandmark = { x: 0.6, y: 0.64, z: 0.02 };
const ringDip: HandLandmark = { x: 0.61, y: 0.55, z: 0.02 };
const ringTipOpen: HandLandmark = { x: 0.62, y: 0.48, z: 0.02 };
const ringTipFist: HandLandmark = { x: 0.55, y: 0.82, z: 0.02 };

const pinkyMcp: HandLandmark = { x: 0.62, y: 0.74, z: 0.02 };
const pinkyPip: HandLandmark = { x: 0.64, y: 0.67, z: 0.02 };
const pinkyDip: HandLandmark = { x: 0.65, y: 0.6, z: 0.02 };
const pinkyTipOpen: HandLandmark = { x: 0.66, y: 0.52, z: 0.02 };
const pinkyTipFist: HandLandmark = { x: 0.56, y: 0.83, z: 0.02 };

function buildHand(thumbTip: HandLandmark, indexTip: HandLandmark, middleTip: HandLandmark, ringTip: HandLandmark, pinkyTip: HandLandmark): readonly HandLandmark[] {
  return [
    wrist,
    thumbCmc,
    thumbMcp,
    thumbIp,
    thumbTip,
    indexMcp,
    indexPip,
    indexDip,
    indexTip,
    middleMcp,
    middlePip,
    middleDip,
    middleTip,
    ringMcp,
    ringPip,
    ringDip,
    ringTip,
    pinkyMcp,
    pinkyPip,
    pinkyDip,
    pinkyTip,
  ];
}

export const openPalmFrame: HandFrame = {
  timestamp: baseTimestamp,
  handedness: 'Right',
  landmarks: buildHand(thumbTipOpen, indexTipOpen, middleTipOpen, ringTipOpen, pinkyTipOpen),
};

export const pinchFrame: HandFrame = {
  timestamp: baseTimestamp + 10,
  handedness: 'Right',
  landmarks: buildHand(thumbTipPinch, indexTipPinch, middleTipOpen, ringTipOpen, pinkyTipOpen),
};

export const fistFrame: HandFrame = {
  timestamp: baseTimestamp + 20,
  handedness: 'Right',
  landmarks: buildHand(thumbTipFist, indexTipFist, middleTipFist, ringTipFist, pinkyTipFist),
};

export const jitteredOpenPalm = (delta: number, timestampOffset: number): HandFrame => ({
  timestamp: baseTimestamp + timestampOffset,
  handedness: 'Right',
  landmarks: buildHand(
    { ...thumbTipOpen, x: thumbTipOpen.x + delta },
    { ...indexTipOpen, x: indexTipOpen.x + delta },
    { ...middleTipOpen, x: middleTipOpen.x + delta },
    { ...ringTipOpen, x: ringTipOpen.x + delta },
    { ...pinkyTipOpen, x: pinkyTipOpen.x + delta },
  ),
});
