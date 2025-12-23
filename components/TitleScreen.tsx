import React from 'react';

interface TitleScreenProps {
    onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">

            {/* Main Title Card */}
            <div className="relative text-center space-y-6 pointer-events-auto p-12 bg-slate-950/50 backdrop-blur-sm rounded-3xl border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-1000">

                {/* Decorative Top Line */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 mb-8" />

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-500 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                    ORBITAL<br />SNIPER
                </h1>

                <div className="space-y-2">
                    <p className="text-cyan-400 font-mono tracking-[0.3em] uppercase text-sm">
                        // Void Defense Protocol //
                    </p>
                    <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                        Hostile drone swarms detected in Sector 7. <br />
                        Establish neural handshake to commence defensive operations.
                    </p>
                </div>

                <div className="pt-8 pb-4">
                    <button
                        onClick={onStart}
                        className="group relative px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl tracking-[0.2em] uppercase clip-path-polygon transition-all duration-300 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] hover:scale-105"
                        style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
                    >
                        <span className="relative z-10">Initialize System</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    </button>
                </div>

                {/* Decorative Bottom Line */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 mt-8" />
            </div>

            {/* Version / Credits */}
            <div className="absolute bottom-6 text-slate-600 font-mono text-xs tracking-widest uppercase">
                v0.9.2 // NEURAL LINK: ACTIVE
            </div>
        </div>
    );
};
