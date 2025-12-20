import React from 'react';

interface Props {
    score: number;
}

const GameOverOverlay: React.FC<Props> = ({ score }) => {
    return (
          <div className="absolute inset-0 bg-red-900/20 backdrop-blur-md z-50 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                  <h2 className="text-5xl md:text-8xl font-black text-red-500 uppercase tracking-tighter mb-2 md:mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                      Critical Failure
                  </h2>
                  <div className="bg-black/80 border border-red-500/50 p-4 md:p-8 rounded-lg mb-6 md:mb-8 inline-block shadow-2xl">
                      <p className="text-red-400 text-xs md:text-sm uppercase tracking-widest mb-1 md:mb-2">Final Score</p>
                      <p className="text-4xl md:text-6xl font-mono text-white tabular-nums font-bold">{score.toLocaleString()}</p>
                  </div>
                  <p className="text-white/80 uppercase tracking-widest font-bold animate-pulse text-xs md:text-sm">
                      Shoot <span className="text-red-500 font-black">Red Target</span> to Reboot
                  </p>
              </div>
          </div>
    );
};

export default GameOverOverlay;
