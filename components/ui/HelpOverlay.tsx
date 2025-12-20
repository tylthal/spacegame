import React from 'react';
import { ENEMY_INFO_UI } from '../../config/constants';

interface HelpState {
    page: number;
    enemyIndex: number;
}

interface Props {
    helpState: HelpState;
}

const HelpOverlay: React.FC<Props> = ({ helpState }) => {
    return (
          <div className="absolute inset-0 z-40 flex pointer-events-none">
              {/* Left Panel: Content */}
              <div className="w-full h-full p-4 md:p-12 relative">
                  <div className="absolute top-8 left-8">
                     <h2 className="text-4xl font-black text-cyan-500 uppercase tracking-widest mb-1">Database</h2>
                     <div className="h-1 w-24 bg-cyan-500" />
                  </div>
                  
                  {helpState.page === 0 ? (
                      <div className="absolute top-[20%] left-8 md:left-12 max-w-md bg-black/80 p-6 border-l-4 border-cyan-500">
                          <h3 className="text-2xl text-white font-bold uppercase tracking-wider mb-4">Combat Mechanics</h3>
                          <div className="space-y-4 text-sm text-cyan-100/80 leading-relaxed font-mono">
                              <p><strong className="text-cyan-400">AIMING:</strong> Right Hand.</p>
                              <p><strong className="text-cyan-400">FIRE:</strong> Left Hand Pinch.</p>
                              <p><strong className="text-cyan-400">MISSILE:</strong> Left Hand Fist.</p>
                          </div>
                      </div>
                  ) : (
                      <div className="absolute bottom-[25%] left-8 md:left-12 max-w-md bg-black/80 p-6 border-l-4 border-cyan-500">
                           <h3 className="text-3xl text-white font-black uppercase tracking-widest mb-2">{ENEMY_INFO_UI[helpState.enemyIndex].name}</h3>
                           <p className="text-cyan-400 text-xs font-bold mb-4">{ENEMY_INFO_UI[helpState.enemyIndex].stats}</p>
                           <p className="text-cyan-100/80 text-sm leading-relaxed">{ENEMY_INFO_UI[helpState.enemyIndex].desc}</p>
                      </div>
                  )}

                  {/* Navigation Indicators */}
                  
                  {/* NEXT PAGE (Right Center) */}
                  <div className="absolute top-1/2 right-12 md:right-24 -translate-y-1/2 flex items-center animate-pulse">
                      <span className="text-cyan-400 font-black uppercase tracking-widest text-xl mr-4">
                          {helpState.page === 0 ? "NEXT PAGE" : "MANUAL"} &gt;
                      </span>
                      <div className="w-16 h-0.5 bg-cyan-500" />
                  </div>

                  {/* CYCLE (Left Center - Only on Page 1) */}
                  {helpState.page === 1 && (
                      <div className="absolute top-1/2 left-12 md:left-24 -translate-y-1/2 flex items-center animate-pulse">
                          <div className="w-16 h-0.5 bg-purple-500" />
                          <span className="text-purple-400 font-black uppercase tracking-widest text-xl ml-4">
                              &lt; CYCLE
                          </span>
                      </div>
                  )}

                  {/* EXIT (Bottom Center) */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-pulse">
                      <span className="text-orange-500 font-black uppercase tracking-widest text-xl mb-2">EXIT</span>
                      <div className="w-0.5 h-16 bg-orange-500" />
                  </div>
              </div>
          </div>
    );
};

export default HelpOverlay;
