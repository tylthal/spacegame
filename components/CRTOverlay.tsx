import React from 'react';

export const CRTOverlay: React.FC = () => {
    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* NOISE GRAIN - High Contrast */}
            <div className="absolute inset-0 noise-overlay" />

            {/* VIGNETTE - Hard Edge */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_120%)]" />

            {/* OCCASIONAL TEAR */}
            {/* We could add a random CSS twitch here using keyframes defined in config */}
        </div>
    );
};
