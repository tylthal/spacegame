import React, { useEffect, useState, useRef, useCallback } from 'react';
import { HandFrame } from '../input/HandTracker';
import { InputProcessor, ProcessedHandEvent } from '../input/InputProcessor';
import { INPUT_CONFIG } from '../input/inputConfig';
import { CursorMapper } from '../input/CursorMapper';
import { HandCursor } from './HandCursor';

interface CalibrationScreenProps {
    inputProcessor: InputProcessor | null;
    onComplete: (offset: { x: number; y: number }) => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
    inputProcessor,
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

    // Store wrist positions
    const leftWristRef = useRef<{ x: number, y: number } | null>(null);
    const rightWristRef = useRef<{ x: number, y: number } | null>(null);

    const calibrationStartTimeRef = useRef<number | null>(null);

    // Calibration Data Collection
    const positionBufferRef = useRef<{ x: number; y: number }[]>([]);
    const finalCalibrationOffsetRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

    // POST-CALIBRATION: Cursor tracking state
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);
    const lastPinchTimeRef = useRef<number>(0);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Config from centralized source
    const {
        stabilityRequiredMs: STABILITY_REQUIRED_MS,
        detectionTimeoutMs: DETECTION_TIMEOUT_MS,
        gracePeriodMs: GRACE_PERIOD_MS,
        spatialSeparationThreshold: SPATIAL_SEPARATION_THRESHOLD,
        movementThreshold: MOVEMENT_THRESHOLD,
    } = INPUT_CONFIG.calibration;

    // Handle pinch click on START GAME button
    const handlePinchClick = useCallback(() => {
        if (isSuccess && buttonRef.current) {
            // Check if cursor is over the button
            const rect = buttonRef.current.getBoundingClientRect();
            // InputProcessor returns 0-1, so map to screen pixels
            const cursorScreenX = cursorPos.x * window.innerWidth;
            const cursorScreenY = cursorPos.y * window.innerHeight;

            if (
                cursorScreenX >= rect.left &&
                cursorScreenX <= rect.right &&
                cursorScreenY >= rect.top &&
                cursorScreenY <= rect.bottom
            ) {
                onComplete(finalCalibrationOffsetRef.current);
            }
        }
    }, [isSuccess, cursorPos, onComplete]);

    useEffect(() => {
        if (!inputProcessor) {
            console.warn("CalibrationScreen: No inputProcessor provided");
            return;
        }

        // CRITICAL: Reset all state on mount
        calibrationStartTimeRef.current = null;
        positionBufferRef.current = [];
        lastRightPointRef.current = 0;
        lastLeftPinchRef.current = 0;
        lastValidTimeRef.current = 0;
        leftWristRef.current = null;
        rightWristRef.current = null;
        isSuccessRef.current = false;
        finalCalibrationOffsetRef.current = { x: 0.5, y: 0.5 };
        lastPinchTimeRef.current = 0;
        setProgress(0);
        setIsSuccess(false);
        setRightPointDetected(false);
        setLeftPinchDetected(false);
        setFailureReason(null);
        setCursorPos({ x: 0.5, y: 0.5 });
        setIsPinching(false);

        // CRITICAL: Reset all state on mount
        calibrationStartTimeRef.current = null;
        positionBufferRef.current = [];
        lastRightPointRef.current = 0;
        lastLeftPinchRef.current = 0;
        lastValidTimeRef.current = 0;
        leftWristRef.current = null;
        rightWristRef.current = null;
        isSuccessRef.current = false;
        finalCalibrationOffsetRef.current = { x: 0.5, y: 0.5 };
        lastPinchTimeRef.current = 0;
        setProgress(0);
        setIsSuccess(false);
        setRightPointDetected(false);
        setLeftPinchDetected(false);
        setFailureReason(null);
        setCursorPos({ x: 0.5, y: 0.5 });
        setIsPinching(false);

        const handleHandEvent = (event: ProcessedHandEvent) => {
            const now = Date.now();

            // Check Right Hand (Aim) state from Spatial Data
            if (event.hands.right) {
                const rightHand = event.hands.right;
                lastRightPointRef.current = now;

                // Use INDEX FINGERTIP (landmark 8) for aiming
                const fingertipPos = { x: rightHand.landmarks[8].x, y: rightHand.landmarks[8].y };
                rightWristRef.current = fingertipPos; // Keeping name 'rightWristRef' for minimal diff, effectively tracks aim point

                // POST-CALIBRATION: Update cursor position
                if (isSuccessRef.current) {
                    // Create temporary mapper with current calibration
                    const tempMapper = new CursorMapper();
                    tempMapper.setCalibration(finalCalibrationOffsetRef.current);
                    const mappedPos = tempMapper.toCursor(fingertipPos);
                    setCursorPos(mappedPos);
                }

                if (!isSuccessRef.current) {
                    setRightPointDetected(true);
                }
            }

            // Check Left Hand (Pinch) state from Spatial Data
            if (event.hands.left) {
                const leftHand = event.hands.left;
                const isPinch = leftHand.gesture === 'pinch';
                const wrist = leftHand.landmarks[0];

                if (isPinch) {
                    lastLeftPinchRef.current = now;
                    leftWristRef.current = { x: wrist.x, y: wrist.y };

                    // POST-CALIBRATION: Detect pinch for clicking
                    if (isSuccessRef.current) {
                        // Only trigger on pinch START (debounce)
                        if (now - lastPinchTimeRef.current > 1000) {
                            setIsPinching(true);
                            lastPinchTimeRef.current = now;
                        }
                    }

                    if (!isSuccessRef.current) {
                        setLeftPinchDetected(true);
                    }
                } else {
                    if (isSuccessRef.current) {
                        setIsPinching(false);
                    }
                }
            }
        };

        // Calibration polling loop
        const intervalId = setInterval(() => {
            if (isSuccessRef.current) return;

            const now = Date.now();

            if (now - lastRightPointRef.current > DETECTION_TIMEOUT_MS) {
                setRightPointDetected(false);
                rightWristRef.current = null;
            }
            if (now - lastLeftPinchRef.current > DETECTION_TIMEOUT_MS) {
                setLeftPinchDetected(false);
                leftWristRef.current = null;
            }

            const rightActive = now - lastRightPointRef.current < DETECTION_TIMEOUT_MS;
            const leftActive = now - lastLeftPinchRef.current < DETECTION_TIMEOUT_MS;

            let isValid = false;
            let currentReason: string | null = null;

            if (!rightActive && !leftActive) {
                currentReason = "Show both hands";
            } else if (!rightActive) {
                currentReason = "Point with right hand";
            } else if (!leftActive) {
                currentReason = "Pinch with left hand";
            } else if (leftWristRef.current && rightWristRef.current) {
                const dist = Math.hypot(
                    leftWristRef.current.x - rightWristRef.current.x,
                    leftWristRef.current.y - rightWristRef.current.y
                );

                if (dist < SPATIAL_SEPARATION_THRESHOLD) {
                    currentReason = "Separate your hands";
                } else {
                    isValid = true;
                }
            }

            if (isValid) {
                const currentPos = {
                    x: rightWristRef.current?.x || 0.5,
                    y: rightWristRef.current?.y || 0.5
                };
                const prevPos = positionBufferRef.current.length > 0
                    ? positionBufferRef.current[positionBufferRef.current.length - 1]
                    : currentPos;
                const delta = Math.hypot(currentPos.x - prevPos.x, currentPos.y - prevPos.y);

                if (delta > MOVEMENT_THRESHOLD) {
                    currentReason = "Hold steady";
                    setFailureReason("Hold steady");
                    calibrationStartTimeRef.current = null;
                    setProgress(0);
                    positionBufferRef.current = [];
                } else {
                    lastValidTimeRef.current = now;
                    setFailureReason(null);

                    if (!calibrationStartTimeRef.current) {
                        calibrationStartTimeRef.current = now;
                        positionBufferRef.current = [];
                    }

                    positionBufferRef.current.push(currentPos);

                    const elapsed = now - calibrationStartTimeRef.current;
                    const p = Math.min(elapsed / STABILITY_REQUIRED_MS, 1);
                    setProgress(p);

                    if (elapsed >= STABILITY_REQUIRED_MS) {
                        const sumX = positionBufferRef.current.reduce((a, b) => a + b.x, 0);
                        const sumY = positionBufferRef.current.reduce((a, b) => a + b.y, 0);
                        const len = positionBufferRef.current.length;
                        finalCalibrationOffsetRef.current = { x: sumX / len, y: sumY / len };

                        // CRITICAL: Set lastPinchTimeRef to now to prevent the held pinch
                        // from immediately triggering a click on the START GAME button
                        lastPinchTimeRef.current = Date.now();

                        isSuccessRef.current = true;
                        setIsSuccess(true);
                    }
                }
            } else {
                if (now - lastValidTimeRef.current < GRACE_PERIOD_MS) {
                    // Grace period
                } else {
                    calibrationStartTimeRef.current = null;
                    setProgress(0);
                    positionBufferRef.current = [];
                    setFailureReason(currentReason);
                }
            }
        }, 50);

        const unsubscribe = inputProcessor.subscribe(handleHandEvent);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [inputProcessor]);

    // Handle pinch click effect
    useEffect(() => {
        if (isPinching && isSuccess) {
            handlePinchClick();
        }
    }, [isPinching, isSuccess, handlePinchClick]);

    return (
        <>
            {/* Hand Cursor (visible after calibration) */}
            <HandCursor
                position={cursorPos}
                isPinching={isPinching}
                visible={isSuccess}
            />

            {/* Main Calibration UI */}
            <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-5xl p-2 tall:p-4 md:p-8 flex flex-col items-center relative pointer-events-auto">

                    {/* Header - compact for landscape */}
                    <div className="w-full border-b-2 tall:border-b-4 border-y2k-yellow mb-2 tall:mb-4 md:mb-8 pb-1 tall:pb-2 md:pb-4">
                        <h2 className="text-2xl tall:text-3xl md:text-5xl font-display font-bold text-y2k-yellow tracking-tighter uppercase">
                            {isSuccess ? 'LOCKED IN' : 'CALIBRATION'}
                        </h2>
                        <p className="text-y2k-silver font-mono text-[8px] tall:text-xs md:text-sm mt-0.5 tall:mt-1 md:mt-2">
                            {isSuccess ? 'Aim at START GAME and pinch' : 'Hold both gestures steady for 4s'}
                        </p>
                    </div>

                    {!isSuccess ? (
                        <div className="flex flex-row justify-center items-stretch gap-2 tall:gap-4 md:gap-6 w-full">

                            {/* Left Hand Card - compact */}
                            <div className={`flex-1 p-2 tall:p-4 md:p-6 border tall:border-2 transition-colors duration-100
                                ${leftPinchDetected
                                    ? 'bg-y2k-yellow border-y2k-yellow text-black'
                                    : 'bg-black/60 border-y2k-white/30 text-y2k-white'}`}>

                                <div className="text-[8px] tall:text-[10px] md:text-xs font-mono opacity-60 mb-0.5 tall:mb-1 md:mb-2">LEFT HAND</div>
                                <div className="text-xl tall:text-2xl md:text-4xl font-display font-bold mb-1 tall:mb-2 md:mb-4">PINCH</div>
                                <div className="text-[8px] tall:text-xs md:text-sm font-mono opacity-80 mb-2 tall:mb-4 md:mb-6 hidden tall:block">
                                    Touch thumb & index finger together
                                </div>

                                <div className={`text-center py-1 tall:py-1.5 md:py-2 border tall:border-2 font-mono font-bold text-[8px] tall:text-xs md:text-sm
                                    ${leftPinchDetected
                                        ? 'border-black text-black'
                                        : 'border-y2k-red text-y2k-red'}`}>
                                    {leftPinchDetected ? '✓ OK' : '○ WAIT'}
                                </div>
                            </div>

                            {/* Progress Bar - compact */}
                            <div className="w-8 tall:w-12 md:w-16 flex flex-col justify-end items-center bg-black/60 border border-y2k-white/20 p-1 tall:p-1.5 md:p-2">
                                <div className="w-full bg-y2k-white/10 h-full relative flex flex-col justify-end overflow-hidden">
                                    <div
                                        className="w-full bg-y2k-yellow transition-all duration-100"
                                        style={{ height: `${progress * 100}%` }}
                                    />
                                </div>
                                <div className="mt-0.5 tall:mt-1 md:mt-2 font-mono text-y2k-yellow text-xs tall:text-sm md:text-lg font-bold">
                                    {(progress * 100).toFixed(0)}%
                                </div>
                            </div>

                            {/* Right Hand Card - compact */}
                            <div className={`flex-1 p-2 tall:p-4 md:p-6 border tall:border-2 transition-colors duration-100
                                ${rightPointDetected
                                    ? 'bg-y2k-yellow border-y2k-yellow text-black'
                                    : 'bg-black/60 border-y2k-white/30 text-y2k-white'}`}>

                                <div className="text-[8px] tall:text-[10px] md:text-xs font-mono opacity-60 mb-0.5 tall:mb-1 md:mb-2">RIGHT HAND</div>
                                <div className="text-xl tall:text-2xl md:text-4xl font-display font-bold mb-1 tall:mb-2 md:mb-4">POINT</div>
                                <div className="text-[8px] tall:text-xs md:text-sm font-mono opacity-80 mb-2 tall:mb-4 md:mb-6 hidden tall:block">
                                    Make a gun shape, aim at screen
                                </div>

                                <div className={`text-center py-1 tall:py-1.5 md:py-2 border tall:border-2 font-mono font-bold text-[8px] tall:text-xs md:text-sm
                                    ${rightPointDetected
                                        ? 'border-black text-black'
                                        : 'border-y2k-red text-y2k-red'}`}>
                                    {rightPointDetected ? '✓ OK' : '○ WAIT'}
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="w-full bg-y2k-yellow p-4 tall:p-6 md:p-12 flex flex-col items-center justify-center text-black space-y-2 tall:space-y-4 md:space-y-6">
                            <h1 className="text-3xl tall:text-5xl md:text-7xl font-display font-bold tracking-tighter">READY</h1>
                            <p className="font-mono text-xs tall:text-sm md:text-lg">
                                Aim at the button and pinch to click
                            </p>
                            <button
                                ref={buttonRef}
                                className="mt-1 tall:mt-2 md:mt-4 px-6 tall:px-8 md:px-12 py-2 tall:py-3 md:py-4 bg-black text-y2k-yellow font-display font-bold text-base tall:text-xl md:text-2xl uppercase hover:bg-white hover:text-black transition-colors cursor-none"
                            >
                                START GAME
                            </button>
                            <p className="font-mono text-[8px] tall:text-xs md:text-sm opacity-60">
                                (or click with mouse)
                            </p>
                            {/* Fallback mouse click */}
                            <button
                                onClick={() => onComplete(finalCalibrationOffsetRef.current)}
                                className="text-[8px] tall:text-[10px] md:text-xs font-mono underline opacity-50 hover:opacity-100"
                            >
                                Skip (use mouse)
                            </button>
                        </div>
                    )}

                    {/* Status Bar - compact for landscape */}
                    {!isSuccess && (
                        <div className="mt-2 tall:mt-4 md:mt-8 w-full bg-black/80 border-t border-y2k-white/20 py-1 tall:py-2 md:py-4 text-center">
                            {failureReason ? (
                                <p className="text-base tall:text-xl md:text-2xl font-body text-y2k-red font-bold uppercase">
                                    {failureReason}
                                </p>
                            ) : (rightPointDetected && leftPinchDetected) ? (
                                <p className="text-base tall:text-xl md:text-2xl font-body text-y2k-yellow font-bold uppercase animate-pulse">
                                    Hold steady...
                                </p>
                            ) : (
                                <p className="text-sm tall:text-lg md:text-xl font-body text-y2k-silver uppercase">
                                    Waiting for gestures
                                </p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </>
    );
};
