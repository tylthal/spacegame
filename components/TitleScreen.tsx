import React, { useEffect, useState } from 'react';

interface TitleScreenProps {
    onStart: () => void;
    inputReady: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, inputReady }) => {
    const [showPrompt, setShowPrompt] = useState(false);

    // Blink effect for the start prompt
    useEffect(() => {
        const interval = setInterval(() => setShowPrompt(p => !p), 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <div className="text-center space-y-6">
                {/* Title */}
                <div className="space-y-2">
                    <p className="text-cyan-400 tracking-[0.5em] text-xs uppercase font-bold animate-pulse">
                        System Online
                    </p>
                    <h1 className="text-4xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-200 drop-shadow-[0_0_25px_rgba(34,211,238,0.5)] tracking-tighter">
                        ORBITAL<br className="md:hidden" /> SNIPER
                    </h1>
                    <p className="text-slate-400 tracking-[0.8em] text-sm uppercase font-light">
                        Void Defense Protocol
                    </p>
                </div>

                {/* Start Button Area */}
                <div className="pt-12 pointer-events-auto">
                    <button
                        onClick={onStart}
                        className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                        disabled={!inputReady}
                    >
                        {/* Button Background Glow */}
                        <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors" />

                        {/* Borders */}
                        <div className="absolute inset-0 border border-cyan-500/50 rounded-full group-hover:border-cyan-400 transition-colors" />
                        <div className="absolute inset-[2px] border border-cyan-500/20 rounded-full" />

                        {/* Content */}
                        <div className={`flex items-center gap-3 transition-opacity ${inputReady ? 'opacity-100' : 'opacity-50'}`}>
                            <span className="text-cyan-100 font-bold tracking-[0.2em] text-lg uppercase">
                                {inputReady ? 'Initialize' : 'Loading Input...'}
                            </span>
                            {inputReady && (
                                <svg className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            )}
                        </div>

                        {!inputReady && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-full bg-slate-950/50 animate-pulse" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Flashing Prompt */}
                <div className={`mt-4 text-xs text-cyan-500/60 font-mono transition-opacity duration-300 h-4 ${showPrompt ? 'opacity-100' : 'opacity-0'}`}>
                    WAITING FOR OPERATOR INPUT
                </div>
            </div>

            {/* Footer / Credits */}
            <div className="absolute bottom-6 text-slate-500 text-[10px] tracking-widest uppercase font-mono">
                v0.3.0 HYDRATED // REACT THREE FIBER // MEDIAPIPE
            </div>
        </div>
    );
};
