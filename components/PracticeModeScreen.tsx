import React from 'react';
import { EnemyKind } from '../rendering/EnemyFactory';

interface PracticeModeScreenProps {
    onSelect: (kind: EnemyKind) => void;
    onBack: () => void;
}

const ENEMIES: { kind: EnemyKind; name: string; description: string; difficulty: string }[] = [
    {
        kind: 'drone',
        name: 'BASIC DRONE',
        description: 'Standard flying enemy. Good for warming up aim.',
        difficulty: 'EASY'
    },
    {
        kind: 'weaver',
        name: 'WEAVER',
        description: 'Spirals towards you. Practice leading your shots.',
        difficulty: 'MEDIUM'
    },
    {
        kind: 'shieldedDrone',
        name: 'SHIELDED',
        description: 'Protected by energy shield. Requires sustained fire.',
        difficulty: 'HARD'
    },
    {
        kind: 'bomber',
        name: 'BOMBER',
        description: 'Fires back at you. Practice dodging and prioritizing.',
        difficulty: 'DANGEROUS'
    },
];

export const PracticeModeScreen: React.FC<PracticeModeScreenProps> = ({ onSelect, onBack }) => {
    return (
        <div
            className="absolute inset-0 flex items-start md:items-center justify-start z-[60] overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {/* Background panel for readability - only covers content area */}
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm pointer-events-none" style={{ zIndex: -1 }} />

            <div className="w-full max-w-xl text-left p-3 tall:p-4 md:p-12 pb-8">
                <h2 className="text-2xl tall:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500 mb-1 tall:mb-2 filter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    COMBAT SIMULATOR
                </h2>
                <p className="text-slate-400 mb-4 tall:mb-6 md:mb-8 font-mono tracking-wide text-xs tall:text-sm">
                    SELECT TARGET PROFILE
                </p>

                <div className="grid grid-cols-1 gap-2 tall:gap-3 mb-4 tall:mb-6 md:mb-8">
                    {ENEMIES.map((enemy) => (
                        <button
                            key={enemy.kind}
                            onClick={() => onSelect(enemy.kind)}
                            className="group relative bg-slate-900/40 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800/90 p-2.5 tall:p-3 md:p-4 rounded flex items-center justify-between transition-all duration-200"
                        >
                            <div className="flex flex-col items-start">
                                <div className="flex items-center space-x-2 tall:space-x-3">
                                    <h3 className="text-sm tall:text-base md:text-lg font-bold text-slate-200 group-hover:text-cyan-300 transition-colors font-mono">
                                        {enemy.name}
                                    </h3>
                                    <span className={`text-[8px] tall:text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/50 font-mono border border-white/10
                    ${enemy.difficulty === 'EASY' ? 'text-green-400' :
                                            enemy.difficulty === 'MEDIUM' ? 'text-yellow-400' :
                                                enemy.difficulty === 'HARD' ? 'text-orange-400' : 'text-red-500 animate-pulse'}`}>
                                        {enemy.difficulty}
                                    </span>
                                </div>
                                <p className="text-[10px] tall:text-xs text-slate-500 group-hover:text-slate-300 transition-colors mt-0.5 tall:mt-1">
                                    {enemy.description}
                                </p>
                            </div>

                            {/* Arrow Icon */}
                            <div className="text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 ml-2">
                                {/* Simple Chevron */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tall:w-6 tall:h-6">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={onBack}
                    className="px-4 tall:px-6 md:px-8 py-2 tall:py-2.5 md:py-3 bg-transparent border border-slate-500 text-slate-400 hover:text-white hover:border-white hover:bg-white/5 rounded transition-all font-mono tracking-wider text-xs tall:text-sm uppercase"
                >
                    Return to Main Menu
                </button>
            </div>
        </div>
    );
};
