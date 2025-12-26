import React, { useState, useEffect } from 'react';

interface TierAnnouncementProps {
    tier: number;
    onComplete?: () => void;
}

// Tier announcements with dramatic warnings
const TIER_MESSAGES = [
    { title: 'TIER 1', subtitle: 'DRONE SWARM INCOMING', color: 'text-green-400' },
    { title: 'TIER 2', subtitle: 'WEAVER DETECTED', color: 'text-cyan-400' },
    { title: 'TIER 3', subtitle: 'SHIELDED DRONE INCOMING', color: 'text-fuchsia-400' },
    { title: 'TIER 4', subtitle: 'SWARM INTENSIFYING', color: 'text-yellow-400' },
    { title: 'DANGER', subtitle: 'MAXIMUM THREAT', color: 'text-red-400' },
];

/**
 * Full-screen tier transition announcement overlay.
 * Displays dramatic warning when difficulty tier changes.
 */
export function TierAnnouncement({ tier, onComplete }: TierAnnouncementProps) {
    const [visible, setVisible] = useState(true);
    const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

    const message = TIER_MESSAGES[tier] || TIER_MESSAGES[TIER_MESSAGES.length - 1];

    useEffect(() => {
        // Reset state when tier changes
        setVisible(true);
        setPhase('enter');

        // Animation timeline: enter (300ms) -> hold (700ms) -> exit (500ms)
        const enterTimer = setTimeout(() => setPhase('hold'), 300);
        const exitTimer = setTimeout(() => setPhase('exit'), 1000);
        const completeTimer = setTimeout(() => {
            setVisible(false);
            if (onComplete) onComplete();
        }, 1500);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [tier]); // Reset on tier change

    if (!visible) return null;

    const opacityClass = phase === 'exit' ? 'opacity-0' : 'opacity-100';
    const scaleClass = phase === 'enter' ? 'scale-150' : 'scale-100';

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none
                        transition-all duration-300 ${opacityClass}`}
        >
            {/* Dark vignette overlay */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/60" />

            {/* Announcement content */}
            <div className={`text-center transform transition-all duration-300 ${scaleClass}`}>
                {/* Warning icon */}
                <div className={`text-6xl md:text-8xl mb-4 animate-pulse ${message.color}`}>
                    ⚠️
                </div>

                {/* Title */}
                <h1 className={`font-display font-bold text-4xl md:text-6xl ${message.color}
                               tracking-widest mb-2 animate-pulse`}
                    style={{ textShadow: '0 0 30px currentColor, 0 0 60px currentColor' }}
                >
                    {message.title}
                </h1>

                {/* Subtitle */}
                <p className="font-display text-xl md:text-3xl text-white tracking-wider"
                    style={{ textShadow: '0 0 10px white' }}
                >
                    {message.subtitle}
                </p>
            </div>
        </div>
    );
}
