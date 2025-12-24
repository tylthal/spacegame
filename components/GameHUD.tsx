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
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4">

                {/* Left: Hull Integrity */}
                <div className="bg-black/80 border-2 border-y2k-yellow p-3 min-w-[200px]">
                    <div className="text-xs font-mono text-y2k-yellow/70 mb-1 uppercase tracking-wider">
                        Hull Integrity
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-4 bg-black border border-y2k-white/30">
                            <div
                                className={`h-full transition-all duration-200 ${isDanger ? 'bg-y2k-red animate-pulse' :
                                    isWarning ? 'bg-y2k-yellow' :
                                        'bg-y2k-cyan'
                                    }`}
                                style={{ width: `${hullPercent}%` }}
                            />
                        </div>
                        <span className={`font-display font-bold text-xl min-w-[50px] text-right ${isDanger ? 'text-y2k-red' :
                            isWarning ? 'text-y2k-yellow' :
                                'text-y2k-cyan'
                            }`}>
                            {hullPercent}%
                        </span>
                    </div>
                    {isDanger && (
                        <div className="text-y2k-red font-mono text-xs mt-1 animate-pulse uppercase">
                            ⚠ CRITICAL DAMAGE
                        </div>
                    )}
                </div>

                {/* Right: Score & Stats */}
                <div className="flex gap-3">
                    {/* Time */}
                    <div className="bg-black/80 border-2 border-y2k-white/30 p-3 text-center">
                        <div className="text-xs font-mono text-y2k-white/50 uppercase tracking-wider">
                            Time
                        </div>
                        <div className="font-display font-bold text-2xl text-y2k-white">
                            {formatTime(elapsedMs)}
                        </div>
                    </div>

                    {/* Kills - with flash animation */}
                    <div className={`bg-black/80 border-2 p-3 text-center transition-all duration-100 ${isKillFlashing
                        ? 'border-y2k-yellow bg-y2k-cyan/20 scale-110'
                        : 'border-y2k-cyan'
                        }`}>
                        <div className="text-xs font-mono text-y2k-cyan/70 uppercase tracking-wider">
                            Kills
                        </div>
                        <div className={`font-display font-bold text-2xl transition-all duration-100 ${isKillFlashing ? 'text-y2k-yellow scale-125' : 'text-y2k-cyan'
                            }`}>
                            {kills}
                        </div>
                    </div>

                    {/* Score - with pop animation */}
                    <div className={`bg-black/80 border-2 border-y2k-yellow p-3 text-center transition-all duration-150 ${isScoreAnimating ? 'scale-110 shadow-[0_0_20px_rgba(255,255,0,0.5)]' : ''
                        }`}>
                        <div className="text-xs font-mono text-y2k-yellow/70 uppercase tracking-wider">
                            Score
                        </div>
                        <div className={`font-display font-bold text-3xl transition-all duration-150 ${isScoreAnimating ? 'text-white scale-110' : 'text-y2k-yellow'
                            }`}>
                            {score.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Heat Gauge - with gradient */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80">
                <div className={`bg-black/80 border-2 p-3 transition-colors ${isOverheated ? 'border-y2k-red' : 'border-y2k-yellow/50'
                    }`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-mono uppercase tracking-wider ${isOverheated ? 'text-y2k-red animate-pulse' : 'text-y2k-yellow/70'
                            }`}>
                            {isOverheated ? '⚠ OVERHEAT - COOLING DOWN' : 'Weapon Heat'}
                        </span>
                        <span className={`font-mono text-sm ${isOverheated ? 'text-y2k-red' : heatPercent > 70 ? 'text-y2k-yellow' : 'text-y2k-white/70'
                            }`}>
                            {Math.round(heatPercent)}%
                        </span>
                    </div>
                    <div className="h-3 bg-black border border-y2k-white/30 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${isOverheated ? 'animate-pulse' : ''
                                }`}
                            style={{
                                width: `${heatPercent}%`,
                                background: heatGradient,
                            }}
                        />
                    </div>
                    {!isOverheated && (
                        <div className="text-xs font-mono text-y2k-white/50 mt-1 text-center uppercase tracking-widest">
                            Pinch to Fire • Release to Cool
                        </div>
                    )}
                </div>
            </div>

            {/* Left side: Missile Status */}
            <div className="absolute bottom-4 left-4">
                <div className={`bg-black/80 border-2 p-2 px-3 ${missileReady ? 'border-y2k-cyan' : 'border-y2k-white/30'}`}>
                    <div className={`text-xs font-mono uppercase tracking-wider ${missileReady ? 'text-y2k-cyan' : 'text-y2k-white/50'}`}>
                        🚀 {missileReady ? 'MISSILE READY' : 'LOADING...'}
                    </div>
                    {!missileReady && (
                        <div className="h-1 bg-black border border-y2k-white/20 mt-1 overflow-hidden">
                            <div
                                className="h-full bg-y2k-cyan transition-all duration-100"
                                style={{ width: `${missileCooldownProgress * 100}%` }}
                            />
                        </div>
                    )}
                    <div className="text-[10px] font-mono text-y2k-white/40 mt-1 uppercase">
                        Fist to Fire
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHUD;
