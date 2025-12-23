import React, { useEffect, useState, useRef } from 'react';
import { WebcamPreview } from './WebcamPreview';
import { HandTracker, HandFrame, HandLandmark } from '../input/HandTracker';

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
    const [rightGunDetected, setRightGunDetected] = useState(false);
    const [leftPinchDetected, setLeftPinchDetected] = useState(false);
    const [progress, setProgress] = useState(0);

    // Track last detection time for stability
    const lastRightGunRef = useRef<number>(0);
    const lastLeftPinchRef = useRef<number>(0);
    const calibrationStartTimeRef = useRef<number | null>(null);

    // Constants
    const STABILITY_REQUIRED_MS = 4000; // 4 seconds
    const DETECTION_TIMEOUT_MS = 200; // Strict timeout

    useEffect(() => {
        if (!tracker) {
            console.warn("CalibrationScreen: No tracker provided");
            return;
        }

        const handleFrame = (frame: HandFrame) => {
            const now = Date.now();
            if (frame.handedness === 'Right') {
                if (isGunGesture(frame.landmarks)) {
                    lastRightGunRef.current = now;
                    setRightGunDetected(true);
                }
            } else if (frame.handedness === 'Left') {
                if (isPinchGesture(frame.landmarks)) {
                    lastLeftPinchRef.current = now;
                    setLeftPinchDetected(true);
                }
            }
        };

        // Polling loop for staleness and progress
        const intervalId = setInterval(() => {
            const now = Date.now();

            // Check staleness
            if (now - lastRightGunRef.current > DETECTION_TIMEOUT_MS) {
                setRightGunDetected(false);
            }
            if (now - lastLeftPinchRef.current > DETECTION_TIMEOUT_MS) {
                setLeftPinchDetected(false);
            }

            // Check progress
            const rightActive = now - lastRightGunRef.current < DETECTION_TIMEOUT_MS;
            const leftActive = now - lastLeftPinchRef.current < DETECTION_TIMEOUT_MS;

            if (rightActive && leftActive) {
                if (!calibrationStartTimeRef.current) {
                    calibrationStartTimeRef.current = now;
                }
                const elapsed = now - calibrationStartTimeRef.current;
                const p = Math.min(elapsed / STABILITY_REQUIRED_MS, 1);
                setProgress(p);

                if (elapsed >= STABILITY_REQUIRED_MS) {
                    onComplete();
                }
            } else {
                calibrationStartTimeRef.current = null;
                setProgress(0);
            }
        }, 50);

        const unsubscribe = tracker.subscribe(handleFrame);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [tracker, onComplete]);

    // Circular Progress Component
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <>
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
                <div className="max-w-6xl w-full p-8 space-y-12 text-center flex flex-col items-center relative">

                    {/* Header */}
                    <div className="space-y-3 pointer-events-none select-none">
                        <h2 className="text-4xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                            System Configuration
                        </h2>
                        <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase opacity-80">
                            // Establish Neural Handshake //
                        </p>
                    </div>

                    {/* Interactive Hand Cards Row */}
                    <div className="flex flex-row justify-center items-center space-x-12 lg:space-x-24 w-full">

                        {/* Left Hand Status Card */}
                        <div className={`relative p-6 rounded-2xl border transition-all duration-300 w-72 h-64 flex flex-col justify-center items-center backdrop-blur-sm
                            ${leftPinchDetected
                                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                                : 'border-slate-800 bg-slate-900/40 opacity-70'}`}>
                            <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Left_Sensor</div>
                            <div className={`text-2xl font-bold mb-2 ${leftPinchDetected ? 'text-white' : 'text-slate-400'}`}>LEFT HAND</div>
                            <div className="text-lg font-mono text-cyan-300 mb-2">"PINCH"</div>
                            <div className="text-xs text-slate-400 mb-6">Touch Index & Thumb</div>
                            <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase duration-200
                                ${leftPinchDetected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                {leftPinchDetected ? 'SIGNAL LOCKED' : 'SEARCHING...'}
                            </div>
                        </div>

                        {/* Central Spinner (Abstract) */}
                        <div className="relative w-[200px] h-[200px] flex items-center justify-center flex-shrink-0">
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
                                        className={`transition-all duration-200 ease-linear ${progress > 0 ? 'text-cyan-400' : 'text-transparent'}`}
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
                            <div className={`text-4xl transition-all duration-300 ${progress >= 1 ? 'text-cyan-400 scale-125' : 'text-slate-700'}`}>
                                {progress >= 1 ? '✓' : '⟁'}
                            </div>
                        </div>

                        {/* Right Hand Status Card */}
                        <div className={`relative p-6 rounded-2xl border transition-all duration-300 w-72 h-64 flex flex-col justify-center items-center backdrop-blur-sm
                            ${rightGunDetected
                                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                                : 'border-slate-800 bg-slate-900/40 opacity-70'}`}>
                            <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Right_Sensor</div>
                            <div className={`text-2xl font-bold mb-2 ${rightGunDetected ? 'text-white' : 'text-slate-400'}`}>RIGHT HAND</div>
                            <div className="text-lg font-mono text-cyan-300 mb-2">"GUN"</div>
                            <div className="text-xs text-slate-400 mb-6">Extend Thumb & Index</div>
                            <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase duration-200
                                ${rightGunDetected ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                                {rightGunDetected ? 'SIGNAL LOCKED' : 'SEARCHING...'}
                            </div>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="space-y-4">
                        <p className={`text-sm font-mono tracking-widest uppercase transition-colors duration-300
                            ${(rightGunDetected && leftPinchDetected) ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`}>
                            {(rightGunDetected && leftPinchDetected) ? '/// HOLD POSITION // CALIBRATING (4s) ///' : 'AWAITING DUAL INPUT...'}
                        </p>
                    </div>

                </div>
            </div>

            {/* Webcam Preview - Fixed Bottom Right Window */}
            {/* Using inline styles to guarantee positioning */}
            <div
                className="fixed w-64 aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl z-50 pointer-events-none"
                style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '300px', height: '170px' }}
            >
                <WebcamPreview onStreamReady={onStreamReady} onError={err => onError(new Error(err.message))} />

                {/* Minimal Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-2 right-2 flex space-x-1">
                        <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-red-500 font-mono">LIVE</span>
                    </div>
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,40,60,0.2)_50%)] bg-[length:100%_4px] pointer-events-none" />
            </div>
        </>
    );
};

function isGunGesture(landmarks: ReadonlyArray<HandLandmark>): boolean {
    const wrist = landmarks[0];
    const dist = (a: HandLandmark, b: HandLandmark) => Math.hypot(a.x - b.x, a.y - b.y);
    const isExtended = (tipIdx: number, pipIdx: number) => dist(landmarks[tipIdx], wrist) > dist(landmarks[pipIdx], wrist);
    return isExtended(8, 6) && isExtended(4, 3) && !isExtended(12, 10) && !isExtended(16, 14) && !isExtended(20, 18);
}

function isPinchGesture(landmarks: ReadonlyArray<HandLandmark>): boolean {
    const d = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
    return d < 0.08;
}
