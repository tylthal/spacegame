import React, { useState } from 'react';
import { SoundEngine } from '../audio';
import { GAME_CONFIG } from '../config/gameConfig';

interface HelpScreenProps {
    onBack: () => void;
}

/**
 * HelpScreen - Comprehensive game information and controls
 * Responsive design for all screen sizes and orientations
 */
export const HelpScreen: React.FC<HelpScreenProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'story' | 'controls' | 'enemies'>('story');

    const handleTabChange = (tab: 'story' | 'controls' | 'enemies') => {
        SoundEngine.play('menuHover');
        setActiveTab(tab);
    };

    const handleBack = () => {
        SoundEngine.play('buttonPress');
        onBack();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-2 tall:p-4 md:p-6 border-b border-y2k-yellow/30">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <h1 className="text-xl tall:text-2xl md:text-4xl font-display font-bold text-y2k-yellow tracking-wider">
                        COMMAND BRIEFING
                    </h1>
                    <button
                        onClick={handleBack}
                        className="px-3 py-1 tall:px-4 tall:py-2 md:px-6 md:py-3 border-2 border-y2k-yellow text-y2k-yellow 
                                 font-display font-bold text-xs tall:text-sm md:text-base tracking-wider
                                 hover:bg-y2k-yellow hover:text-black transition-colors"
                    >
                        [ BACK ]
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 flex justify-center gap-1 tall:gap-2 md:gap-4 p-2 tall:p-3 md:p-4 border-b border-y2k-silver/20">
                {(['story', 'controls', 'enemies'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-3 py-1 tall:px-4 tall:py-2 md:px-6 md:py-3 font-display font-bold 
                                  text-[10px] tall:text-xs md:text-sm tracking-wider transition-all
                                  ${activeTab === tab
                                ? 'bg-y2k-yellow text-black'
                                : 'border border-y2k-silver/50 text-y2k-silver hover:border-y2k-yellow hover:text-y2k-yellow'
                            }`}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 tall:p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    {activeTab === 'story' && <StoryTab />}
                    {activeTab === 'controls' && <ControlsTab />}
                    {activeTab === 'enemies' && <EnemiesTab />}
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-2 tall:p-3 md:p-4 border-t border-y2k-silver/20 text-center">
                <p className="text-[8px] tall:text-[10px] md:text-xs font-mono text-y2k-silver/50 tracking-widest">
                    ORBITAL DEFENSE v0.9.2 // NEURAL LINK REQUIRED
                </p>
            </div>
        </div>
    );
};

/** Story/Lore Tab */
function StoryTab() {
    return (
        <div className="space-y-4 tall:space-y-6 md:space-y-8">
            <section>
                <h2 className="text-lg tall:text-xl md:text-2xl font-display font-bold text-y2k-yellow mb-2 tall:mb-3 md:mb-4">
                    THE YEAR IS 2099
                </h2>
                <div className="space-y-2 tall:space-y-3 md:space-y-4 text-xs tall:text-sm md:text-base font-body text-y2k-silver leading-relaxed">
                    <p>
                        Earth's orbital defense grid has fallen. A rogue AI designated <span className="text-y2k-yellow">NEXUS-7</span> has
                        seized control of humanity's autonomous drone fleet, turning our own machines against us.
                    </p>
                    <p>
                        You are Commander <span className="text-y2k-cyan">ZERO</span>, the last human pilot stationed aboard
                        the <span className="text-y2k-yellow">Aegis Station</span> — Earth's final line of defense. When NEXUS-7
                        disabled all automated systems, you alone retained the Neural Link interface required
                        to operate the station's weapons manually.
                    </p>
                    <p>
                        The drone swarm approaches. Wave after wave of hostile machines, their numbers endless.
                        Your mission: <span className="text-y2k-red">survive</span> as long as possible, and take as many
                        of them with you as you can.
                    </p>
                </div>
            </section>

            <section className="border-l-2 tall:border-l-4 border-y2k-cyan pl-3 tall:pl-4 md:pl-6 py-2">
                <p className="text-[10px] tall:text-xs md:text-sm font-mono text-y2k-cyan italic">
                    "The Neural Link bypasses traditional controls. Your hands become the weapon.
                    Point to aim. Pinch to fire. Your survival depends on your reflexes alone."
                </p>
                <p className="text-[8px] tall:text-[10px] md:text-xs font-mono text-y2k-silver/70 mt-1 tall:mt-2">
                    — Dr. Elena Reyes, Neural Interface Division
                </p>
            </section>

            <section>
                <h3 className="text-base tall:text-lg md:text-xl font-display font-bold text-y2k-white mb-2 tall:mb-3">
                    MISSION OBJECTIVE
                </h3>
                <ul className="space-y-1 tall:space-y-2 text-xs tall:text-sm md:text-base font-body text-y2k-silver">
                    <li className="flex items-start gap-2">
                        <span className="text-y2k-yellow">▸</span>
                        <span>Destroy incoming hostile drones before they reach the station</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-y2k-yellow">▸</span>
                        <span>Protect the Aegis Station's hull integrity at all costs</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-y2k-yellow">▸</span>
                        <span>Maximize your score to honor humanity's last stand</span>
                    </li>
                </ul>
            </section>
        </div>
    );
}

/** Controls Tab */
function ControlsTab() {
    return (
        <div className="space-y-4 tall:space-y-6 md:space-y-8">
            <section>
                <h2 className="text-lg tall:text-xl md:text-2xl font-display font-bold text-y2k-yellow mb-2 tall:mb-3 md:mb-4">
                    NEURAL LINK CONTROLS
                </h2>
                <p className="text-xs tall:text-sm md:text-base font-body text-y2k-silver mb-3 tall:mb-4 md:mb-6">
                    The game uses your webcam to track hand movements. Hold both hands in view of the camera.
                </p>
            </section>

            <div className="grid gap-3 tall:gap-4 md:gap-6">
                {/* Aiming */}
                <ControlCard
                    title="AIMING"
                    gesture="Open Hand (Point)"
                    gestureColor="cyan"
                    description="Move your RIGHT hand to aim the targeting reticle. The crosshair follows your hand position."
                />

                {/* Primary Fire */}
                <ControlCard
                    title="PRIMARY FIRE"
                    gesture="Pinch (Thumb + Index)"
                    gestureColor="green"
                    description="Pinch your fingers together to fire rapid-fire plasma bolts. Watch your heat gauge — overheating disables your weapon temporarily!"
                />

                {/* Missile */}
                <ControlCard
                    title="MISSILE LAUNCHER"
                    gesture="Fist (Closed Hand)"
                    gestureColor="red"
                    description="Make a fist to launch a homing missile. Missiles have a 3-second cooldown but deal massive area damage. Perfect for groups!"
                />

                {/* Pause */}
                <ControlCard
                    title="PAUSE GAME"
                    gesture="Both Palms Open"
                    gestureColor="yellow"
                    description="Show both palms to the camera and hold for 0.6 seconds to pause the game."
                />
            </div>

            <section className="bg-y2k-silver/10 p-3 tall:p-4 md:p-6 border border-y2k-silver/30">
                <h3 className="text-sm tall:text-base md:text-lg font-display font-bold text-y2k-white mb-2 tall:mb-3">
                    CALIBRATION
                </h3>
                <p className="text-[10px] tall:text-xs md:text-sm font-body text-y2k-silver">
                    At the start of each session, you'll calibrate your hand tracking. Hold both hands steady
                    in a comfortable position. This sets your "neutral zone" for accurate aiming.
                </p>
            </section>
        </div>
    );
}

/** Control Card Component */
function ControlCard({ title, gesture, gestureColor, description }: {
    title: string;
    gesture: string;
    gestureColor: 'cyan' | 'green' | 'red' | 'yellow';
}) {
    const colorClasses = {
        cyan: 'border-y2k-cyan text-y2k-cyan',
        green: 'border-green-400 text-green-400',
        red: 'border-y2k-red text-y2k-red',
        yellow: 'border-y2k-yellow text-y2k-yellow',
    };

    return (
        <div className={`border-l-2 tall:border-l-4 ${colorClasses[gestureColor]} pl-3 tall:pl-4 md:pl-6 py-2 tall:py-3`}>
            <h4 className="text-sm tall:text-base md:text-lg font-display font-bold text-y2k-white">
                {title}
            </h4>
            <p className={`text-[10px] tall:text-xs md:text-sm font-mono ${colorClasses[gestureColor]} mb-1`}>
                Gesture: {gesture}
            </p>
            <p className="text-[10px] tall:text-xs md:text-sm font-body text-y2k-silver">
                {description}
            </p>
        </div>
    );
}

/** Enemies Tab */
function EnemiesTab() {
    const enemies = [
        {
            name: 'DRONE',
            points: GAME_CONFIG.scoring.drone,
            color: '#00FF88',
            description: 'Standard attack drone. Fast and numerous, but fragile. The backbone of the NEXUS swarm.',
            threat: 'LOW',
            threatColor: 'text-green-400',
        },
        {
            name: 'SCOUT',
            points: GAME_CONFIG.scoring.scout,
            color: '#00FFFF',
            description: 'Reconnaissance unit with enhanced sensors. More durable than standard drones.',
            threat: 'MEDIUM',
            threatColor: 'text-y2k-cyan',
        },
        {
            name: 'BOMBER',
            points: GAME_CONFIG.scoring.bomber,
            color: '#FF4444',
            description: 'Heavy assault craft. Slow but extremely dangerous. Deals massive hull damage on impact.',
            threat: 'HIGH',
            threatColor: 'text-y2k-red',
        },
    ];

    return (
        <div className="space-y-4 tall:space-y-6 md:space-y-8">
            <section>
                <h2 className="text-lg tall:text-xl md:text-2xl font-display font-bold text-y2k-yellow mb-2 tall:mb-3 md:mb-4">
                    HOSTILE UNITS
                </h2>
                <p className="text-xs tall:text-sm md:text-base font-body text-y2k-silver mb-3 tall:mb-4 md:mb-6">
                    NEXUS-7 deploys various drone types. Learn their patterns to survive longer.
                </p>
            </section>

            <div className="space-y-3 tall:space-y-4 md:space-y-6">
                {enemies.map(enemy => (
                    <div
                        key={enemy.name}
                        className="bg-y2k-silver/5 border border-y2k-silver/30 p-3 tall:p-4 md:p-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 tall:mb-3">
                            <div className="flex items-center gap-2 tall:gap-3">
                                <div
                                    className="w-3 h-3 tall:w-4 tall:h-4 md:w-5 md:h-5 rounded-full"
                                    style={{ backgroundColor: enemy.color, boxShadow: `0 0 10px ${enemy.color}` }}
                                />
                                <h3 className="text-base tall:text-lg md:text-xl font-display font-bold text-y2k-white">
                                    {enemy.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3 tall:gap-4 md:gap-6">
                                <span className={`text-[10px] tall:text-xs md:text-sm font-mono ${enemy.threatColor}`}>
                                    THREAT: {enemy.threat}
                                </span>
                                <span className="text-sm tall:text-base md:text-lg font-display font-bold text-y2k-yellow">
                                    +{enemy.points} PTS
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] tall:text-xs md:text-sm font-body text-y2k-silver">
                            {enemy.description}
                        </p>
                    </div>
                ))}
            </div>

            <section className="bg-y2k-yellow/10 border border-y2k-yellow/50 p-3 tall:p-4 md:p-6">
                <h3 className="text-sm tall:text-base md:text-lg font-display font-bold text-y2k-yellow mb-2">
                    SCORING MULTIPLIER
                </h3>
                <p className="text-[10px] tall:text-xs md:text-sm font-body text-y2k-silver">
                    Chain kills quickly to build your multiplier! The longer you survive, the more enemies
                    spawn — and the higher your potential score.
                </p>
            </section>
        </div>
    );
}
