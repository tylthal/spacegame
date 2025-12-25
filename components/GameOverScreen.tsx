import React, { useState, useEffect, useRef } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { HandCursor } from './HandCursor';

const HOLD_DURATION_MS = 1000; // 1 second to select

export interface GameOverScreenProps {
    score: number;
    kills: number;
    survivalTimeMs: number;
    onRestart: () => void;
    onExit: () => void;
    inputProcessor?: InputProcessor | null;
}

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * GameOverScreen - Y2K themed game over with stats and restart/exit options
 * Hold pinch for 1 second to select buttons
 */
export const GameOverScreen: React.FC<GameOverScreenProps> = ({
    score,
    kills,
    survivalTimeMs,
    onRestart,
    onExit,
    inputProcessor,
}) => {
    const restartButtonRef = useRef<HTMLButtonElement>(null);
    const exitButtonRef = useRef<HTMLButtonElement>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);
    const [hoveringRestart, setHoveringRestart] = useState(false);
    const [hoveringExit, setHoveringExit] = useState(false);

    // Hold progress state (0-1) for visual feedback
    const [restartProgress, setRestartProgress] = useState(0);
    const [exitProgress, setExitProgress] = useState(0);

    // Subscribe to input for cursor position and pinch detection
    useEffect(() => {
        if (!inputProcessor) return;

        return inputProcessor.subscribe(event => {
            setCursorPos(event.cursor);
            setIsPinching(event.gesture === 'pinch');
        });
    }, [inputProcessor]);

    // Refs for callbacks and hold tracking
    const onRestartRef = useRef(onRestart);
    const onExitRef = useRef(onExit);
    onRestartRef.current = onRestart;
    onExitRef.current = onExit;

    // Hold start timestamps for each button
    const restartHoldStart = useRef<number | null>(null);
    const exitHoldStart = useRef<number | null>(null);
    const triggeredRef = useRef(false);

    // Track hover states
    const prevHoverRestartRef = useRef(false);
    const prevHoverExitRef = useRef(false);

    // Check cursor position and handle hold-to-select
    useEffect(() => {
        const cursorScreenX = cursorPos.x * window.innerWidth;
        const cursorScreenY = cursorPos.y * window.innerHeight;

        // Check restart button
        let isOverRestart = false;
        if (restartButtonRef.current) {
            const rect = restartButtonRef.current.getBoundingClientRect();
            isOverRestart = (
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

        // Update hover states
        if (isOverRestart !== prevHoverRestartRef.current) {
            prevHoverRestartRef.current = isOverRestart;
            setHoveringRestart(isOverRestart);
        }
        if (isOverExit !== prevHoverExitRef.current) {
            prevHoverExitRef.current = isOverExit;
            setHoveringExit(isOverExit);
        }

        // Hold-to-select logic for Restart button
        if (isOverRestart && isPinching && !triggeredRef.current) {
            if (restartHoldStart.current === null) {
                restartHoldStart.current = Date.now();
            }
            const progress = Math.min(1, (Date.now() - restartHoldStart.current) / HOLD_DURATION_MS);
            setRestartProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                onRestartRef.current();
            }
        } else {
            restartHoldStart.current = null;
            setRestartProgress(0);
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

        // Reset trigger when not pinching
        if (!isPinching) {
            triggeredRef.current = false;
        }
    }, [cursorPos, isPinching]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/90" />

            {/* Content - compact for landscape */}
            <div className="relative bg-black border-2 tall:border-4 border-y2k-red p-3 tall:p-4 md:p-8 max-w-lg w-full mx-2 tall:mx-4 text-center">

                {/* Glitch Header - compact */}
                <div className="relative mb-3 tall:mb-4 md:mb-8">
                    <h1 className="text-2xl tall:text-4xl md:text-6xl font-display font-bold text-y2k-red uppercase tracking-tighter animate-twitch">
                        SYSTEM
                    </h1>
                    <h1 className="text-2xl tall:text-4xl md:text-6xl font-display font-bold text-y2k-red uppercase tracking-tighter animate-twitch" style={{ animationDelay: '0.1s' }}>
                        FAILURE
                    </h1>
                    <div className="absolute inset-0 bg-y2k-red/20 animate-pulse" />
                </div>

                {/* Stats Grid - compact */}
                <div className="grid grid-cols-3 gap-2 tall:gap-3 md:gap-4 mb-3 tall:mb-4 md:mb-8 border-t border-b tall:border-t-2 tall:border-b-2 border-y2k-white/20 py-2 tall:py-4 md:py-6">
                    <div>
                        <div className="text-[7px] tall:text-[9px] md:text-xs font-mono text-y2k-white/50 uppercase mb-0.5">
                            Score
                        </div>
                        <div className="text-lg tall:text-2xl md:text-3xl font-display font-bold text-y2k-yellow">
                            {score.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div className="text-[7px] tall:text-[9px] md:text-xs font-mono text-y2k-white/50 uppercase mb-0.5">
                            Kills
                        </div>
                        <div className="text-lg tall:text-2xl md:text-3xl font-display font-bold text-y2k-cyan">
                            {kills}
                        </div>
                    </div>
                    <div>
                        <div className="text-[7px] tall:text-[9px] md:text-xs font-mono text-y2k-white/50 uppercase mb-0.5">
                            Time
                        </div>
                        <div className="text-lg tall:text-2xl md:text-3xl font-display font-bold text-y2k-white">
                            {formatTime(survivalTimeMs)}
                        </div>
                    </div>
                </div>

                {/* Terminal Message - hidden on small landscape */}
                <div className="hidden tall:block bg-y2k-red/10 border border-y2k-red/50 p-2 tall:p-3 md:p-4 mb-3 tall:mb-4 md:mb-8 text-left font-mono text-[8px] tall:text-xs md:text-sm">
                    <div className="text-y2k-red mb-1">&gt; ORBITAL PLATFORM COMPROMISED</div>
                    <div className="text-y2k-white/70">&gt; Hull integrity: 0%</div>
                    <div className="text-y2k-white/70">&gt; Life support: OFFLINE</div>
                    <div className="text-y2k-yellow animate-pulse">&gt; Awaiting command...</div>
                </div>

                {/* Buttons - compact */}
                <div className="flex gap-2 tall:gap-3 md:gap-4">
                    {/* Restart Button with progress overlay */}
                    <button
                        ref={restartButtonRef}
                        onClick={onRestart}
                        className={`relative flex-1 py-2 tall:py-3 md:py-4 font-display font-bold text-xs tall:text-base md:text-lg uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5 overflow-hidden
                         ${hoveringRestart
                                ? 'bg-y2k-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,0,0.5)]'
                                : 'bg-y2k-yellow text-black hover:bg-y2k-white'
                            }`}
                    >
                        {/* Progress bar overlay */}
                        {restartProgress > 0 && (
                            <div
                                className="absolute inset-0 bg-green-400/50 transition-none"
                                style={{ width: `${restartProgress * 100}%` }}
                            />
                        )}
                        <span className="relative z-10">[ RESTART ]</span>
                    </button>

                    {/* Exit Button with progress overlay */}
                    <button
                        ref={exitButtonRef}
                        onClick={onExit}
                        className={`relative flex-1 py-2 tall:py-3 md:py-4 font-display font-bold text-xs tall:text-base md:text-lg uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5 overflow-hidden
                         ${hoveringExit
                                ? 'bg-y2k-white text-y2k-red scale-105 shadow-[0_0_30px_rgba(255,0,68,0.5)]'
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
                        <span className="relative z-10">[ EXIT ]</span>
                    </button>
                </div>

                {/* Pinch hint - hidden on landscape */}
                <div className="hidden tall:block mt-2 tall:mt-3 md:mt-4 text-[8px] tall:text-[10px] md:text-xs font-mono text-y2k-white/50 uppercase">
                    Hold pinch for 1 second to select
                </div>

                {/* Corner decorations - smaller on landscape */}
                <div className="absolute top-0 left-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-t border-l tall:border-t-2 tall:border-l-2 border-y2k-red" />
                <div className="absolute top-0 right-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-t border-r tall:border-t-2 tall:border-r-2 border-y2k-red" />
                <div className="absolute bottom-0 left-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-b border-l tall:border-b-2 tall:border-l-2 border-y2k-red" />
                <div className="absolute bottom-0 right-0 w-2 h-2 tall:w-3 tall:h-3 md:w-4 md:h-4 border-b border-r tall:border-b-2 tall:border-r-2 border-y2k-red" />
            </div>

            {/* Hand Cursor - visible on game over screen */}
            <HandCursor
                position={cursorPos}
                isPinching={isPinching}
                visible={!!inputProcessor}
            />
        </div>
    );
};

export default GameOverScreen;
