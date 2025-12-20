import React from 'react';

interface WeaponStatusProps {
    heat: number;
    isOverheated: boolean;
    missileProgress: number;
}

const WeaponStatus: React.FC<WeaponStatusProps> = ({ heat, isOverheated, missileProgress }) => {
    return (
        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center w-56 md:w-64 pointer-events-none z-30 transition-all">
            {/* Heat Bar Container */}
            <div className={`w-full h-2 md:h-2 bg-gray-900/80 border ${isOverheated ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'border-cyan-500/30'} rounded-full overflow-hidden transition-colors duration-300`}>
                {/* Heat Fill */}
                <div 
                    className={`h-full transition-all duration-100 ease-linear ${isOverheated ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 via-cyan-300 to-red-500'}`}
                    style={{ width: `${heat}%` }}
                />
            </div>
            
            {/* Heat Labels */}
            <div className="flex justify-between w-full mt-1 px-1 mb-2 md:mb-3">
                <span className={`text-[9px] uppercase font-bold tracking-widest ${isOverheated ? 'text-red-400' : 'text-cyan-600'}`}>
                    Thermal Load
                </span>
                {isOverheated && (
                    <span className="text-[9px] uppercase font-black text-red-500 animate-bounce tracking-widest">
                        VENTING
                    </span>
                )}
                {!isOverheated && heat > 80 && (
                     <span className="text-[9px] uppercase font-bold text-red-400 animate-pulse tracking-widest">
                        WARNING
                    </span>
                )}
            </div>

            {/* Missile Status Bar */}
            <div className={`w-full h-1.5 md:h-1.5 bg-gray-900/80 border ${missileProgress >= 1.0 ? 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'border-orange-500/30'} rounded-full overflow-hidden`}>
                <div
                    className={`h-full transition-all duration-100 ease-linear ${missileProgress >= 1.0 ? 'bg-orange-500' : 'bg-orange-800/60'}`}
                    style={{ width: `${missileProgress * 100}%` }}
                />
            </div>
            
            {/* Missile Labels */}
            <div className="flex justify-between w-full mt-1 px-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-orange-600">
                    Proximity Missile
                </span>
                {missileProgress >= 1.0 ? (
                     <span className="text-[9px] uppercase font-black text-orange-500 tracking-widest animate-pulse">
                        READY
                    </span>
                ) : (
                    <span className="text-[9px] uppercase font-bold text-orange-900 tracking-widest">
                        CHARGING
                    </span>
                )}
            </div>
         </div>
    );
};

export default WeaponStatus;