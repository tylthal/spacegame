import React, { useMemo, useState } from 'react';
import PlaceholderScreen from './components/PlaceholderScreen';
import PhaseList, { PhaseDescriptor, PhaseId } from './components/PhaseList';

const phases: PhaseDescriptor[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    summary: 'Keep the repository stripped to the new shell so rebuilt systems land on a clean base.',
  },
  {
    id: 'calibration',
    title: 'Calibration placeholder',
    summary: 'Add the new calibration UX and input plumbing once the input stack is rebuilt.',
  },
  {
    id: 'ready',
    title: 'Ready/menu placeholder',
    summary: 'Wire the future phase manager and menu targets here after the phase system is reconstructed.',
  },
  {
    id: 'gameplay',
    title: 'Gameplay placeholder',
    summary: 'Reintroduce the render loop, spawning, and HUD after new kernels and tests exist.',
  },
];

const foundationChecklist = [
  'Legacy gameplay systems, assets, and MediaPipe/Three.js hooks removed.',
  'New placeholder screens swap without relying on globals or refs.',
  'Guard tests prevent reintroducing quarantined modules by accident.',
];

const App: React.FC = () => {
  const [activePhase, setActivePhase] = useState<PhaseId>('foundation');

  const active = useMemo(() => phases.find(phase => phase.id === activePhase) ?? phases[0], [activePhase]);

  const advance = () => {
    const index = phases.findIndex(phase => phase.id === activePhase);
    const next = phases[index + 1];
    if (!next) {
      setActivePhase('foundation');
      return;
    }
    setActivePhase(next.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-50">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.45em] text-cyan-400">Spacegame rebuild shell</p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Fresh base with legacy code removed</h1>
          <p className="text-base text-slate-200 leading-relaxed max-w-4xl">
            The legacy game, assets, and camera/gesture hooks have been cleared out. What remains is a stable React shell with
            placeholder screens so we can layer the rebuild plan piece by piece without fighting old dependencies.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.2fr,1.8fr] items-start">
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

            <PhaseList phases={phases} activePhase={activePhase} onSelect={setActivePhase} />
          </div>

          <PlaceholderScreen
            phase={active}
            onAdvance={advance}
            onReset={() => setActivePhase('foundation')}
            isLastPhase={activePhase === phases[phases.length - 1].id}
          />
        </div>

        <section className="grid gap-3 md:grid-cols-3" aria-label="Foundation checklist">
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
    </div>
  );
};

export default App;
