import React from 'react';

interface ReadyScreenProps {
    onStart: () => void;
}

export const ReadyScreen: React.FC<ReadyScreenProps> = ({ onStart }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent pointer-events-none">
            {/* Note: bg is transparent so we can see the initialized game world behind it? 
           Or should it be blurred? Let's go with blur to focus attention. */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm -z-10" />

            <div className="text-center space-y-12 animate-in fade-in zoom-in duration-500">

                <div className="space-y-4">
                    <div className="inline-block px-4 py-1 border border-cyan-500/30 rounded-full bg-cyan-950/30 text-cyan-400 text-xs font-mono tracking-[0.2em] mb-4">
                        SYSTEM READY
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black italic text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        ENGAGE
                    </h1>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-8">
                        <div className="w-24 h-24 border-2 border-white/20 rounded-xl flex items-center justify-center bg-white/5 backdrop-blur">
                            {/* Icon for Pinch */}
                            <div className="w-8 h-8 rounded-full border-4 border-cyan-400" />
                        </div>
                    </div>
                    <p className="text-xl text-white font-bold tracking-widest uppercase">
                        PINCH TO START
                    </p>
                    <p className="text-sm text-slate-400">
                        (Or click here if sensors fail)
                    </p>
                </div>

                <div className="pointer-events-auto">
                    <button
                        onClick={onStart}
                        className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold uppercase tracking-wider transition border border-white/10"
                    >
                        Manual Override
                    </button>
                </div>

            </div>
        </div>
    );
};
