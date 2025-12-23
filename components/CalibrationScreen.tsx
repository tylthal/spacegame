import React, { useEffect, useState, useRef } from 'react';
import { WebcamPreview } from './WebcamPreview';
import { HandTracker, HandFrame, HandLandmark } from '../input/HandTracker';
import * as fp from 'fingerpose';
import { PointGesture } from '../input/Gestures';

interface CalibrationScreenProps {
    onStreamReady: (video: HTMLVideoElement) => void;
    onError: (err: Error) => void;
    calibrationProgress: number; // 0 to 1
    tracker: HandTracker | null;
    onComplete: (offset: number) => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
    onStreamReady,
    onError,
    tracker,
    onComplete
}) => {
    const [rightPointDetected, setRightPointDetected] = useState(false);
    const [leftPinchDetected, setLeftPinchDetected] = useState(false);
    const [progress, setProgress] = useState(0);
    const [failureReason, setFailureReason] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false); // Sticky success state

    // Track last detection time for stability
    const lastRightPointRef = useRef<number>(0);
    const lastLeftPinchRef = useRef<number>(0);
    const lastValidTimeRef = useRef<number>(0); // For grace period

    // Store wrist positions for spatial separation check to prevent single-hand alias
    const leftWristRef = useRef<{ x: number, y: number } | null>(null);
    const rightWristRef = useRef<{ x: number, y: number } | null>(null);

    const calibrationStartTimeRef = useRef<number | null>(null);

    // Constants
    const STABILITY_REQUIRED_MS = 4000; // 4 seconds
    const DETECTION_TIMEOUT_MS = 200; // Strict timeout
    const GRACE_PERIOD_MS = 500; // Time allowed to be invalid before reset
    const SPATIAL_SEPARATION_THRESHOLD = 0.2; // Min distance between wrists (normalized 0-1)
    const MOVEMENT_THRESHOLD = 0.01; // Max allowed movement per frame for "stillness"

    // Calibration Data Collection
    const positionBufferRef = useRef<number[]>([]);
    const finalCalibrationOffsetRef = useRef<number>(0.5);

    useEffect(() => {
        if (!tracker) {
            console.warn("CalibrationScreen: No tracker provided");
            return;
        }

        // Initialize Fingerpose Estimator for Right Hand
        const estimator = new fp.GestureEstimator([PointGesture]);

        const handleFrame = (frame: HandFrame) => {
            const now = Date.now();
            if (frame.handedness === 'Right') {
                // Fingerpose expects array of arrays [x,y,z]
                // MediaPipe gives objects {x,y,z}. We MUST map them.
                const landmarksArray = frame.landmarks.map(l => [l.x, l.y, l.z]);

                // Estimate using a slightly relaxed threshold
                const estimation = estimator.estimate(landmarksArray, 7.5);

                if (estimation.gestures.length > 0) {
                    // Find the gesture with highest confidence
                    const best = estimation.gestures.reduce((p, c) => (p.confidence > c.confidence ? p : c));

                    // Console Log for Debugging
                    // console.log(`Gesture: ${best.name} Score: ${best.score}`);

                    if (best.name === 'point' && best.score > 8) {
                        lastRightPointRef.current = now;
                        rightWristRef.current = { x: frame.landmarks[0].x, y: frame.landmarks[0].y };
                        setRightPointDetected(true);
                    }
                } else {
                    // console.log("No gesture match");
                }

            } else if (frame.handedness === 'Left') {
                if (isPinchGesture(frame.landmarks)) {
                    lastLeftPinchRef.current = now;
                    leftWristRef.current = { x: frame.landmarks[0].x, y: frame.landmarks[0].y };
                    setLeftPinchDetected(true);
                }
            }
        };

        // Polling loop for staleness and progress
        const intervalId = setInterval(() => {
            if (isSuccess) return; // Stop logic if already succeeded

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
                currentReason = "Show Both Hands"; // Friendlier
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
                    currentReason = "Hands Too Close"; // Friendlier
                }

                // 2. Zone Check (Left < 0.6, Right > 0.4)
                if (spatialValid) {
                    if (lx < 0.6 && rx > 0.4) {
                        zonesValid = true;
                    } else {
                        if (lx >= 0.6) currentReason = "Move Left Hand Left";
                        else if (rx <= 0.4) currentReason = "Move Right Hand Right";
                    }
                }
            }

            if (rightActive && leftActive && spatialValid && zonesValid) {
                // Check Movement Stability (Stationary Hold)
                const currentRX = rightWristRef.current?.x || 0.5;
                const prevRX = positionBufferRef.current.length > 0 ? positionBufferRef.current[positionBufferRef.current.length - 1] : currentRX;
                const delta = Math.abs(currentRX - prevRX);

                if (delta > MOVEMENT_THRESHOLD) {
                    currentReason = "Hold Steady"; // Too much jitter
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
                        positionBufferRef.current = []; // Start fresh buffer
                    }

                    // Accumulate position for averaging
                    positionBufferRef.current.push(currentRX);

                    const elapsed = now - calibrationStartTimeRef.current;
                    const p = Math.min(elapsed / STABILITY_REQUIRED_MS, 1);
                    setProgress(p);

                    if (elapsed >= STABILITY_REQUIRED_MS) {
                        // Success! Compute Average
                        const sum = positionBufferRef.current.reduce((a, b) => a + b, 0);
                        const avg = sum / positionBufferRef.current.length;
                        finalCalibrationOffsetRef.current = avg;
                        setIsSuccess(true);
                    }
                }
            } else {
                // INVALID STATE
                // Check grace period
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
    }, [tracker, onComplete, isSuccess]);

    // Circular Progress Component
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <>
            {/* Debug Overlay - Raw Code Style */}
            <div className="fixed top-20 left-4 text-[10px] font-mono text-y2k-yellow/50 pointer-events-none z-50 whitespace-pre bg-black/80 p-2 border border-y2k-yellow/20">
                {`DEBUG_STREAM:\nL_POS: ${leftWristRef.current ? `[${leftWristRef.current.x.toFixed(2)}, ${leftWristRef.current.y.toFixed(2)}]` : 'NULL'}\nR_POS: ${rightWristRef.current ? `[${rightWristRef.current.x.toFixed(2)}, ${rightWristRef.current.y.toFixed(2)}]` : 'NULL'}\nERR: ${failureReason || 'NONE'}`}
            </div>

            {/* Main Calibration UI */}
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-6xl p-4 flex flex-col items-center relative pointer-events-auto">

                    {/* Header - Terminal Style */}
                    <div className="w-full border-b-4 border-y2k-yellow mb-12 flex justify-between items-end pb-2">
                        <h2 className="text-6xl font-display font-bold text-y2k-yellow tracking-tighter uppercase">
                            {isSuccess ? 'SYSTEM_LOCKED' : 'HARDWARE_SYNC'}
                        </h2>
                        <p className="text-y2k-white font-mono text-xs mb-2 animate-pulse">
                            {isSuccess ? '>>> UPLOAD_COMPLETE' : '>>> ESTABLISHING_NEURAL_LINK...'}
                        </p>
                    </div>

                    {!isSuccess ? (
                        /* CALIBRATION MODE */
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

                            {/* CENTER PROGRESS - Hard Bar */}
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
                        /* SUCCESS MODE - Crash Screen */
                        <div className="w-full bg-y2k-yellow p-12 flex flex-col items-center justify-center text-black space-y-8 animate-in zoom-in duration-200">
                            <h1 className="text-9xl font-display font-bold tracking-tighter">ACCESS GRANTED</h1>
                            <div className="h-2 w-full bg-black"></div>
                            <p className="font-mono text-xl tracking-widest">
                                ZERO_POINT_OFFSET: {finalCalibrationOffsetRef.current.toFixed(4)}
                            </p>

                            <button
                                onClick={() => onComplete(finalCalibrationOffsetRef.current)}
                                className="px-16 py-6 bg-black text-y2k-yellow font-display font-bold text-4xl uppercase hover:bg-white hover:text-black transition-colors"
                            >
                                ENTER_VOID
                            </button>
                        </div>
                    )}

                    {/* Status Text / Failure Reason */}
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

function isPinchGesture(landmarks: ReadonlyArray<HandLandmark>): boolean {
    const d = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
    return d < 0.05; // Tightened from 0.08
}
