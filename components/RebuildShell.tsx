import React from 'react';
import PlaceholderScreen from './PlaceholderScreen';
import PhaseList, { PhaseDescriptor, PhaseId } from './PhaseList';
import HudOverlay from './HudOverlay';
import DebugPanel from './DebugPanel';
import { DebugConfig } from '../observability/DebugConfig';
import { DiagnosticsReport } from '../observability/DiagnosticsHarness';
import { WebcamPreview } from './WebcamPreview';
import { HandTracker } from '../input/HandTracker';

const foundationChecklist = [
    'Legacy gameplay systems, assets, and MediaPipe/Three.js hooks removed.',
    'New placeholder screens swap without relying on globals or refs.',
    'Guard tests prevent reintroducing quarantined modules by accident.',
];

const USE_REAL_INPUT = import.meta.env.VITE_USE_REAL_INPUT === '1' || import.meta.env.VITE_USE_REAL_INPUT === 'true';

interface RebuildShellProps {
    phases: PhaseDescriptor[];
    activePhase: PhaseId;
    onPhaseSelect: (id: PhaseId) => void;
    onAdvance: () => void;
    onReset: () => void;
    tracker: HandTracker | null;
    cameraError: string | null;
    onStreamReady: (video: HTMLVideoElement) => void;
    debugConfig: DebugConfig;
    diagnostics?: DiagnosticsReport;
}

export const RebuildShell: React.FC<RebuildShellProps> = ({
    phases,
    activePhase,
    onPhaseSelect,
    onAdvance,
    onReset,
    tracker,
    cameraError,
    onStreamReady,
    debugConfig,
    diagnostics
}) => {
    const active = phases.find(p => p.id === activePhase) ?? phases[0];
    const isLastPhase = activePhase === phases[phases.length - 1].id;

    const hudPreview = {
        score: 48250,
        hull: 86,
        lives: 3,
        multiplier: 2.4,
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-8 relative z-10 pointer-events-none">
            {/* Enable pointer events only for interactive children */}
            <header className="space-y-3 pointer-events-auto">
                <p className="text-xs uppercase tracking-[0.45em] text-cyan-400">Spacegame rebuild shell</p>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Fresh base with legacy code removed</h1>
                <p className="text-base text-slate-200 leading-relaxed max-w-4xl">
                    The legacy game, assets, and camera/gesture hooks have been cleared out. What remains is a stable React shell with
                    placeholder screens so we can layer the rebuild plan piece by piece without fighting old dependencies.
                </p>
            </header>

            {USE_REAL_INPUT && (
                <section className="border border-cyan-900/50 rounded-xl p-4 bg-cyan-950/20 pointer-events-auto">
                    <h2 className="text-sm font-bold text-cyan-300 mb-4 uppercase tracking-wider">Input Diagnostics</h2>
                    <div className="grid md:grid-cols-[320px,1fr] gap-6">
                        <div className="aspect-video bg-black rounded overflow-hidden relative shadow-2xl ring-1 ring-cyan-500/30">
                            <WebcamPreview onStreamReady={onStreamReady} onError={() => { }} />
                            {/* Note: onError in App.tsx sets state, passed here as cameraError? 
                     WebcamPreview prop onError takes (err: Error) => void.
                     The prop cameraError is a *string* to display.
                     App.tsx handled the setting. Here we just need to pass the handler or handle display.
                     Ah, WebcamPreview calls onError, which sets the state in App.
                     So we should accept onCameraError prop? 
                     Simplification: App passes onStreamReady. 
                     The WebcamPreview component handles triggering the error. 
                     We need to pass the error handler down if we want App to know.
                     Reusing the same signature as App's usage for now would be cleaner, 
                     but let's just make WebcamPreview's onError optional or wired.
                     Wait, App.tsx had: `onError={err => setCameraError(err.message)}`
                     So RebuildShell needs an `onCameraError` prop.
                  */}
                            {cameraError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 p-4 text-center text-red-200 text-sm font-mono">
                                    {cameraError}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 text-sm text-cyan-100/70 font-mono">
                            <p>Stack: <span className="text-white">MediaPipe Tasks Vision (GPU)</span></p>
                            <p>Status: <span className={tracker ? "text-green-400" : "text-yellow-400"}>{tracker ? 'Initialized' : 'Waiting...'}</span></p>
                            <p className="text-xs text-slate-400 mt-2">
                                Use the debug panel below to see streaming landmark data once a hand is detected.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <section className="grid gap-4 md:grid-cols-[1.4fr,1fr] pointer-events-auto" aria-label="HUD preview and guidance">
                {/* Render HUD in 'preview' mode or just static? 
                 The HudOverlay in App.tsx was just being rendered with static props.
                 It's fine to render it here.
             */}
                <div className="relative h-48 md:h-auto border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/40">
                    {/* We wrap HUD in a box to contain it since it uses absolute positioning now */}
                    <HudOverlay {...hudPreview} />
                </div>

                <div className="border border-slate-700/70 rounded-xl p-4 bg-slate-900/60 shadow-lg space-y-2">
                    <h2 className="text-lg font-semibold text-white">HUD and menu rebuild slice</h2>
                    <p className="text-sm text-slate-200/80 leading-relaxed">
                        The new HUD overlay stands alone from the gameplay loop and exposes text-first fallbacks for accessibility. Menu
                        targets will reuse the same injection points when the ready screen is wired to the rebuilt phase manager.
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-100/80 space-y-1">
                        <li>Score, hull, and lives surface via aria-live regions.</li>
                        <li>Menu targets live at the `MENU_Z` plane for ray-hit testing.</li>
                        <li>Components stay dependency-injection friendly for future kernels.</li>
                    </ul>
                </div>
            </section>

            <div className="grid gap-6 md:grid-cols-[1.2fr,1.8fr] items-start pointer-events-auto">
                <div className="space-y-4">
                    <div className="border border-slate-700/70 rounded-xl p-4 bg-slate-900/70 shadow-lg">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Rebuild checkpoints</h2>
                            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-3 py-1">
                                Clean slate
                            </span>
                        </div>
                        <p className="text-sm text-slate-200/80 mt-2 leading-relaxed">
                            Select a placeholder screen to see where the next slice of work will land. All legacy imports are gone so these
                            slots stay decoupled until rebuilt.
                        </p>
                    </div>

                    <PhaseList phases={phases} activePhase={activePhase} onSelect={onPhaseSelect} />
                </div>

                <PlaceholderScreen
                    phase={active}
                    onAdvance={onAdvance}
                    onReset={onReset}
                    isLastPhase={isLastPhase}
                />
            </div>

            <div className="pointer-events-auto">
                {debugConfig.debugPanels && <DebugPanel config={debugConfig} diagnostics={diagnostics} />}
            </div>

            <section className="grid gap-3 md:grid-cols-3 pointer-events-auto" aria-label="Foundation checklist">
                {foundationChecklist.map(item => (
                    <div
                        key={item}
                        className="border border-slate-700/70 rounded-lg p-4 bg-slate-900/60 text-sm text-slate-100/80 leading-relaxed"
                    >
                        {item}
                    </div>
                ))}
            </section>
        </div>
    );
};
