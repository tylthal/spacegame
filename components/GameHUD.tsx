import React from 'react';

export interface GameHUDProps {
    score: number;
    hull: number;
    kills: number;
    elapsedMs: number;
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
 * Shows hull integrity, score, and survival time in the Y2K glitch aesthetic.
 */
export const GameHUD: React.FC<GameHUDProps> = ({
    score,
    hull,
    kills,
    elapsedMs,
}) => {
    const hullPercent = Math.max(0, Math.min(100, hull));
    const isDanger = hullPercent <= 25;
    const isWarning = hullPercent <= 50 && hullPercent > 25;

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

                    {/* Kills */}
                    <div className="bg-black/80 border-2 border-y2k-cyan p-3 text-center">
                        <div className="text-xs font-mono text-y2k-cyan/70 uppercase tracking-wider">
                            Kills
                        </div>
                        <div className="font-display font-bold text-2xl text-y2k-cyan">
                            {kills}
                        </div>
                    </div>

                    {/* Score */}
                    <div className="bg-black/80 border-2 border-y2k-yellow p-3 text-center">
                        <div className="text-xs font-mono text-y2k-yellow/70 uppercase tracking-wider">
                            Score
                        </div>
                        <div className="font-display font-bold text-3xl text-y2k-yellow">
                            {score.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Targeting Reticle Info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="bg-black/60 border border-y2k-yellow/50 px-4 py-2 text-center">
                    <div className="font-mono text-xs text-y2k-yellow/80 uppercase tracking-widest">
                        Auto-Fire Active • Point to Aim
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameHUD;
