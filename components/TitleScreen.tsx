import React from 'react';

interface TitleScreenProps {
    onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">

            {/* Main Title Card */}
            <div className="relative z-10 flex flex-col items-start justify-center text-left p-12 w-full max-w-4xl pointer-events-auto">

                {/* SYSTEM HEADER */}
                <div className="flex flex-row items-center space-x-4 mb-4">
                    <div className="h-4 w-4 bg-y2k-yellow animate-pulse" />
                    <p className="text-y2k-yellow font-mono text-sm tracking-widest uppercase">
                        // CORE_SYS_BREACH // AUTO_SEQ_99
                    </p>
                </div>

                {/* GIANT TITLE - Overlapping/Tight */}
                <div className="relative">
                    <h1 className="text-9xl font-display font-bold text-y2k-white tracking-tighter leading-[0.8] select-none mix-blend-difference">
                        ORBITAL
                    </h1>
                    <h1 className="text-9xl font-display font-bold text-y2k-yellow tracking-tighter leading-[0.8] select-none ml-2">
                        SNIPER
                    </h1>
                </div>

                {/* Subtext Grid */}
                <div className="mt-8 border-l-4 border-y2k-yellow pl-6 space-y-2 max-w-lg bg-black/80 p-4">
                    <p className="text-y2k-white font-body text-2xl uppercase tracking-wide">
                        HOSTILE. DRONE. SWARM.
                    </p>
                    <p className="text-y2k-silver font-mono text-xs leading-relaxed">
                        SECTOR 7 COMPROMISED. NEURAL LINK REQUIRED FOR WEAPONRY SYSTEMS.
                        INITIATE HANDSHAKE SEQUENCE IMMEDIATELY.
                    </p>
                </div>

                {/* BUTTON - Hard Edge, High Contrast */}
                <div className="pt-12">
                    <button
                        onClick={onStart}
                        className="group relative px-10 py-5 bg-transparent border-2 border-y2k-yellow hover:bg-y2k-yellow text-y2k-yellow hover:text-y2k-black transition-all duration-0 font-display font-bold text-2xl tracking-widest uppercase"
                    >
                        <span className="relative z-10 group-hover:animate-twitch">INITIALIZE_SYSTEM</span>

                        {/* Hard Shadow/Offset */}
                        <div className="absolute top-2 left-2 w-full h-full border-2 border-y2k-red -z-10 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                    </button>
                </div>

            </div>

            {/* Version / Credits */}
            <div className="absolute bottom-6 text-slate-600 font-mono text-xs tracking-widest uppercase">
                v0.9.2 // NEURAL LINK: ACTIVE
            </div>
        </div>
    );
};
