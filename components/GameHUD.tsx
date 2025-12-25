import React, { useState, useEffect, useRef } from 'react';

export interface GameHUDProps {
    score: number;
    hull: number;
    kills: number;
    elapsedMs: number;
    heat: number;
    isOverheated: boolean;
    missileReady: boolean;
    missileCooldownProgress: number;
}

const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * GameHUD - Y2K themed heads-up display for gameplay
 * 
 * Shows hull integrity, score, heat, and survival time in the Y2K glitch aesthetic.
 * Includes animations for score changes and kill flashes.
 */
export const GameHUD: React.FC<GameHUDProps> = ({
    score,
    hull,
    kills,
    elapsedMs,
    heat,
    isOverheated,
    missileReady,
    missileCooldownProgress,
}) => {
    const hullPercent = Math.max(0, Math.min(100, hull));
    const isDanger = hullPercent <= 25;
    const isWarning = hullPercent <= 50 && hullPercent > 25;
    const heatPercent = Math.max(0, Math.min(100, heat));

    // --- Score Animation ---
    const [isScoreAnimating, setIsScoreAnimating] = useState(false);
    const prevScoreRef = useRef(score);

    useEffect(() => {
        if (score > prevScoreRef.current) {
            setIsScoreAnimating(true);
            const timer = setTimeout(() => setIsScoreAnimating(false), 300);
            return () => clearTimeout(timer);
        }
        prevScoreRef.current = score;
    }, [score]);

    // --- Kill Flash Animation ---
    const [isKillFlashing, setIsKillFlashing] = useState(false);
    const prevKillsRef = useRef(kills);

    useEffect(() => {
        if (kills > prevKillsRef.current) {
            setIsKillFlashing(true);
            const timer = setTimeout(() => setIsKillFlashing(false), 200);
            return () => clearTimeout(timer);
        }
        prevKillsRef.current = kills;
    }, [kills]);

    // --- Heat Gauge Color ---
    // Gradient from cyan (cold) -> yellow (warm) -> red (hot)
    const getHeatColor = () => {
        if (isOverheated) return '#FF0044'; // y2k-red
        if (heatPercent > 80) return '#FF0044';
        if (heatPercent > 60) return '#FF6B00'; // orange
        if (heatPercent > 40) return '#FFFF00'; // yellow
        return '#00FFFF'; // cyan
    };

    const heatGradient = isOverheated
        ? 'linear-gradient(to right, #FF0044, #FF6600)'
        : `linear-gradient(to right, #00FFFF 0%, #FFFF00 ${Math.min(heatPercent * 1.2, 100)}%, #FF0044 100%)`;

    return (
        <div className="fixed inset-0 pointer-events-none z-40">
            {/* Top Bar - ultra-compact for iPhone landscape, expands on taller/wider screens */}
            <div className="absolute top-0 left-0 right-0 flex flex-wrap justify-between items-start p-0.5 tall:p-1 md:p-3 gap-0.5 tall:gap-1 md:gap-2">

                {/* Left: Hull Integrity - compact on landscape */}
                <div className="bg-black/80 border border-y2k-yellow tall:border-2 p-1 tall:p-1.5 md:p-3 min-w-[80px] tall:min-w-[100px] md:min-w-[180px]">
                    <div className="text-[8px] tall:text-[9px] md:text-xs font-mono text-y2k-yellow/70 mb-0.5 uppercase tracking-wide">
                        Hull
                    </div>
                    <div className="flex items-center gap-0.5 tall:gap-1 md:gap-2">
                        <div className="flex-1 h-2 tall:h-2.5 md:h-4 bg-black border border-y2k-white/30">
                            <div
                                className={`h-full transition-all duration-200 ${isDanger ? 'bg-y2k-red animate-pulse' :
                                    isWarning ? 'bg-y2k-yellow' :
                                        'bg-y2k-cyan'
                                    }`}
                                style={{ width: `${hullPercent}%` }}
                            />
                        </div>
                        <span className={`font-display font-bold text-xs tall:text-sm md:text-xl min-w-[28px] tall:min-w-[32px] md:min-w-[50px] text-right ${isDanger ? 'text-y2k-red' :
                            isWarning ? 'text-y2k-yellow' :
                                'text-y2k-cyan'
                            }`}>
                            {hullPercent}%
                        </span>
                    </div>
                    {isDanger && (
                        <div className="text-y2k-red font-mono text-[7px] tall:text-[8px] md:text-xs mt-0.5 animate-pulse uppercase">
                            ⚠ CRITICAL
                        </div>
                    )}
                </div>

                {/* Right: Score & Stats - compact boxes */}
                <div className="flex gap-0.5 tall:gap-1 md:gap-3">
                    {/* Time */}
                    <div className="bg-black/80 border border-y2k-white/30 tall:border-2 p-0.5 tall:p-1 md:p-3 text-center">
                        <div className="text-[7px] tall:text-[8px] md:text-xs font-mono text-y2k-white/50 uppercase">
                            Time
                        </div>
                        <div className="font-display font-bold text-sm tall:text-base md:text-2xl text-y2k-white">
                            {formatTime(elapsedMs)}
                        </div>
                    </div>

                    {/* Kills */}
                    <div className={`bg-black/80 border tall:border-2 p-0.5 tall:p-1 md:p-3 text-center transition-all duration-100 ${isKillFlashing
                        ? 'border-y2k-yellow bg-y2k-cyan/20 scale-110'
                        : 'border-y2k-cyan'
                        }`}>
                        <div className="text-[7px] tall:text-[8px] md:text-xs font-mono text-y2k-cyan/70 uppercase">
                            Kills
                        </div>
                        <div className={`font-display font-bold text-sm tall:text-base md:text-2xl transition-all duration-100 ${isKillFlashing ? 'text-y2k-yellow scale-125' : 'text-y2k-cyan'
                            }`}>
                            {kills}
                        </div>
                    </div>

                    {/* Score */}
                    <div className={`bg-black/80 border tall:border-2 border-y2k-yellow p-0.5 tall:p-1 md:p-3 text-center transition-all duration-150 ${isScoreAnimating ? 'scale-110 shadow-[0_0_20px_rgba(255,255,0,0.5)]' : ''
                        }`}>
                        <div className="text-[7px] tall:text-[8px] md:text-xs font-mono text-y2k-yellow/70 uppercase">
                            Score
                        </div>
                        <div className={`font-display font-bold text-base tall:text-lg md:text-3xl transition-all duration-150 ${isScoreAnimating ? 'text-white scale-110' : 'text-y2k-yellow'
                            }`}>
                            {score.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Center: Heat Gauge - smaller on landscape */}
            <div className="absolute bottom-8 tall:bottom-10 md:bottom-4 left-1/2 -translate-x-1/2 w-28 tall:w-32 md:w-72">
                <div className={`bg-black/80 border tall:border-2 p-1 tall:p-1.5 md:p-3 transition-colors ${isOverheated ? 'border-y2k-red' : 'border-y2k-yellow/50'
                    }`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[7px] tall:text-[8px] md:text-xs font-mono uppercase ${isOverheated ? 'text-y2k-red animate-pulse' : 'text-y2k-yellow/70'
                            }`}>
                            {isOverheated ? '⚠ HOT' : 'Heat'}
                        </span>
                        <span className={`font-mono text-[7px] tall:text-[8px] md:text-sm ${isOverheated ? 'text-y2k-red' : heatPercent > 70 ? 'text-y2k-yellow' : 'text-y2k-white/70'
                            }`}>
                            {Math.round(heatPercent)}%
                        </span>
                    </div>
                    <div className="h-1.5 tall:h-2 md:h-3 bg-black border border-y2k-white/30 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${isOverheated ? 'animate-pulse' : ''
                                }`}
                            style={{
                                width: `${heatPercent}%`,
                                background: heatGradient,
                            }}
                        />
                    </div>
                    <div className="hidden md:block text-xs font-mono text-y2k-white/50 mt-1 text-center uppercase tracking-widest">
                        Pinch to Fire • Release to Cool
                    </div>
                </div>
            </div>

            {/* Bottom Left: Missile Status - ultra-compact on landscape */}
            <div className="absolute bottom-1 tall:bottom-2 md:bottom-4 left-0.5 tall:left-1 md:left-4 w-20 tall:w-24 md:w-44">
                <div className={`bg-black/80 border tall:border-2 p-1 tall:p-1.5 md:p-3 transition-colors ${missileReady ? 'border-y2k-yellow' : 'border-y2k-yellow/50'
                    }`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[7px] tall:text-[8px] md:text-xs font-mono uppercase ${missileReady ? 'text-y2k-yellow' : 'text-y2k-yellow/70'
                            }`}>
                            {missileReady ? '🚀 RDY' : '🚀 ...'}
                        </span>
                    </div>
                    <div className="h-1.5 tall:h-2 md:h-3 bg-black border border-y2k-white/30 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${missileReady ? 'bg-y2k-yellow' : 'bg-y2k-cyan'
                                }`}
                            style={{ width: `${missileCooldownProgress * 100}%` }}
                        />
                    </div>
                    <div className="hidden md:block text-xs font-mono text-y2k-white/50 mt-1 text-center uppercase tracking-widest">
                        Fist to Fire
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHUD;

