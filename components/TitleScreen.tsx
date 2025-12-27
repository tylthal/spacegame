import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { SoundEngine, MusicEngine } from '../audio';
import { OrbitalStation } from '../infrastructure/three/assets/OrbitalStation';

interface TitleScreenProps {
    onStart: () => void;
    onPractice?: () => void;
    onHelp?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onPractice, onHelp }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [isHoveringHelp, setIsHoveringHelp] = useState(false);
    const [isHoveringPractice, setIsHoveringPractice] = useState(false);
    const musicStartedRef = useRef(false);

    // Start title music on first user interaction (click/touch anywhere)
    useEffect(() => {
        const startMusic = () => {
            // Initialize audio engine on first user interaction (required by browsers)
            SoundEngine.tryInit();

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

    const handlePracticeEnter = () => {
        if (!isHoveringPractice) {
            SoundEngine.play('menuHover');
            setIsHoveringPractice(true);
        }
    };

    const handlePracticeLeave = () => {
        setIsHoveringPractice(false);
    };

    const handlePracticeClick = () => {
        SoundEngine.play('buttonPress');
        onPractice?.();
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
        <div className="fixed inset-0 flex z-50">
            {/* Left side - Title and buttons */}
            <div className="flex-1 flex flex-col items-start justify-center text-left p-2 tall:p-4 md:p-12 pointer-events-auto">

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
                <div className="pt-3 tall:pt-4 md:pt-12 flex flex-col gap-3 tall:gap-4 md:gap-6 items-start">
                    <div className="flex gap-3 tall:gap-4 md:gap-6">
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
                                className="group relative px-4 tall:px-6 md:px-10 py-2 tall:py-3 md:py-5 bg-transparent border-2 border-[#00FFFF] hover:bg-[#00FFFF] text-[#00FFFF] hover:text-black transition-all duration-0 font-display font-bold text-sm tall:text-base md:text-2xl tracking-widest uppercase"
                            >
                                <span className="relative z-10 group-hover:animate-twitch">HELP</span>

                                {/* Hard Shadow/Offset */}
                                <div className="absolute top-0.5 left-0.5 tall:top-1 tall:left-1 md:top-2 md:left-2 w-full h-full border-2 border-y2k-silver -z-10 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                            </button>
                        )}
                    </div>

                    {/* Practice Mode Button - Smaller/Secondary style */}
                    {onPractice && (
                        <button
                            onClick={handlePracticeClick}
                            onMouseEnter={handlePracticeEnter}
                            onMouseLeave={handlePracticeLeave}
                            className="group relative px-4 tall:px-6 md:px-8 py-1.5 tall:py-2 md:py-3 bg-transparent border border-slate-500 hover:border-white hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200 font-mono font-bold text-xs tall:text-sm md:text-lg tracking-widest uppercase"
                        >
                            <span className="relative z-10">PRACTICE MODE</span>
                        </button>
                    )}
                </div>

                {/* Version */}
                <div className="mt-4 tall:mt-6 md:mt-12 text-slate-600 font-mono text-[8px] tall:text-[10px] md:text-xs tracking-widest uppercase hidden tall:block">
                    v0.9.2 // NEURAL LINK: ACTIVE
                </div>
            </div>

            {/* Right side - Orbital Station 3D - allows overflow for dramatic composition */}
            <div className="flex-1 hidden md:block pointer-events-none overflow-visible" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: '-50%', width: '200%', height: '200%' }}>
                    <Canvas
                        camera={{ position: [35, 15, 35], fov: 50, near: 0.1, far: 300 }}
                        shadows
                        style={{ background: 'transparent' }}
                    >
                        {/* Dramatic side lighting for shadows */}
                        <ambientLight intensity={0.6} />
                        <directionalLight
                            position={[-25, 20, 10]}
                            intensity={4}
                            color="#fff8e0"
                            castShadow
                            shadow-mapSize={[1024, 1024]}
                        />
                        <directionalLight position={[10, -5, -15]} intensity={0.8} color="#4488ff" />
                        <pointLight position={[0, 0, 0]} intensity={3.0} color="#00aaff" distance={40} />

                        {/* Station - large, positioned up-left for dramatic composition */}
                        <group position={[0, 5, 0]}>
                            <group scale={2.5}>
                                <OrbitalStation />
                            </group>
                        </group>
                    </Canvas>
                </div>
            </div>
        </div>
    );
};
