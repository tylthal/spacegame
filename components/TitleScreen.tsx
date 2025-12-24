import React from 'react';

interface TitleScreenProps {
    onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">

            {/* Main Title Card - responsive padding */}
            <div className="relative z-10 flex flex-col items-start justify-center text-left p-4 sm:p-12 w-full max-w-4xl pointer-events-auto">

                {/* SYSTEM HEADER */}
                <div className="flex flex-row items-center space-x-2 sm:space-x-4 mb-2 sm:mb-4">
                    <div className="h-3 w-3 sm:h-4 sm:w-4 bg-y2k-yellow animate-pulse" />
                    <p className="text-y2k-yellow font-mono text-[10px] sm:text-sm tracking-widest uppercase">
                        // CORE_SYS_BREACH // AUTO_SEQ_99
                    </p>
                </div>

                {/* GIANT TITLE - Responsive sizing */}
                <div className="relative">
                    <h1 className="text-4xl sm:text-7xl md:text-9xl font-display font-bold text-y2k-white tracking-tighter leading-[0.8] select-none mix-blend-difference">
                        ORBITAL
                    </h1>
                    <h1 className="text-4xl sm:text-7xl md:text-9xl font-display font-bold text-y2k-yellow tracking-tighter leading-[0.8] select-none ml-1 sm:ml-2">
                        DEFENSE
                    </h1>
                </div>

                {/* Subtext Grid - responsive sizing */}
                <div className="mt-4 sm:mt-8 border-l-2 sm:border-l-4 border-y2k-yellow pl-3 sm:pl-6 space-y-1 sm:space-y-2 max-w-lg bg-black/80 p-2 sm:p-4">
                    <p className="text-y2k-white font-body text-base sm:text-2xl uppercase tracking-wide">
                        HOSTILE. DRONE. SWARM.
                    </p>
                    <p className="text-y2k-silver font-mono text-[10px] sm:text-xs leading-relaxed">
                        SECTOR 7 COMPROMISED. NEURAL LINK REQUIRED FOR WEAPONRY SYSTEMS.
                    </p>
                </div>

                {/* BUTTON - Responsive sizing */}
                <div className="pt-6 sm:pt-12">
                    <button
                        onClick={onStart}
                        className="group relative px-6 sm:px-10 py-3 sm:py-5 bg-transparent border-2 border-y2k-yellow hover:bg-y2k-yellow text-y2k-yellow hover:text-y2k-black transition-all duration-0 font-display font-bold text-base sm:text-2xl tracking-widest uppercase"
                    >
                        <span className="relative z-10 group-hover:animate-twitch">START</span>

                        {/* Hard Shadow/Offset */}
                        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 w-full h-full border-2 border-y2k-red -z-10 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                    </button>
                </div>

            </div>

            {/* Version / Credits */}
            <div className="absolute bottom-4 sm:bottom-6 text-slate-600 font-mono text-[10px] sm:text-xs tracking-widest uppercase">
                v0.9.2 // NEURAL LINK: ACTIVE
            </div>
        </div>
    );
};
