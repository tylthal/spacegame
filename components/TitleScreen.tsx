import React, { useState, useEffect, useRef } from 'react';
import { SoundEngine, MusicEngine } from '../audio';

interface TitleScreenProps {
    onStart: () => void;
    onHelp?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onHelp }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [isHoveringHelp, setIsHoveringHelp] = useState(false);
    const musicStartedRef = useRef(false);

    // Start title music on first user interaction (click/touch anywhere)
    useEffect(() => {
        const startMusic = () => {
            if (!musicStartedRef.current) {
                musicStartedRef.current = true;
                MusicEngine.play('title');
            }
        };

        // Listen for first click/touch/keypress to unlock audio and start music
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => window.addEventListener(event, startMusic, { once: true }));

        return () => {
            events.forEach(event => window.removeEventListener(event, startMusic));
        };
    }, []);

    const handleMouseEnter = () => {
        if (!isHovering) {
            SoundEngine.play('menuHover');
            setIsHovering(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    const handleClick = () => {
        SoundEngine.play('buttonPress');
        onStart();
    };

    const handleHelpEnter = () => {
        if (!isHoveringHelp) {
            SoundEngine.play('menuHover');
            setIsHoveringHelp(true);
        }
    };

    const handleHelpLeave = () => {
        setIsHoveringHelp(false);
    };

    const handleHelpClick = () => {
        SoundEngine.play('buttonPress');
        onHelp?.();
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">

            {/* Main Title Card - compact for landscape */}
            <div className="relative z-10 flex flex-col items-start justify-center text-left p-2 tall:p-4 md:p-12 w-full max-w-4xl pointer-events-auto">

                {/* SYSTEM HEADER - hidden on small landscape */}
                <div className="hidden tall:flex flex-row items-center space-x-2 sm:space-x-4 mb-1 tall:mb-2 md:mb-4">
                    <div className="h-2 w-2 tall:h-3 tall:w-3 md:h-4 md:w-4 bg-y2k-yellow animate-pulse" />
                    <p className="text-y2k-yellow font-mono text-[8px] tall:text-[10px] md:text-sm tracking-widest uppercase">
                        // CORE_SYS_BREACH // AUTO_SEQ_99
                    </p>
                </div>

                {/* GIANT TITLE - Compact for landscape */}
                <div className="relative">
                    <h1 className="text-3xl tall:text-4xl sm:text-6xl md:text-9xl font-display font-bold text-y2k-white tracking-tighter leading-[0.8] select-none mix-blend-difference">
                        ORBITAL
                    </h1>
                    <h1 className="text-3xl tall:text-4xl sm:text-6xl md:text-9xl font-display font-bold text-y2k-yellow tracking-tighter leading-[0.8] select-none ml-0.5 tall:ml-1 md:ml-2">
                        DEFENSE
                    </h1>
                </div>

                {/* Subtext Grid - compact for landscape */}
                <div className="mt-2 tall:mt-3 md:mt-8 border-l-2 tall:border-l-2 md:border-l-4 border-y2k-yellow pl-2 tall:pl-3 md:pl-6 space-y-0.5 tall:space-y-1 md:space-y-2 max-w-lg bg-black/80 p-1.5 tall:p-2 md:p-4">
                    <p className="text-y2k-white font-body text-sm tall:text-base md:text-2xl uppercase tracking-wide">
                        HOSTILE. DRONE. SWARM.
                    </p>
                    <p className="text-y2k-silver font-mono text-[8px] tall:text-[9px] md:text-xs leading-relaxed hidden tall:block">
                        SECTOR 7 COMPROMISED. NEURAL LINK REQUIRED FOR WEAPONRY SYSTEMS.
                    </p>
                </div>

                {/* BUTTONS - Compact for landscape */}
                <div className="pt-3 tall:pt-4 md:pt-12 flex gap-3 tall:gap-4 md:gap-6">
                    <button
                        onClick={handleClick}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="group relative px-4 tall:px-6 md:px-10 py-2 tall:py-3 md:py-5 bg-transparent border-2 border-y2k-yellow hover:bg-y2k-yellow text-y2k-yellow hover:text-y2k-black transition-all duration-0 font-display font-bold text-sm tall:text-base md:text-2xl tracking-widest uppercase"
                    >
                        <span className="relative z-10 group-hover:animate-twitch">START</span>

                        {/* Hard Shadow/Offset */}
                        <div className="absolute top-0.5 left-0.5 tall:top-1 tall:left-1 md:top-2 md:left-2 w-full h-full border-2 border-y2k-red -z-10 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                    </button>

                    {onHelp && (
                        <button
                            onClick={handleHelpClick}
                            onMouseEnter={handleHelpEnter}
                            onMouseLeave={handleHelpLeave}
                            className="group relative px-4 tall:px-6 md:px-10 py-2 tall:py-3 md:py-5 bg-transparent border-2 border-y2k-cyan hover:bg-y2k-cyan text-y2k-cyan hover:text-black transition-all duration-0 font-display font-bold text-sm tall:text-base md:text-2xl tracking-widest uppercase"
                        >
                            <span className="relative z-10 group-hover:animate-twitch">HELP</span>

                            {/* Hard Shadow/Offset */}
                            <div className="absolute top-0.5 left-0.5 tall:top-1 tall:left-1 md:top-2 md:left-2 w-full h-full border-2 border-y2k-silver -z-10 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                        </button>
                    )}
                </div>

            </div>

            {/* Version / Credits - hidden on landscape */}
            <div className="absolute bottom-2 tall:bottom-4 md:bottom-6 text-slate-600 font-mono text-[8px] tall:text-[10px] md:text-xs tracking-widest uppercase hidden tall:block">
                v0.9.2 // NEURAL LINK: ACTIVE
            </div>
        </div>
    );
};

