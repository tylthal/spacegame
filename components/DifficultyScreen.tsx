import React, { useState, useEffect, useRef } from 'react';
import { InputProcessor } from '../input/InputProcessor';
import { GAME_CONFIG, Difficulty } from '../config/gameConfig';
import { SoundEngine } from '../audio';
import { HandCursor } from './HandCursor';

interface DifficultyScreenProps {
    inputProcessor: InputProcessor | null;
    onSelect: (difficulty: Difficulty) => void;
}

const HOLD_DURATION_MS = 1000; // 1 second to select

/**
 * DifficultyScreen - Y2K themed difficulty selection
 * Hold pinch for 1 second to select difficulty
 */
export const DifficultyScreen: React.FC<DifficultyScreenProps> = ({
    inputProcessor,
    onSelect,
}) => {
    const easyRef = useRef<HTMLButtonElement>(null);
    const normalRef = useRef<HTMLButtonElement>(null);
    const hardRef = useRef<HTMLButtonElement>(null);

    const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
    const [isPinching, setIsPinching] = useState(false);

    const [hoveringEasy, setHoveringEasy] = useState(false);
    const [hoveringNormal, setHoveringNormal] = useState(false);
    const [hoveringHard, setHoveringHard] = useState(false);

    const [easyProgress, setEasyProgress] = useState(0);
    const [normalProgress, setNormalProgress] = useState(0);
    const [hardProgress, setHardProgress] = useState(0);

    const triggeredRef = useRef(false);

    // Track previous hover states for sound
    const prevHoverEasyRef = useRef(false);
    const prevHoverNormalRef = useRef(false);
    const prevHoverHardRef = useRef(false);

    // Hold start times
    const easyHoldStart = useRef<number | null>(null);
    const normalHoldStart = useRef<number | null>(null);
    const hardHoldStart = useRef<number | null>(null);

    // Stable refs for callbacks
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    // Subscribe to input
    useEffect(() => {
        if (!inputProcessor) return;
        return inputProcessor.subscribe(event => {
            setCursorPos(event.cursor);
            setIsPinching(event.gesture === 'pinch');
        });
    }, [inputProcessor]);

    // Handle hover and selection
    useEffect(() => {
        if (triggeredRef.current) return;

        const cursorScreenX = cursorPos.x * window.innerWidth;
        const cursorScreenY = cursorPos.y * window.innerHeight;

        // Check buttons
        const checkButton = (ref: React.RefObject<HTMLButtonElement | null>) => {
            if (!ref.current) return false;
            const rect = ref.current.getBoundingClientRect();
            return cursorScreenX >= rect.left && cursorScreenX <= rect.right &&
                cursorScreenY >= rect.top && cursorScreenY <= rect.bottom;
        };

        const isOverEasy = checkButton(easyRef);
        const isOverNormal = checkButton(normalRef);
        const isOverHard = checkButton(hardRef);

        // Update hover states and sounds
        if (isOverEasy !== prevHoverEasyRef.current) {
            prevHoverEasyRef.current = isOverEasy;
            if (isOverEasy) SoundEngine.play('menuHover');
            setHoveringEasy(isOverEasy);
        }
        if (isOverNormal !== prevHoverNormalRef.current) {
            prevHoverNormalRef.current = isOverNormal;
            if (isOverNormal) SoundEngine.play('menuHover');
            setHoveringNormal(isOverNormal);
        }
        if (isOverHard !== prevHoverHardRef.current) {
            prevHoverHardRef.current = isOverHard;
            if (isOverHard) SoundEngine.play('menuHover');
            setHoveringHard(isOverHard);
        }

        // Hold-to-select for Easy
        if (isOverEasy && isPinching && !triggeredRef.current) {
            if (easyHoldStart.current === null) easyHoldStart.current = Date.now();
            const progress = Math.min(1, (Date.now() - easyHoldStart.current) / HOLD_DURATION_MS);
            setEasyProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                SoundEngine.play('buttonPress');
                onSelectRef.current('easy');
            }
        } else {
            easyHoldStart.current = null;
            setEasyProgress(0);
        }

        // Hold-to-select for Normal
        if (isOverNormal && isPinching && !triggeredRef.current) {
            if (normalHoldStart.current === null) normalHoldStart.current = Date.now();
            const progress = Math.min(1, (Date.now() - normalHoldStart.current) / HOLD_DURATION_MS);
            setNormalProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                SoundEngine.play('buttonPress');
                onSelectRef.current('normal');
            }
        } else {
            normalHoldStart.current = null;
            setNormalProgress(0);
        }

        // Hold-to-select for Hard
        if (isOverHard && isPinching && !triggeredRef.current) {
            if (hardHoldStart.current === null) hardHoldStart.current = Date.now();
            const progress = Math.min(1, (Date.now() - hardHoldStart.current) / HOLD_DURATION_MS);
            setHardProgress(progress);
            if (progress >= 1) {
                triggeredRef.current = true;
                SoundEngine.play('buttonPress');
                onSelectRef.current('hard');
            }
        } else {
            hardHoldStart.current = null;
            setHardProgress(0);
        }

        // Reset trigger when not pinching
        if (!isPinching) {
            triggeredRef.current = false;
        }
    }, [cursorPos, isPinching]);

    const difficulties: { key: Difficulty; ref: React.RefObject<HTMLButtonElement | null>; hovering: boolean; progress: number }[] = [
        { key: 'easy', ref: easyRef, hovering: hoveringEasy, progress: easyProgress },
        { key: 'normal', ref: normalRef, hovering: hoveringNormal, progress: normalProgress },
        { key: 'hard', ref: hardRef, hovering: hoveringHard, progress: hardProgress },
    ];

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-display font-bold text-y2k-yellow mb-2 tracking-wider">
                SELECT DIFFICULTY
            </h1>
            <p className="text-y2k-silver font-mono text-xs md:text-sm mb-8 tracking-widest">
                PINCH TO SELECT
            </p>

            {/* Difficulty buttons */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                {difficulties.map(({ key, ref, hovering, progress }) => {
                    const config = GAME_CONFIG.difficulty[key];
                    const isEasy = key === 'easy';
                    const isHard = key === 'hard';

                    return (
                        <button
                            key={key}
                            ref={ref}
                            className={`
                                relative group px-8 py-6 md:px-12 md:py-8 overflow-hidden
                                border-2 transition-all duration-100
                                ${hovering
                                    ? isEasy ? 'border-green-400 bg-green-400/20 scale-105 shadow-[0_0_20px_rgba(74,222,128,0.5)]'
                                        : isHard ? 'border-red-400 bg-red-400/20 scale-105 shadow-[0_0_20px_rgba(248,113,113,0.5)]'
                                            : 'border-y2k-yellow bg-y2k-yellow/20 scale-105 shadow-[0_0_20px_rgba(255,238,0,0.5)]'
                                    : 'border-y2k-silver/50 bg-transparent'}
                            `}
                        >
                            {/* Progress fill - only show when actively selecting */}
                            {progress > 0 && (
                                <div
                                    className={`absolute inset-0 transition-none ${isEasy ? 'bg-green-400/50' : isHard ? 'bg-red-400/50' : 'bg-y2k-yellow/50'
                                        }`}
                                    style={{ width: `${progress * 100}%` }}
                                />
                            )}

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center">
                                <span className={`
                                    text-2xl md:text-4xl font-display font-bold tracking-widest
                                    ${hovering
                                        ? isEasy ? 'text-green-400' : isHard ? 'text-red-400' : 'text-y2k-yellow'
                                        : 'text-y2k-white'}
                                `}>
                                    {config.label}
                                </span>
                                <span className="text-xs md:text-sm font-mono text-y2k-silver mt-2">
                                    {config.description}
                                </span>
                                <span className={`
                                    text-xs font-mono mt-1
                                    ${isEasy ? 'text-green-400' : isHard ? 'text-red-400' : 'text-y2k-yellow'}
                                `}>
                                    {config.speedMultiplier}x SPEED
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Hand cursor */}
            <HandCursor
                position={cursorPos}
                gesture={isPinching ? 'pinch' : 'point'}
                visible={true}
            />
        </div>
    );
};
