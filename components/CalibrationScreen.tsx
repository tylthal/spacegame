import React, { useEffect, useState, useRef } from 'react';
import { HandTracker, HandFrame, HandLandmark } from '../input/HandTracker';
import * as fp from 'fingerpose';
import { PointGesture, PinchGesture } from '../input/Gestures';
import { CALIBRATION_CONFIG } from '../input/calibrationConfig';

interface CalibrationScreenProps {
    tracker: HandTracker | null;
    onComplete: (offset: { x: number; y: number }) => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
    tracker,
    onComplete
}) => {
    const [rightPointDetected, setRightPointDetected] = useState(false);
    const [leftPinchDetected, setLeftPinchDetected] = useState(false);
    const [progress, setProgress] = useState(0);
    const [failureReason, setFailureReason] = useState<string | null>(null);

    // Use ref for isSuccess to avoid stale closure in interval
    const isSuccessRef = useRef(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Track last detection time for stability
    const lastRightPointRef = useRef<number>(0);
    const lastLeftPinchRef = useRef<number>(0);
    const lastValidTimeRef = useRef<number>(0);

    // Store wrist positions for spatial separation check
    const leftWristRef = useRef<{ x: number, y: number } | null>(null);
    const rightWristRef = useRef<{ x: number, y: number } | null>(null);

    const calibrationStartTimeRef = useRef<number | null>(null);

    // Calibration Data Collection (now stores {x, y} objects)
    const positionBufferRef = useRef<{ x: number; y: number }[]>([]);
    const finalCalibrationOffsetRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

    // Destructure config for cleaner code
    const {
        STABILITY_REQUIRED_MS,
        DETECTION_TIMEOUT_MS,
        GRACE_PERIOD_MS,
        SPATIAL_SEPARATION_THRESHOLD,
        MOVEMENT_THRESHOLD,
        PINCH_DISTANCE_THRESHOLD,
        FINGERPOSE_SCORE_THRESHOLD,
        ZONE_LEFT_MAX,
        ZONE_RIGHT_MIN,
    } = CALIBRATION_CONFIG;

    useEffect(() => {
        if (!tracker) {
            console.warn("CalibrationScreen: No tracker provided");
            return;
        }

        // Initialize Fingerpose Estimator for BOTH hands
        const estimator = new fp.GestureEstimator([PointGesture, PinchGesture]);

        const handleFrame = (frame: HandFrame) => {
            if (isSuccessRef.current) return; // Stop processing after success

            const now = Date.now();
            const landmarksArray = frame.landmarks.map(l => [l.x, l.y, l.z]);

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const estimation = estimator.estimate(landmarksArray as any, 7.5);

                if (frame.handedness === 'Right') {
                    const pointMatch = estimation.gestures.find(g => g.name === 'point');
                    if (pointMatch && pointMatch.score > FINGERPOSE_SCORE_THRESHOLD) {
                        lastRightPointRef.current = now;
                        rightWristRef.current = { x: frame.landmarks[0].x, y: frame.landmarks[0].y };
                        setRightPointDetected(true);
                    }
                } else if (frame.handedness === 'Left') {
                    // Try fingerpose first
                    const pinchMatch = estimation.gestures.find(g => g.name === 'pinch');

                    // Also check distance-based pinch as fallback (more reliable for actual pinching)
                    const thumbTip = frame.landmarks[4];
                    const indexTip = frame.landmarks[8];
                    const wrist = frame.landmarks[0];
                    const handSize = Math.hypot(
                        frame.landmarks[12].x - wrist.x,
                        frame.landmarks[12].y - wrist.y
                    );
                    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
                    const normalizedPinch = pinchDist / Math.max(handSize, 0.01);

                    if ((pinchMatch && pinchMatch.score > 6) || normalizedPinch < PINCH_DISTANCE_THRESHOLD) {
                        lastLeftPinchRef.current = now;
                        leftWristRef.current = { x: wrist.x, y: wrist.y };
                        setLeftPinchDetected(true);
                    }
                }
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.error('Fingerpose estimation error:', err);
                }
            }
        };

        // Polling loop for staleness and progress
        const intervalId = setInterval(() => {
            if (isSuccessRef.current) return;

            const now = Date.now();

            // Check staleness
            if (now - lastRightPointRef.current > DETECTION_TIMEOUT_MS) {
                setRightPointDetected(false);
                rightWristRef.current = null;
            }
            if (now - lastLeftPinchRef.current > DETECTION_TIMEOUT_MS) {
                setLeftPinchDetected(false);
                leftWristRef.current = null;
            }

            // Check progress requirements
            const rightActive = now - lastRightPointRef.current < DETECTION_TIMEOUT_MS;
            const leftActive = now - lastLeftPinchRef.current < DETECTION_TIMEOUT_MS;

            let spatialValid = false;
            let zonesValid = false;
            let currentReason: string | null = null;

            if (!rightActive && !leftActive) {
                currentReason = "Show Both Hands";
            } else if (!rightActive) {
                currentReason = "Right Hand Lost";
            } else if (!leftActive) {
                currentReason = "Left Hand Lost";
            } else if (leftWristRef.current && rightWristRef.current) {
                const lx = leftWristRef.current.x;
                const rx = rightWristRef.current.x;

                const dx = lx - rx;
                const dy = leftWristRef.current.y - rightWristRef.current.y;
                const dist = Math.hypot(dx, dy);

                // 1. Min Distance Check
                if (dist > SPATIAL_SEPARATION_THRESHOLD) {
                    spatialValid = true;
                } else {
                    currentReason = "Hands Too Close";
                }

                // 2. Zone Check
                if (spatialValid) {
                    if (lx < ZONE_LEFT_MAX && rx > ZONE_RIGHT_MIN) {
                        zonesValid = true;
                    } else {
                        if (lx >= ZONE_LEFT_MAX) currentReason = "Move Left Hand Left";
                        else if (rx <= ZONE_RIGHT_MIN) currentReason = "Move Right Hand Right";
                    }
                }
            }

            if (rightActive && leftActive && spatialValid && zonesValid) {
                // Check Movement Stability
                const currentPos = {
                    x: rightWristRef.current?.x || 0.5,
                    y: rightWristRef.current?.y || 0.5
                };
                const prevPos = positionBufferRef.current.length > 0
                    ? positionBufferRef.current[positionBufferRef.current.length - 1]
                    : currentPos;
                const delta = Math.hypot(currentPos.x - prevPos.x, currentPos.y - prevPos.y);

                if (delta > MOVEMENT_THRESHOLD) {
                    currentReason = "Hold Steady";
                    setFailureReason("Hold Steady");

                    // Reset if moving too much
                    calibrationStartTimeRef.current = null;
                    setProgress(0);
                    positionBufferRef.current = [];
                } else {
                    // STABLE & VALID
                    lastValidTimeRef.current = now;
                    setFailureReason(null);

                    if (!calibrationStartTimeRef.current) {
                        calibrationStartTimeRef.current = now;
                        positionBufferRef.current = [];
                    }

                    // Accumulate position for averaging (both X and Y)
                    positionBufferRef.current.push(currentPos);

                    const elapsed = now - calibrationStartTimeRef.current;
                    const p = Math.min(elapsed / STABILITY_REQUIRED_MS, 1);
                    setProgress(p);

                    if (elapsed >= STABILITY_REQUIRED_MS) {
                        // Success! Compute Average for both axes
                        const sumX = positionBufferRef.current.reduce((a, b) => a + b.x, 0);
                        const sumY = positionBufferRef.current.reduce((a, b) => a + b.y, 0);
                        const len = positionBufferRef.current.length;
                        finalCalibrationOffsetRef.current = {
                            x: sumX / len,
                            y: sumY / len
                        };
                        isSuccessRef.current = true;
                        setIsSuccess(true);
                    }
                }
            } else {
                // INVALID STATE - check grace period
                if (now - lastValidTimeRef.current < GRACE_PERIOD_MS) {
                    setFailureReason("Adjusting...");
                } else {
                    calibrationStartTimeRef.current = null;
                    setProgress(0);
                    positionBufferRef.current = [];
                    setFailureReason(currentReason || "Signal Dropped");
                }
            }
        }, 50);

        const unsubscribe = tracker.subscribe(handleFrame);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [tracker]);

    return (
        <>
            {/* Debug Overlay */}
            <div className="fixed top-20 left-4 text-[10px] font-mono text-y2k-yellow/50 pointer-events-none z-50 whitespace-pre bg-black/80 p-2 border border-y2k-yellow/20">
                {`DEBUG_STREAM:\nL_POS: ${leftWristRef.current ? `[${leftWristRef.current.x.toFixed(2)}, ${leftWristRef.current.y.toFixed(2)}]` : 'NULL'}\nR_POS: ${rightWristRef.current ? `[${rightWristRef.current.x.toFixed(2)}, ${rightWristRef.current.y.toFixed(2)}]` : 'NULL'}\nERR: ${failureReason || 'NONE'}`}
            </div>

            {/* Zone Indicators */}
            <div className="fixed inset-0 z-30 pointer-events-none">
                <div
                    className="absolute top-0 bottom-0 w-px bg-y2k-yellow/20"
                    style={{ left: `${ZONE_LEFT_MAX * 100}%` }}
                />
                <div
                    className="absolute top-0 bottom-0 w-px bg-y2k-yellow/20"
                    style={{ left: `${ZONE_RIGHT_MIN * 100}%` }}
                />
                <div
                    className="absolute top-1/2 text-y2k-yellow/30 font-mono text-xs -translate-y-1/2"
                    style={{ left: `${(ZONE_LEFT_MAX / 2) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                >
                    LEFT ZONE
                </div>
                <div
                    className="absolute top-1/2 text-y2k-yellow/30 font-mono text-xs -translate-y-1/2"
                    style={{ left: `${((1 - ZONE_RIGHT_MIN) / 2 + ZONE_RIGHT_MIN) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                >
                    RIGHT ZONE
                </div>
            </div>

            {/* Main Calibration UI */}
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-6xl p-4 flex flex-col items-center relative pointer-events-auto">

                    {/* Header */}
                    <div className="w-full border-b-4 border-y2k-yellow mb-12 flex justify-between items-end pb-2">
                        <h2 className="text-6xl font-display font-bold text-y2k-yellow tracking-tighter uppercase">
                            {isSuccess ? 'SYSTEM_LOCKED' : 'HARDWARE_SYNC'}
                        </h2>
                        <p className="text-y2k-white font-mono text-xs mb-2 animate-pulse">
                            {isSuccess ? '>>> UPLOAD_COMPLETE' : '>>> ESTABLISHING_NEURAL_LINK...'}
                        </p>
                    </div>

                    {!isSuccess ? (
                        <div className="flex flex-row justify-center items-stretch space-x-8 w-full">

                            {/* Left Hand Card */}
                            <div className={`relative p-8 border-2 transition-all duration-0 w-96 flex flex-col justify-between h-96
                                ${leftPinchDetected ? 'bg-y2k-yellow border-y2k-yellow' : 'bg-black/50 border-y2k-white/30'}`}>

                                <div>
                                    <div className={`text-xs font-mono mb-2 ${leftPinchDetected ? 'text-black' : 'text-y2k-silver'}`}>INPUT_SOURCE_01</div>
                                    <div className={`text-6xl font-display font-bold mb-0 ${leftPinchDetected ? 'text-black' : 'text-y2k-white'}`}>LEFT</div>
                                    <div className={`text-4xl font-body font-bold ${leftPinchDetected ? 'text-black' : 'text-y2k-silver'}`}>PINCH</div>
                                </div>

                                <div className={`text-lg font-mono px-2 py-1 border-2 text-center uppercase font-bold
                                    ${leftPinchDetected ? 'border-black text-black' : 'border-y2k-red text-y2k-red animate-pulse'}`}>
                                    {leftPinchDetected ? 'SIGNAL_FOUND' : 'NO_SIGNAL'}
                                </div>
                            </div>

                            {/* CENTER PROGRESS */}
                            <div className="w-24 flex flex-col justify-end items-center bg-black/50 border border-y2k-white/10 p-2">
                                <div className="w-full bg-y2k-white/10 h-full relative flex flex-col justify-end overflow-hidden">
                                    <div
                                        className="w-full bg-y2k-yellow transition-all duration-75 ease-linear"
                                        style={{ height: `${progress * 100}%` }}
                                    />
                                </div>
                                <div className="mt-2 font-mono text-y2k-yellow text-xl font-bold">
                                    {(progress * 100).toFixed(0)}%
                                </div>
                            </div>

                            {/* Right Hand Card */}
                            <div className={`relative p-8 border-2 transition-all duration-0 w-96 flex flex-col justify-between h-96
                                ${rightPointDetected ? 'bg-y2k-yellow border-y2k-yellow' : 'bg-black/50 border-y2k-white/30'}`}>

                                <div>
                                    <div className={`text-xs font-mono mb-2 ${rightPointDetected ? 'text-black' : 'text-y2k-silver'}`}>INPUT_SOURCE_02</div>
                                    <div className={`text-6xl font-display font-bold mb-0 ${rightPointDetected ? 'text-black' : 'text-y2k-white'}`}>RIGHT</div>
                                    <div className={`text-4xl font-body font-bold ${rightPointDetected ? 'text-black' : 'text-y2k-silver'}`}>POINT</div>
                                </div>

                                <div className={`text-lg font-mono px-2 py-1 border-2 text-center uppercase font-bold
                                    ${rightPointDetected ? 'border-black text-black' : 'border-y2k-red text-y2k-red animate-pulse'}`}>
                                    {rightPointDetected ? 'SIGNAL_FOUND' : 'NO_SIGNAL'}
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="w-full bg-y2k-yellow p-12 flex flex-col items-center justify-center text-black space-y-8 animate-in zoom-in duration-200">
                            <h1 className="text-9xl font-display font-bold tracking-tighter">ACCESS GRANTED</h1>
                            <div className="h-2 w-full bg-black"></div>
                            <p className="font-mono text-xl tracking-widest">
                                ZERO_POINT: X={finalCalibrationOffsetRef.current.x.toFixed(4)}, Y={finalCalibrationOffsetRef.current.y.toFixed(4)}
                            </p>

                            <button
                                onClick={() => onComplete(finalCalibrationOffsetRef.current)}
                                className="px-16 py-6 bg-black text-y2k-yellow font-display font-bold text-4xl uppercase hover:bg-white hover:text-black transition-colors"
                            >
                                ENTER_VOID
                            </button>
                        </div>
                    )}

                    {/* Status Text */}
                    {!isSuccess && (
                        <div className="mt-12 h-16 flex items-center justify-center w-full bg-black/80 border-t border-y2k-white/20">
                            {failureReason ? (
                                <p className="text-3xl font-body text-y2k-red font-bold tracking-widest uppercase animate-glitch">
                                    /// ERROR: {failureReason} ///
                                </p>
                            ) : (
                                <p className={`text-2xl font-body tracking-wider uppercase transition-colors duration-0
                                    ${(rightPointDetected && leftPinchDetected) ? 'text-y2k-yellow animate-pulse' : 'text-y2k-silver'}`}>
                                    {(rightPointDetected && leftPinchDetected) ? '>>> HOLD_STEADY_FOR_SYNC <<<' : 'WAITING_FOR_INPUT...'}
                                </p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </>
    );
};
