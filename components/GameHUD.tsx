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
    shockwaveProgress?: number;
    isHealing?: boolean;
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
 * Updated with improved text readability (larger sizes, text shadows).
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
    shockwaveProgress = 1,
    isHealing = false,
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

    // --- Heal Flash Animation ---
    const [showHealFlash, setShowHealFlash] = useState(false);
    const prevHullRef = useRef(hull);

    useEffect(() => {
        if (hull > prevHullRef.current && isHealing) {
            setShowHealFlash(true);
            const timer = setTimeout(() => setShowHealFlash(false), 800);
            prevHullRef.current = hull;
            return () => clearTimeout(timer);
        }
        prevHullRef.current = hull;
    }, [hull, isHealing]);

    // --- Heat Gauge Color ---
    const getHeatColor = () => {
        if (isOverheated) return '#FF0044';
        if (heatPercent > 80) return '#FF0044';
        if (heatPercent > 60) return '#FF6B00';
        if (heatPercent > 40) return '#FFFF00';
        return '#00FFFF';
    };

    const heatGradient = isOverheated
        ? 'linear-gradient(to right, #FF0044, #FF6600)'
        : `linear-gradient(to right, #00FFFF 0%, #FFFF00 ${Math.min(heatPercent * 1.2, 100)}%, #FF0044 100%)`;

    return (
        <div className="fixed inset-0 pointer-events-none z-40">
            {/* Top Bar - improved readability */}
            <div className="absolute top-0 left-0 right-0 flex flex-wrap justify-between items-start p-1 tall:p-2 md:p-3 gap-1 tall:gap-2 md:gap-3">

                {/* Left: Hull Integrity */}
                <div className="bg-black/90 border border-y2k-yellow tall:border-2 p-1.5 tall:p-2 md:p-3 min-w-[90px] tall:min-w-[110px] md:min-w-[180px]">
                    <div className="text-[10px] tall:text-xs md:text-sm font-mono text-y2k-yellow/90 mb-0.5 uppercase tracking-wide text-shadow-soft">
                        Hull
                    </div>
                    <div className="flex items-center gap-1 tall:gap-1.5 md:gap-2">
                        <div className="flex-1 h-2.5 tall:h-3 md:h-4 bg-black border border-y2k-white/40">
                            <div
                                className={`h-full transition-all duration-200 ${isDanger ? 'bg-y2k-red animate-pulse' :
                                    isWarning ? 'bg-y2k-yellow' :
                                        'bg-y2k-cyan'
                                    }`}
                                style={{ width: `${hullPercent}%` }}
                            />
                        </div>
                        <span className={`font-display font-bold text-sm tall:text-base md:text-xl min-w-[32px] tall:min-w-[40px] md:min-w-[50px] text-right text-shadow-hard ${isDanger ? 'text-y2k-red' :
                            isWarning ? 'text-y2k-yellow' :
                                'text-y2k-cyan'
                            }`}>
                            {hullPercent}%
                        </span>
                    </div>
                    {isDanger && (
                        <div className="text-y2k-red font-mono text-[9px] tall:text-[10px] md:text-xs mt-0.5 animate-pulse uppercase text-shadow-soft">
                            ⚠ CRITICAL
                        </div>
                    )}

                    {/* Floating +1 heal indicator - below hull box with random position */}
                    {showHealFlash && (
                        <div
                            className="absolute top-full mt-1 font-display font-bold text-xl md:text-3xl text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.9)]"
                            style={{
                                left: `${50 + (Math.random() - 0.5) * 60}%`,
                                transform: 'translateX(-50%)',
                                animation: 'healFloat 0.8s ease-out forwards',
                            }}
                        >
                            +1
                        </div>
                    )}
                </div>
                <style>{`
                    @keyframes healFloat {
                        0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
                    }
                `}</style>

                {/* Right: Score & Stats */}
                <div className="flex gap-1 tall:gap-2 md:gap-3">
                    {/* Time */}
                    <div className="bg-black/90 border border-y2k-white/40 tall:border-2 p-1 tall:p-1.5 md:p-3 text-center">
                        <div className="text-[9px] tall:text-[10px] md:text-xs font-mono text-y2k-white/80 uppercase text-shadow-soft">
                            Time
                        </div>
                        <div className="font-display font-bold text-base tall:text-lg md:text-2xl text-y2k-white text-shadow-hard">
                            {formatTime(elapsedMs)}
                        </div>
                    </div>

                    {/* Kills */}
                    <div className={`bg-black/90 border tall:border-2 p-1 tall:p-1.5 md:p-3 text-center transition-all duration-100 ${isKillFlashing
                        ? 'border-y2k-yellow bg-y2k-cyan/20 scale-110'
                        : 'border-y2k-cyan'
                        }`}>
                        <div className="text-[9px] tall:text-[10px] md:text-xs font-mono text-y2k-cyan/90 uppercase text-shadow-soft">
                            Kills
                        </div>
                        <div className={`font-display font-bold text-base tall:text-lg md:text-2xl transition-all duration-100 text-shadow-hard ${isKillFlashing ? 'text-y2k-yellow scale-125' : 'text-y2k-cyan'
                            }`}>
                            {kills}
                        </div>
                    </div>

                    {/* Score */}
                    <div className={`bg-black/90 border tall:border-2 border-y2k-yellow p-1 tall:p-1.5 md:p-3 text-center transition-all duration-150 ${isScoreAnimating ? 'scale-110 shadow-[0_0_20px_rgba(255,255,0,0.5)]' : ''
                        }`}>
                        <div className="text-[9px] tall:text-[10px] md:text-xs font-mono text-y2k-yellow/90 uppercase text-shadow-soft">
                            Score
                        </div>
                        <div className={`font-display font-bold text-lg tall:text-xl md:text-3xl transition-all duration-150 text-shadow-glow ${isScoreAnimating ? 'text-white scale-110' : 'text-y2k-yellow'
                            }`}>
                            {score.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Center: Heat Gauge */}
            <div className="absolute bottom-10 tall:bottom-12 md:bottom-4 left-1/2 -translate-x-1/2 w-32 tall:w-36 md:w-72">
                <div className={`bg-black/90 border tall:border-2 p-1.5 tall:p-2 md:p-3 transition-colors ${isOverheated ? 'border-y2k-red' : 'border-y2k-yellow/60'
                    }`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[9px] tall:text-[10px] md:text-sm font-mono uppercase text-shadow-soft ${isOverheated ? 'text-y2k-red animate-pulse' : 'text-y2k-yellow/90'
                            }`}>
                            {isOverheated ? '⚠ OVERHEAT' : 'Heat'}
                        </span>
                        <span className={`font-mono text-[9px] tall:text-[10px] md:text-sm text-shadow-soft ${isOverheated ? 'text-y2k-red' : heatPercent > 70 ? 'text-y2k-yellow' : 'text-y2k-white/80'
                            }`}>
                            {Math.round(heatPercent)}%
                        </span>
                    </div>
                    <div className="h-2 tall:h-2.5 md:h-3 bg-black border border-y2k-white/40 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${isOverheated ? 'animate-pulse' : ''
                                }`}
                            style={{
                                width: `${heatPercent}%`,
                                background: heatGradient,
                            }}
                        />
                    </div>
                    <div className="hidden md:block text-xs font-mono text-y2k-white/70 mt-1 text-center uppercase tracking-widest text-shadow-soft">
                        Pinch to Fire • Release to Cool
                    </div>
                </div>
            </div>

            {/* Bottom Left: Missile Status */}
            <div className="absolute bottom-1.5 tall:bottom-3 md:bottom-4 left-1 tall:left-2 md:left-4 w-24 tall:w-28 md:w-44">
                <div className={`bg-black/90 border tall:border-2 p-1.5 tall:p-2 md:p-3 transition-colors ${missileReady ? 'border-y2k-yellow' : 'border-y2k-yellow/50'
                    }`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[9px] tall:text-[10px] md:text-sm font-mono uppercase text-shadow-soft ${missileReady ? 'text-y2k-yellow' : 'text-y2k-yellow/80'
                            }`}>
                            {missileReady ? '🚀 READY' : '🚀 ...'}
                        </span>
                    </div>
                    <div className="h-2 tall:h-2.5 md:h-3 bg-black border border-y2k-white/40 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${missileReady ? 'bg-y2k-yellow' : 'bg-y2k-cyan'
                                }`}
                            style={{ width: `${missileCooldownProgress * 100}%` }}
                        />
                    </div>
                    <div className="hidden md:block text-xs font-mono text-y2k-white/70 mt-1 text-center uppercase tracking-widest text-shadow-soft">
                        ✊ Fist
                    </div>
                </div>
            </div>

            {/* Bottom Right: Healing Status */}
            <div className="absolute bottom-1.5 tall:bottom-3 md:bottom-4 right-1 tall:right-2 md:right-4 w-24 tall:w-28 md:w-44">
                <div className={`bg-black/90 border tall:border-2 p-1.5 tall:p-2 md:p-3 transition-colors ${isHealing ? 'border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-emerald-400/50'}`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[9px] tall:text-[10px] md:text-sm font-mono uppercase text-shadow-soft ${isHealing ? 'text-emerald-400 animate-pulse' : 'text-emerald-400/80'}`}>
                            {isHealing ? '💚 HEALING' : '💚 Repair'}
                        </span>
                    </div>
                    <div className="h-2 tall:h-2.5 md:h-3 bg-black border border-y2k-white/40 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${isHealing ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500/40'}`}
                            style={{ width: isHealing ? '100%' : '100%' }}
                        />
                    </div>
                    <div className="hidden md:block text-xs font-mono text-y2k-white/70 mt-1 text-center uppercase tracking-widest text-shadow-soft">
                        🙏 Prayer
                    </div>
                </div>
            </div>

            {/* Middle Right: Shockwave Ultimate (vertical center, right edge) */}
            <div className="absolute top-1/2 -translate-y-1/2 right-1 tall:right-2 md:right-4 w-24 tall:w-28 md:w-44">
                <div className={`bg-black/90 border tall:border-2 p-1.5 tall:p-2 md:p-3 transition-colors ${shockwaveProgress >= 1 ? 'border-indigo-400' : 'border-indigo-400/50'}`}>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[9px] tall:text-[10px] md:text-sm font-mono uppercase text-shadow-soft ${shockwaveProgress >= 1 ? 'text-indigo-400' : 'text-indigo-400/80'}`}>
                            {shockwaveProgress >= 1 ? '⚡ READY' : '⚡ ...'}
                        </span>
                    </div>
                    <div className="h-2 tall:h-2.5 md:h-3 bg-black border border-y2k-white/40 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${shockwaveProgress >= 1 ? 'bg-indigo-400' : 'bg-indigo-500/60'}`}
                            style={{ width: `${shockwaveProgress * 100}%` }}
                        />
                    </div>
                    <div className="hidden md:block text-xs font-mono text-y2k-white/70 mt-1 text-center uppercase tracking-widest text-shadow-soft">
                        ✊🖐️ Fist + Palm
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHUD;
