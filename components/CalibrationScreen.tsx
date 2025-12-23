import React from 'react';
import { WebcamPreview } from './WebcamPreview';

interface CalibrationScreenProps {
    onStreamReady: (video: HTMLVideoElement) => void;
    onError: (err: Error) => void;
    calibrationProgress: number; // 0 to 1
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
    onStreamReady,
    onError,
    calibrationProgress
}) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
            <div className="max-w-2xl w-full p-8 space-y-8 text-center">

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase">
                        System Calibration
                    </h2>
                    <p className="text-cyan-400 font-mono text-sm tracking-wider">
                        ALIGN OPTICAL SENSORS
                    </p>
                </div>

                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl">
                    {/* The webcam preview lives here during calibration */}
                    <WebcamPreview onStreamReady={onStreamReady} onError={err => onError(new Error(err.message))} />

                    {/* Overlay Guide */}
                    <div className="absolute inset-0 border-[3px] border-cyan-500/30 m-12 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-cyan-500/50 rounded-full animate-pulse" />
                    </div>

                    {/* Scanline Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-xs text-slate-400 font-mono uppercase">
                        <span>Signal Stability</span>
                        <span>{Math.round(calibrationProgress * 100)}%</span>
                    </div>

                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 transition-all duration-300 ease-out"
                            style={{ width: `${calibrationProgress * 100}%` }}
                        />
                    </div>

                    <p className="text-slate-500 text-xs animate-pulse">
                        HOLD POSITION TO CALIBRATE
                    </p>
                </div>

            </div>
        </div>
    );
};
