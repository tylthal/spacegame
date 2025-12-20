import React from 'react';

const ReadyOverlay: React.FC = () => {
    return (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-40">
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 uppercase tracking-[0.2em] drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]">
                Ready
            </h1>
            <p className="mt-2 md:mt-4 text-sm md:text-lg text-cyan-400 font-bold uppercase tracking-widest animate-bounce">
                Shoot Target to Start
            </p>
          </div>
    );
};

export default ReadyOverlay;
