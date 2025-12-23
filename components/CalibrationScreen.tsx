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
    onComplete: () => void;
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
                // VALID STATE
                lastValidTimeRef.current = now;
                setFailureReason(null);

                if (!calibrationStartTimeRef.current) {
                    calibrationStartTimeRef.current = now;
                }
                const elapsed = now - calibrationStartTimeRef.current;
                const p = Math.min(elapsed / STABILITY_REQUIRED_MS, 1);
                setProgress(p);

                if (elapsed >= STABILITY_REQUIRED_MS) {
                    setIsSuccess(true);
                }
            } else {
                // INVALID STATE
                // Check grace period
                if (now - lastValidTimeRef.current < GRACE_PERIOD_MS) {
                    // Within grace period: Pause progress, do not reset yet
                    // Keep the current progress value frozen
                    setFailureReason("Adjusting...");
                } else {
                    // Grace period expired: Reset
                    calibrationStartTimeRef.current = null;
                    setProgress(0);
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
            {/* Debug Overlay */}
            <div className="fixed top-20 left-4 text-[10px] font-mono text-cyan-500/50 pointer-events-none z-50 whitespace-pre">
                {`DEBUG:\nL: ${leftWristRef.current ? `(${leftWristRef.current.x.toFixed(2)}, ${leftWristRef.current.y.toFixed(2)})` : '--'}\nR: ${rightWristRef.current ? `(${rightWristRef.current.x.toFixed(2)}, ${rightWristRef.current.y.toFixed(2)})` : '--'}\nReason: ${failureReason || 'OK'}`}
            </div>

            {/* Main Calibration UI - Full Screen Centered */}
            <div
                className="fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0
                }}
            >
                <div className="max-w-7xl w-full p-4 space-y-8 text-center flex flex-col items-center relative">

                    {/* Header */}
                    <div className="space-y-3 pointer-events-none select-none">
                        <h2 className="text-4xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                            {isSuccess ? 'SYSTEM ONLINE' : 'System Configuration'}
                        </h2>
                        <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase opacity-80">
                            {isSuccess ? '// READY FOR COMBAT //' : '// Establish Neural Handshake //'}
                        </p>
                    </div>

                    {!isSuccess ? (
                        /* CALIBRATION MODE */
                        <div className="relative w-full flex justify-center items-center py-12 animate-in fade-in duration-500">
                            {/* Zone Divider */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-500/30 border-r border-dashed border-cyan-500/50 transform -translate-x-1/2 pointer-events-none h-full" />

                            {/* Zone Labels */}
                            <div className="absolute top-4 left-1/4 text-cyan-900/40 text-6xl font-black uppercase tracking-widest pointer-events-none select-none">LEFT ZONE</div>
                            <div className="absolute top-4 right-1/4 text-cyan-900/40 text-6xl font-black uppercase tracking-widest pointer-events-none select-none">RIGHT ZONE</div>


                            <div className="flex flex-row justify-center items-center space-x-12 lg:space-x-32 w-full z-10">
                                {/* Left Hand Status Card */}
                                <div className={`relative p-6 rounded-2xl border transition-all duration-300 w-80 h-72 flex flex-col justify-center items-center backdrop-blur-sm
                                    ${leftPinchDetected
                                        ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                                        : 'border-slate-800 bg-slate-900/40 opacity-70'}`}>
                                    <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Left_Sensor</div>
                                    <div className={`text-3xl font-bold mb-2 ${leftPinchDetected ? 'text-white' : 'text-slate-400'}`}>LEFT HAND</div>
                                    <div className="text-xl font-mono text-cyan-300 mb-2">"PINCH"</div>
                                    <div className="text-sm text-slate-400 mb-6">Touch Index & Thumb</div>
                                    <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase duration-200
                                        ${leftPinchDetected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                        {leftPinchDetected ? 'SIGNAL LOCKED' : 'SEARCHING...'}
                                    </div>
                                </div>

                                {/* Central Spinner (Abstract) */}
                                <div className="relative w-[240px] h-[240px] flex items-center justify-center flex-shrink-0">
                                    <div className="absolute inset-0 pointer-events-none">
                                        <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 200 200">
                                            <circle
                                                className="text-slate-900"
                                                strokeWidth="12"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r={radius}
                                                cx="100"
                                                cy="100"
                                            />
                                            <circle
                                                className="text-cyan-400 transition-all duration-200 ease-linear"
                                                strokeWidth="12"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="transparent"
                                                r={radius}
                                                cx="100"
                                                cy="100"
                                            />
                                        </svg>
                                    </div>
                                    {/* Center Icon */}
                                    <div className={`flex flex-col items-center justify-center transition-all duration-300`}>
                                        <div className={`text-4xl mb-2 ${progress >= 1 ? 'text-cyan-400 scale-125' : 'text-slate-700'}`}>
                                            {progress >= 1 ? '✓' : '⟁'}
                                        </div>
                                        <div className="text-xs font-mono text-cyan-500/80">
                                            {(progress * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Right Hand Status Card */}
                                <div className={`relative p-6 rounded-2xl border transition-all duration-300 w-80 h-72 flex flex-col justify-center items-center backdrop-blur-sm
                                    ${rightPointDetected
                                        ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                                        : 'border-slate-800 bg-slate-900/40 opacity-70'}`}>
                                    <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Right_Sensor</div>
                                    <div className={`text-3xl font-bold mb-2 ${rightPointDetected ? 'text-white' : 'text-slate-400'}`}>RIGHT HAND</div>
                                    <div className="text-xl font-mono text-cyan-300 mb-2">"POINT"</div>
                                    <div className="text-sm text-slate-400 mb-6">Extend Index Finger</div>
                                    <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase duration-200
                                        ${rightPointDetected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                        {rightPointDetected ? 'SIGNAL LOCKED' : 'SEARCHING...'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* SUCCESS MODE */
                        <div className="flex flex-col items-center justify-center py-16 space-y-8 animate-in zoom-in duration-500">
                            <div className="w-32 h-32 rounded-full bg-cyan-500/20 border-4 border-cyan-400 flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.4)]">
                                <span className="text-6xl text-cyan-200">✓</span>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white tracking-widest">CALIBRATION COMPLETE</h3>
                                <p className="text-slate-400 font-mono">Neural link established. Combat systems localized.</p>
                            </div>
                            <button
                                onClick={onComplete}
                                className="px-12 py-4 bg-cyan-500 text-slate-900 font-black text-xl tracking-[0.2em] rounded hover:bg-cyan-400 hover:scale-105 transition-all shadow-lg hover:shadow-cyan-500/50"
                            >
                                [ ENTER VOID ]
                            </button>
                        </div>
                    )}

                    {/* Status Text / Failure Reason (Only in Calibration Mode) */}
                    {!isSuccess && (
                        <div className="h-12 flex items-center justify-center">
                            {failureReason ? (
                                <p className="text-amber-400 font-bold tracking-widest uppercase animate-pulse">
                                    [ {failureReason} ]
                                </p>
                            ) : (
                                <p className={`text-lg font-mono tracking-widest uppercase transition-colors duration-300
                                    ${(rightPointDetected && leftPinchDetected) ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`}>
                                    {(rightPointDetected && leftPinchDetected) ? '/// HOLD POSITION ///' : 'AWAITING DUAL INPUT...'}
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
