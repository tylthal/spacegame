import React from 'react';

const PauseOverlay: React.FC = () => {
    return (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
            
            {/* Header Area */}
            <div className="absolute top-16 md:top-24 left-0 w-full text-center space-y-2">
                <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                    Paused
                </h2>
                <div className="w-64 h-1 bg-cyan-500 mx-auto rounded-full shadow-[0_0_15px_#06b6d4]" />
                <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase">System Halted</p>
            </div>

            {/* 
                Labels Container 
                Positioned at top: 54% to sit just below the bottom edge of the 3D spheres.
                
                ADAPTIVE LAYOUT STRATEGY:
                Instead of using `vh` offsets (which break in portrait mode), we use percentage-based `left` positioning.
                Since the 3D Camera now adapts its Z-depth based on aspect ratio to keep the world-width constant,
                fixed percentage positions will align with the 3D objects (-75, -25, 25, 75) in all orientations.
            */}
            <div className="absolute top-[54%] left-0 w-full h-0">
                
                {/* 1. Reset (Yellow) - 3D Pos: -75 ~ 15% Screen Width */}
                <div className="absolute left-[15%] -translate-x-1/2 flex flex-col items-center w-24 md:w-32 group">
                     {/* Connector Line */}
                     <div className="h-6 md:h-10 w-0.5 bg-gradient-to-b from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 mb-2" />
                     <div className="bg-yellow-900/30 border border-yellow-500/30 p-2 rounded w-full text-center backdrop-blur-md shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                         <span className="text-yellow-500 font-bold uppercase tracking-widest text-[10px] md:text-xs block">Reset</span>
                         <span className="text-yellow-700 font-bold uppercase text-[8px] tracking-wider block">Simulation</span>
                     </div>
                </div>

                {/* 2. Recalibrate (Purple) - 3D Pos: -25 ~ 38% Screen Width */}
                <div className="absolute left-[38%] -translate-x-1/2 flex flex-col items-center w-24 md:w-32 group">
                     <div className="h-6 md:h-10 w-0.5 bg-gradient-to-b from-purple-500/0 via-purple-500/50 to-purple-500/0 mb-2" />
                     <div className="bg-purple-900/30 border border-purple-500/30 p-2 rounded w-full text-center backdrop-blur-md shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                         <span className="text-purple-400 font-bold uppercase tracking-widest text-[10px] md:text-xs block">Recalibrate</span>
                         <span className="text-purple-600 font-bold uppercase text-[8px] tracking-wider block">Sensors</span>
                     </div>
                </div>

                {/* 3. Database (Blue) - 3D Pos: +25 ~ 62% Screen Width */}
                <div className="absolute left-[62%] -translate-x-1/2 flex flex-col items-center w-24 md:w-32 group">
                     <div className="h-6 md:h-10 w-0.5 bg-gradient-to-b from-blue-500/0 via-blue-500/50 to-blue-500/0 mb-2" />
                     <div className="bg-blue-900/30 border border-blue-500/30 p-2 rounded w-full text-center backdrop-blur-md shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                         <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px] md:text-xs block">Database</span>
                         <span className="text-blue-600 font-bold uppercase text-[8px] tracking-wider block">Intel</span>
                     </div>
                </div>

                 {/* 4. Resume (Green) - 3D Pos: +75 ~ 85% Screen Width */}
                <div className="absolute left-[85%] -translate-x-1/2 flex flex-col items-center w-28 md:w-40 group">
                     <div className="h-6 md:h-10 w-0.5 bg-gradient-to-b from-green-500/0 via-green-500/50 to-green-500/0 mb-2" />
                     <div className="bg-green-900/40 border border-green-500/80 p-3 rounded w-full text-center backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                         <span className="text-green-400 font-black uppercase tracking-widest text-xs md:text-sm block">Resume</span>
                         <span className="text-green-600 font-bold uppercase text-[8px] tracking-wider block">Mission</span>
                     </div>
                </div>

            </div>
        </div>
    );
};

export default PauseOverlay;