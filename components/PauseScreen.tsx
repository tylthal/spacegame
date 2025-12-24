import React, { useState, useEffect, useRef } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { HandCursor } from './HandCursor';

export interface PauseScreenProps {
    onResume: () => void;
    onExit: () => void;
    inputProcessor?: InputProcessor | null;
}

/**
 * PauseScreen - Y2K themed pause overlay
 * Resume with pinch gesture, exit to return to title
 */
export const PauseScreen: React.FC<PauseScreenProps> = ({
    onResume,
    onExit,
    inputProcessor,
}) => {
    const resumeButtonRef = useRef<HTMLButtonElement>(null);
    const exitButtonRef = useRef<HTMLButtonElement>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);
    const [hoveringResume, setHoveringResume] = useState(false);
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
    const onResumeRef = useRef(onResume);
    const onExitRef = useRef(onExit);
    onResumeRef.current = onResume;
    onExitRef.current = onExit;

    // Track hover states
    const prevHoverResumeRef = useRef(false);
    const prevHoverExitRef = useRef(false);

    // Check cursor position and handle pinch-clicks
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

        // Only update state when hover changes
        if (isOverResume !== prevHoverResumeRef.current) {
            prevHoverResumeRef.current = isOverResume;
            setHoveringResume(isOverResume);
        }
        if (isOverExit !== prevHoverExitRef.current) {
            prevHoverExitRef.current = isOverExit;
            setHoveringExit(isOverExit);
        }

        // Trigger actions on pinch (only once)
        if (isPinching && !triggeredRef.current) {
            if (isOverResume) {
                triggeredRef.current = true;
                onResumeRef.current();
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
            {/* Dark overlay with scanlines effect */}
            <div className="absolute inset-0 bg-black/85" />

            {/* Content */}
            <div className="relative bg-black border-4 border-y2k-yellow p-8 max-w-md w-full mx-4 text-center">

                {/* Pause Header */}
                <div className="relative mb-8">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-y2k-yellow text-black px-6 py-2 font-display font-bold text-sm uppercase tracking-widest">
                        SYSTEM PAUSED
                    </div>
                    <h1 className="text-7xl font-display font-bold text-y2k-yellow uppercase tracking-tighter mt-4">
                        PAUSED
                    </h1>
                </div>

                {/* Status Message */}
                <div className="bg-black/80 border border-y2k-yellow/50 p-4 mb-8 text-left font-mono text-sm">
                    <div className="text-y2k-yellow mb-2">&gt; COMBAT SYSTEMS: STANDBY</div>
                    <div className="text-y2k-white/70">&gt; Enemy advance: HALTED</div>
                    <div className="text-y2k-white/70">&gt; Weapons: SAFE</div>
                    <div className="text-y2k-cyan animate-pulse">&gt; Awaiting operator input...</div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-4">
                    {/* Resume Button */}
                    <button
                        ref={resumeButtonRef}
                        onClick={onResume}
                        className={`w-full py-4 font-display font-bold text-xl uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5
                         ${hoveringResume
                                ? 'bg-y2k-white text-black scale-105 shadow-[0_0_30px_rgba(255,255,0,0.5)]'
                                : 'bg-y2k-yellow text-black hover:bg-y2k-white'
                            }`}
                    >
                        [ RESUME MISSION ]
                    </button>

                    {/* Exit Button */}
                    <button
                        ref={exitButtonRef}
                        onClick={onExit}
                        className={`w-full py-3 font-display font-bold text-lg uppercase tracking-wider
                         transition-all duration-100 active:translate-y-0.5
                         ${hoveringExit
                                ? 'bg-y2k-white text-y2k-red scale-105 shadow-[0_0_20px_rgba(255,0,68,0.5)]'
                                : 'bg-transparent text-y2k-red border-2 border-y2k-red hover:bg-y2k-red hover:text-black'
                            }`}
                    >
                        [ ABORT MISSION ]
                    </button>
                </div>

                {/* Instructions */}
                <div className="mt-6 text-xs font-mono text-y2k-white/50 uppercase space-y-1">
                    <div>Pinch to select • Palm to pause/unpause</div>
                </div>

                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-y2k-yellow" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-y2k-yellow" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-y2k-yellow" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-y2k-yellow" />
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
