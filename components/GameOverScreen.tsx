import React, { useState, useEffect, useRef } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { HandCursor } from './HandCursor';

export interface GameOverScreenProps {
    score: number;
    kills: number;
    survivalTimeMs: number;
    onRestart: () => void;
    inputProcessor?: InputProcessor | null;
}

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * GameOverScreen - Y2K themed game over with stats and restart option
 * Supports pinch-click on the restart button via hand tracking
 */
export const GameOverScreen: React.FC<GameOverScreenProps> = ({
    score,
    kills,
    survivalTimeMs,
    onRestart,
    inputProcessor,
}) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // Subscribe to input for cursor position and pinch detection
    useEffect(() => {
        if (!inputProcessor) return;

        return inputProcessor.subscribe(event => {
            setCursorPos(event.cursor);
            setIsPinching(event.gesture === 'pinch');
        });
    }, [inputProcessor]);

    // Check if cursor is over the button and handle pinch-click
    useEffect(() => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const cursorScreenX = cursorPos.x * window.innerWidth;
        const cursorScreenY = cursorPos.y * window.innerHeight;

        const isOver = (
            cursorScreenX >= rect.left &&
            cursorScreenX <= rect.right &&
            cursorScreenY >= rect.top &&
            cursorScreenY <= rect.bottom
        );

        setIsHovering(isOver);

        // Trigger restart on pinch while hovering
        if (isOver && isPinching) {
            onRestart();
        }
    }, [cursorPos, isPinching, onRestart]);

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
                    <div className="text-y2k-yellow animate-pulse">&gt; Awaiting reboot command...</div>
                </div>

                {/* Restart Button - with hover highlight for cursor */}
                <button
                    ref={buttonRef}
                    onClick={onRestart}
                    className={`w-full py-4 font-display font-bold text-xl uppercase tracking-wider
                     transition-all duration-100 active:translate-y-0.5
                     ${isHovering
                            ? 'bg-y2k-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,0,0.5)]'
                            : 'bg-y2k-yellow text-black hover:bg-y2k-white'
                        }`}
                >
                    [ REBOOT SYSTEM ]
                </button>

                {/* Pinch hint */}
                <div className="mt-4 text-xs font-mono text-y2k-white/50 uppercase">
                    Pinch on button to restart
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
