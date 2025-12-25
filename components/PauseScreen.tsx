import React, { useState, useEffect, useRef } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { HandCursor } from './HandCursor';
import { useFullscreen } from '../hooks';

const HOLD_DURATION_MS = 1000; // 1 second to select

export interface PauseScreenProps {
    onResume: () => void;
    onExit: () => void;
    inputProcessor?: InputProcessor | null;
}

/**
 * PauseScreen - Y2K themed pause overlay
 * Hold pinch for 1 second to select buttons
 */
export const PauseScreen: React.FC<PauseScreenProps> = ({
    onResume,
    onExit,
    inputProcessor,
}) => {
    const resumeButtonRef = useRef<HTMLButtonElement>(null);
    const exitButtonRef = useRef<HTMLButtonElement>(null);
    const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);
    const [hoveringResume, setHoveringResume] = useState(false);
    const [hoveringExit, setHoveringExit] = useState(false);
    const [hoveringFullscreen, setHoveringFullscreen] = useState(false);

    // Hold progress state (0-1) for visual feedback
    const [resumeProgress, setResumeProgress] = useState(0);
    const [exitProgress, setExitProgress] = useState(0);
    const [fullscreenProgress, setFullscreenProgress] = useState(0);

    // Fullscreen state and controls - extracted to reusable hook
    const { isFullscreen, toggle: toggleFullscreen, showHint: showIOSHint, isIOS, isSupported: fullscreenSupported } = useFullscreen();

    // Subscribe to input for cursor position and pinch detection
    useEffect(() => {
        if (!inputProcessor) return;

        return inputProcessor.subscribe(event => {
            setCursorPos(event.cursor);
            setIsPinching(event.gesture === 'pinch');
        });
    }, [inputProcessor]);

    // Refs for callbacks and hold tracking
    const onResumeRef = useRef(onResume);
    const onExitRef = useRef(onExit);
    onResumeRef.current = onResume;
    onExitRef.current = onExit;

    // Hold start timestamps for each button
    const resumeHoldStart = useRef<number | null>(null);
    const exitHoldStart = useRef<number | null>(null);
    const fullscreenHoldStart = useRef<number | null>(null);
    const triggeredRef = useRef(false);

    // Track hover states
    const prevHoverResumeRef = useRef(false);
    const prevHoverExitRef = useRef(false);
    const prevHoverFullscreenRef = useRef(false);

    // Check cursor position and handle hold-to-select
    useEffect(() => {
        const cursorScreenX = cursorPos.x * window.innerWidth;
        const cursorScreenY = cursorPos.y * window.innerHeight;

        // Check resume button
        let isOverResume = false;
        if (resumeButtonRef.current) {
            const rect = resumeButtonRef.current.getBoundingClientRect();
            isOverResume = (
                cursorScreenX >= rect.left &&
                cursorScreenX <= rect.right &&
                cursorScreenY >= rect.top &&
                cursorScreenY <= rect.bottom
            );
        }

        // Check exit button
        let isOverExit = false;
        if (exitButtonRef.current) {
            const rect = exitButtonRef.current.getBoundingClientRect();
            isOverExit = (
                cursorScreenX >= rect.left &&
                cursorScreenX <= rect.right &&
                cursorScreenY >= rect.top &&
                cursorScreenY <= rect.bottom
            );
        }

        // Check fullscreen button
        let isOverFullscreen = false;
        if (fullscreenButtonRef.current) {
            const rect = fullscreenButtonRef.current.getBoundingClientRect();
            isOverFullscreen = (
                cursorScreenX >= rect.left &&
                cursorScreenX <= rect.right &&
                cursorScreenY >= rect.top &&
                cursorScreenY <= rect.bottom
            );
        }

        // Update hover states
        if (isOverResume !== prevHoverResumeRef.current) {
            prevHoverResumeRef.current = isOverResume;
            setHoveringResume(isOverResume);
        }
        if (isOverExit !== prevHoverExitRef.current) {
            prevHoverExitRef.current = isOverExit;
            setHoveringExit(isOverExit);
        }
        if (isOverFullscreen !== prevHoverFullscreenRef.current) {
            prevHoverFullscreenRef.current = isOverFullscreen;
            setHoveringFullscreen(isOverFullscreen);
        }

        // Hold-to-select logic for Resume button
        if (isOverResume && isPinching && !triggeredRef.current) {
            if (resumeHoldStart.current === null) {
                resumeHoldStart.current = Date.now();
            }
            const progress = Math.min(1, (Date.now() - resumeHoldStart.current) / HOLD_DURATION_MS);
            setResumeProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                onResumeRef.current();
            }
        } else {
            resumeHoldStart.current = null;
            setResumeProgress(0);
        }

        // Hold-to-select logic for Exit button
        if (isOverExit && isPinching && !triggeredRef.current) {
            if (exitHoldStart.current === null) {
                exitHoldStart.current = Date.now();
            }
            const progress = Math.min(1, (Date.now() - exitHoldStart.current) / HOLD_DURATION_MS);
            setExitProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                onExitRef.current();
            }
        } else {
            exitHoldStart.current = null;
            setExitProgress(0);
        }

        // Hold-to-select logic for Fullscreen button
        if (isOverFullscreen && isPinching && !triggeredRef.current) {
            if (fullscreenHoldStart.current === null) {
                fullscreenHoldStart.current = Date.now();
            }
            const progress = Math.min(1, (Date.now() - fullscreenHoldStart.current) / HOLD_DURATION_MS);
            setFullscreenProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                toggleFullscreen();
            }
        } else {
            fullscreenHoldStart.current = null;
            setFullscreenProgress(0);
        }

        // Reset trigger when not pinching
        if (!isPinching) {
            triggeredRef.current = false;
        }
    }, [cursorPos, isPinching, toggleFullscreen]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Dark overlay with scanlines effect */}
            <div className="absolute inset-0 bg-black/85" />

            {/* Content - compact for landscape */}
            <div className="relative bg-black border-2 tall:border-4 border-y2k-yellow p-3 tall:p-4 md:p-8 max-w-md w-full mx-2 tall:mx-4 text-center">

                {/* Fullscreen Toggle Button - top right */}
                <button
                    ref={fullscreenButtonRef}
                    onClick={toggleFullscreen}
                    className={`absolute top-1 right-1 tall:top-2 tall:right-2 md:top-3 md:right-3 p-1.5 tall:p-2 md:p-2.5
                     transition-all duration-100 active:scale-90
                     ${hoveringFullscreen
                            ? 'bg-y2k-white text-black scale-110 shadow-[0_0_15px_rgba(0,255,255,0.5)]'
                            : 'bg-transparent text-y2k-cyan border border-y2k-cyan hover:bg-y2k-cyan hover:text-black'
                        }`}
                    title={isIOS || !fullscreenSupported
                        ? 'Add to Home Screen for fullscreen'
                        : (isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen')}
                >
                    {isFullscreen ? (
                        /* Contract/Exit fullscreen icon - arrows pointing inward */
                        <svg className="w-4 h-4 tall:w-5 tall:h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                        </svg>
                    ) : (
                        /* Expand/Enter fullscreen icon - arrows pointing outward */
                        <svg className="w-4 h-4 tall:w-5 tall:h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                    )}
                </button>

                {/* iOS Hint Tooltip */}
                {showIOSHint && (
                    <div className="absolute top-10 tall:top-12 md:top-14 right-1 tall:right-2 md:right-3 
                        bg-black/95 border border-y2k-cyan text-y2k-cyan px-2 py-1.5 text-[8px] tall:text-[10px] md:text-xs 
                        font-mono max-w-[180px] tall:max-w-[220px] md:max-w-[280px] z-50 animate-pulse">
                        <div className="font-bold mb-0.5">📱 For fullscreen:</div>
                        <div>Tap Share → "Add to Home Screen" then launch from there</div>
                    </div>
                )}

                {/* Pause Header - compact */}
                <div className="relative mb-3 tall:mb-4 md:mb-8">
                    <div className="absolute -top-6 tall:-top-8 md:-top-12 left-1/2 -translate-x-1/2 bg-y2k-yellow text-black px-3 tall:px-4 md:px-6 py-1 tall:py-1.5 md:py-2 font-display font-bold text-[8px] tall:text-xs md:text-sm uppercase tracking-widest">
                        SYSTEM PAUSED
                    </div>
                    <h1 className="text-3xl tall:text-5xl md:text-7xl font-display font-bold text-y2k-yellow uppercase tracking-tighter mt-2 tall:mt-3 md:mt-4">
                        PAUSED
                    </h1>
                </div>

                {/* Status Message - hidden on small landscape */}
                <div className="hidden tall:block bg-black/80 border border-y2k-yellow/50 p-2 tall:p-3 md:p-4 mb-3 tall:mb-4 md:mb-8 text-left font-mono text-[8px] tall:text-xs md:text-sm">
                    <div className="text-y2k-yellow mb-1 tall:mb-2">&gt; COMBAT SYSTEMS: STANDBY</div>
                    <div className="text-y2k-white/70">&gt; Enemy advance: HALTED</div>
                    <div className="text-y2k-white/70">&gt; Weapons: SAFE</div>
                    <div className="text-y2k-cyan animate-pulse">&gt; Awaiting operator input...</div>
                </div>

                {/* Buttons - compact */}
                <div className="flex flex-col gap-2 tall:gap-3 md:gap-4">
                    {/* Resume Button with progress overlay */}
                    <button
                        ref={resumeButtonRef}
                        onClick={onResume}
                        className={`relative w-full py-2 tall:py-3 md:py-4 font-display font-bold text-sm tall:text-lg md:text-xl uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5 overflow-hidden
                         ${hoveringResume
                                ? 'bg-y2k-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,0,0.5)]'
                                : 'bg-y2k-yellow text-black hover:bg-y2k-white'
                            }`}
                    >
                        {/* Progress bar overlay */}
                        {resumeProgress > 0 && (
                            <div
                                className="absolute inset-0 bg-green-400/50 transition-none"
                                style={{ width: `${resumeProgress * 100}%` }}
                            />
                        )}
                        <span className="relative z-10">[ RESUME ]</span>
                    </button>

                    {/* Exit Button with progress overlay */}
                    <button
                        ref={exitButtonRef}
                        onClick={onExit}
                        className={`relative w-full py-1.5 tall:py-2 md:py-3 font-display font-bold text-xs tall:text-base md:text-lg uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5 overflow-hidden
                         ${hoveringExit
                                ? 'bg-y2k-white text-y2k-red scale-105 shadow-[0_0_20px_rgba(255,0,68,0.5)]'
                                : 'bg-transparent text-y2k-red border border-y2k-red tall:border-2 hover:bg-y2k-red hover:text-black'
                            }`}
                    >
                        {/* Progress bar overlay */}
                        {exitProgress > 0 && (
                            <div
                                className="absolute inset-0 bg-red-500/50 transition-none"
                                style={{ width: `${exitProgress * 100}%` }}
                            />
                        )}
                        <span className="relative z-10">[ ABORT ]</span>
                    </button>
                </div>

                {/* Instructions - hidden on landscape */}
                <div className="hidden tall:block mt-3 tall:mt-4 md:mt-6 text-[8px] tall:text-[10px] md:text-xs font-mono text-y2k-white/50 uppercase space-y-1">
                    <div>Point at button and hold pinch for 1 second</div>
                </div>

                {/* Corner decorations - smaller on landscape */}
                <div className="absolute top-0 left-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-t border-l tall:border-t-2 tall:border-l-2 border-y2k-yellow" />
                <div className="absolute top-0 right-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-t border-r tall:border-t-2 tall:border-r-2 border-y2k-yellow" />
                <div className="absolute bottom-0 left-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-b border-l tall:border-b-2 tall:border-l-2 border-y2k-yellow" />
                <div className="absolute bottom-0 right-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-b border-r tall:border-b-2 tall:border-r-2 border-y2k-yellow" />
            </div>

            {/* Hand Cursor - visible on pause screen */}
            <HandCursor
                position={cursorPos}
                isPinching={isPinching}
                visible={!!inputProcessor}
            />
        </div>
    );
};

export default PauseScreen;
