import React, { useState, useEffect, useRef } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { HandCursor } from './HandCursor';

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
 * Supports pinch-click on buttons via hand tracking
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

    // Subscribe to input for cursor position and pinch detection
    useEffect(() => {
        if (!inputProcessor) return;

        return inputProcessor.subscribe(event => {
            setCursorPos(event.cursor);
            setIsPinching(event.gesture === 'pinch');
        });
    }, [inputProcessor]);

    // Refs for callbacks and trigger state
    const triggeredRef = useRef(false);
    const onRestartRef = useRef(onRestart);
    const onExitRef = useRef(onExit);
    onRestartRef.current = onRestart;
    onExitRef.current = onExit;

    // Track hover states
    const prevHoverRestartRef = useRef(false);
    const prevHoverExitRef = useRef(false);

    // Check cursor position and handle pinch-clicks
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

        // Only update state when hover changes
        if (isOverRestart !== prevHoverRestartRef.current) {
            prevHoverRestartRef.current = isOverRestart;
            setHoveringRestart(isOverRestart);
        }
        if (isOverExit !== prevHoverExitRef.current) {
            prevHoverExitRef.current = isOverExit;
            setHoveringExit(isOverExit);
        }

        // Trigger actions on pinch (only once)
        if (isPinching && !triggeredRef.current) {
            if (isOverRestart) {
                triggeredRef.current = true;
                onRestartRef.current();
            } else if (isOverExit) {
                triggeredRef.current = true;
                onExitRef.current();
            }
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

            {/* Content */}
            <div className="relative bg-black border-4 border-y2k-red p-8 max-w-lg w-full mx-4 text-center">

                {/* Glitch Header */}
                <div className="relative mb-8">
                    <h1 className="text-6xl font-display font-bold text-y2k-red uppercase tracking-tighter animate-twitch">
                        SYSTEM
                    </h1>
                    <h1 className="text-6xl font-display font-bold text-y2k-red uppercase tracking-tighter animate-twitch" style={{ animationDelay: '0.1s' }}>
                        FAILURE
                    </h1>
                    <div className="absolute inset-0 bg-y2k-red/20 animate-pulse" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8 border-t-2 border-b-2 border-y2k-white/20 py-6">
                    <div>
                        <div className="text-xs font-mono text-y2k-white/50 uppercase mb-1">
                            Final Score
                        </div>
                        <div className="text-3xl font-display font-bold text-y2k-yellow">
                            {score.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-mono text-y2k-white/50 uppercase mb-1">
                            Enemies Destroyed
                        </div>
                        <div className="text-3xl font-display font-bold text-y2k-cyan">
                            {kills}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-mono text-y2k-white/50 uppercase mb-1">
                            Survival Time
                        </div>
                        <div className="text-3xl font-display font-bold text-y2k-white">
                            {formatTime(survivalTimeMs)}
                        </div>
                    </div>
                </div>

                {/* Terminal Message */}
                <div className="bg-y2k-red/10 border border-y2k-red/50 p-4 mb-8 text-left font-mono text-sm">
                    <div className="text-y2k-red mb-2">&gt; ORBITAL PLATFORM COMPROMISED</div>
                    <div className="text-y2k-white/70">&gt; Hull integrity: 0%</div>
                    <div className="text-y2k-white/70">&gt; Life support: OFFLINE</div>
                    <div className="text-y2k-yellow animate-pulse">&gt; Awaiting command...</div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4">
                    {/* Restart Button */}
                    <button
                        ref={restartButtonRef}
                        onClick={onRestart}
                        className={`flex-1 py-4 font-display font-bold text-lg uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5
                         ${hoveringRestart
                                ? 'bg-y2k-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,0,0.5)]'
                                : 'bg-y2k-yellow text-black hover:bg-y2k-white'
                            }`}
                    >
                        [ REBOOT SYSTEM ]
                    </button>

                    {/* Exit Button */}
                    <button
                        ref={exitButtonRef}
                        onClick={onExit}
                        className={`flex-1 py-4 font-display font-bold text-lg uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5
                         ${hoveringExit
                                ? 'bg-y2k-white text-y2k-red scale-105 shadow-[0_0_30px_rgba(255,0,68,0.5)]'
                                : 'bg-transparent text-y2k-red border-2 border-y2k-red hover:bg-y2k-red hover:text-black'
                            }`}
                    >
                        [ EXIT SYSTEM ]
                    </button>
                </div>

                {/* Pinch hint */}
                <div className="mt-4 text-xs font-mono text-y2k-white/50 uppercase">
                    Pinch on button to select
                </div>

                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-y2k-red" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-y2k-red" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-y2k-red" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-y2k-red" />
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
