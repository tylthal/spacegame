import React from 'react';

interface HandCursorProps {
    /** Cursor position (0-1 normalized screen coordinates) */
    position: { x: number; y: number };
    /** Whether the user is currently pinching (click state) */
    isPinching?: boolean;
    /** Whether to show the cursor */
    visible?: boolean;
    /** Optional custom className for the outer container */
    className?: string;
}

/**
 * HandCursor - A visual cursor controlled by hand tracking.
 * 
 * Features:
 * - Crosshair design with center dot
 * - Visual feedback on pinch (click) state
 * - Smooth transitions between states
 */
export const HandCursor: React.FC<HandCursorProps> = ({
    position,
    isPinching = false,
    visible = true,
    className = '',
}) => {
    if (!visible) return null;

    return (
        <div
            className={`fixed pointer-events-none z-[9999] transition-transform duration-75 ${className}`}
            style={{
                left: `${position.x * 100}%`,
                top: `${position.y * 100}%`,
                transform: 'translate(-50%, -50%)',
            }}
        >
            {/* Outer ring */}
            <div
                className={`w-12 h-12 rounded-full border-4 transition-all duration-100 flex items-center justify-center ${isPinching
                        ? 'border-y2k-red bg-y2k-red/30 scale-75'
                        : 'border-y2k-yellow bg-y2k-yellow/20'
                    }`}
            >
                {/* Center dot */}
                <div
                    className={`w-2 h-2 rounded-full ${isPinching ? 'bg-y2k-red' : 'bg-y2k-yellow'
                        }`}
                />
            </div>

            {/* Crosshair lines */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-y2k-yellow/50 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-y2k-yellow/50 -translate-x-1/2" />
        </div>
    );
};

export default HandCursor;
