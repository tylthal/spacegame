import React from 'react';
import { HandLandmark } from '../input/HandTracker';

/**
 * MediaPipe hand landmark connections for wireframe rendering
 * Each pair represents a line segment between two landmark indices
 */
const HAND_CONNECTIONS: [number, number][] = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [5, 9], [9, 10], [10, 11], [11, 12],
    // Ring finger
    [9, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [13, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [0, 17],
];

interface HandWireframeProps {
    /** Left hand landmarks (normalized 0-1) */
    leftLandmarks?: readonly HandLandmark[];
    /** Right hand landmarks (normalized 0-1) */
    rightLandmarks?: readonly HandLandmark[];
    /** Whether left hand matches locked signature */
    leftMatched?: boolean;
    /** Whether right hand matches locked signature */
    rightMatched?: boolean;
    /** Show match score as text */
    showScore?: boolean;
    /** Left hand match score (0-1) */
    leftScore?: number;
    /** Right hand match score (0-1) */
    rightScore?: number;
}

/**
 * HandWireframe - Renders hand skeleton overlay for debugging
 * 
 * Shows the 21 MediaPipe landmarks as connected lines.
 * Green = matched (locked player), Red = unmatched (intruder)
 */
export const HandWireframe: React.FC<HandWireframeProps> = ({
    leftLandmarks,
    rightLandmarks,
    leftMatched = true,
    rightMatched = true,
    showScore = false,
    leftScore,
    rightScore,
}) => {
    const renderHand = (
        landmarks: readonly HandLandmark[],
        matched: boolean,
        score?: number,
        label?: string
    ) => {
        if (landmarks.length < 21) return null;

        const color = matched ? '#00FF00' : '#FF4444';
        const glowColor = matched ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 68, 68, 0.3)';

        // Find center of hand for label placement
        const wrist = landmarks[0];
        const centerX = wrist.x * 100;
        const centerY = (wrist.y * 100) - 3; // Slightly above wrist

        return (
            <g>
                {/* Connection lines */}
                {HAND_CONNECTIONS.map(([from, to], idx) => {
                    const a = landmarks[from];
                    const b = landmarks[to];
                    return (
                        <line
                            key={`line-${idx}`}
                            x1={`${a.x * 100}%`}
                            y1={`${a.y * 100}%`}
                            x2={`${b.x * 100}%`}
                            y2={`${b.y * 100}%`}
                            stroke={color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            style={{
                                filter: `drop-shadow(0 0 3px ${glowColor})`,
                            }}
                        />
                    );
                })}

                {/* Landmark dots */}
                {landmarks.map((lm, idx) => (
                    <circle
                        key={`dot-${idx}`}
                        cx={`${lm.x * 100}%`}
                        cy={`${lm.y * 100}%`}
                        r={idx === 0 ? 5 : 3} // Larger dot for wrist
                        fill={color}
                        style={{
                            filter: `drop-shadow(0 0 4px ${glowColor})`,
                        }}
                    />
                ))}

                {/* Score label */}
                {showScore && score !== undefined && (
                    <text
                        x={`${centerX}%`}
                        y={`${centerY}%`}
                        fill={color}
                        fontSize="12"
                        fontFamily="monospace"
                        textAnchor="middle"
                        style={{
                            filter: `drop-shadow(0 0 2px black)`,
                        }}
                    >
                        {label}: {Math.round(score * 100)}%
                    </text>
                )}
            </g>
        );
    };

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-40"
            style={{ width: '100%', height: '100%' }}
        >
            {leftLandmarks && renderHand(leftLandmarks, leftMatched, leftScore, 'L')}
            {rightLandmarks && renderHand(rightLandmarks, rightMatched, rightScore, 'R')}
        </svg>
    );
};
