import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SceneOverlays from '../SceneOverlays';
import { OverlayState } from '../ui/OverlayStateAdapter';
import { GamePhase } from '../../types';

const baseState: OverlayState = {
  phase: 'CALIBRATING',
  score: 1337,
  calibrationProgress: 0.42,
  trackingStatus: { aimer: true, trigger: false, health: 0.88 },
  weaponStatus: { heat: 15, isOverheated: false, missileProgress: 0.5 },
  helpState: { page: 0, enemyIndex: 1 },
};

type RenderOverrides = Partial<OverlayState> & {
  onStartWithoutTracking?: () => void;
  onRetryCamera?: () => void;
  onRestartCalibration?: () => void;
  onContinueFromCalibration?: () => void;
};

const renderPhase = (phase: GamePhase, overrides: RenderOverrides = {}) =>
  renderToStaticMarkup(<SceneOverlays {...baseState} {...overrides} phase={phase} />);

describe('SceneOverlays snapshots', () => {
  it('renders calibration overlay with tracking hints', () => {
    const markup = renderPhase('CALIBRATING');
    expect(markup).toMatchInlineSnapshot(`"<div class="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-md z-50 p-4"><div class="text-center relative w-full max-w-2xl"><div class="flex flex-col items-center gap-3 mb-6 md:mb-8"><div class="px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-500/40 text-[11px] uppercase tracking-[0.25em] text-cyan-200 flex items-center gap-2"><span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>Calibrating Neural Link</div><p class="text-xs uppercase tracking-[0.3em] text-white/60">Hold your left-hand pinch steady to lock in</p></div><div class="mb-8 md:mb-12 relative flex flex-col items-center justify-center scale-75 md:scale-100"><svg viewBox="0 0 200 200" class="w-64 h-64 rotate-[-90deg]"><circle cx="100" cy="100" r="85" fill="transparent" stroke="rgba(0, 255, 255, 0.1)" stroke-width="4"></circle><circle cx="100" cy="100" r="85" fill="transparent" stroke="#00ffff" stroke-width="8" stroke-dasharray="534.0707511102648" stroke-dashoffset="309.7610356439536" class="transition-all duration-100 ease-linear"></circle></svg><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-black text-3xl">42%</div></div><h2 class="text-2xl md:text-4xl font-black italic text-cyan-400 mb-4 md:mb-8 uppercase tracking-tighter">Neural Sync Required</h2><div class="flex flex-col md:flex-row gap-2 md:gap-4 justify-center mb-4 md:mb-8"><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-red-500/10 border-red-500/30 text-red-500">Left Hand: WAITING</div><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-cyan-500/20 border-cyan-500 text-cyan-400">Right Hand: LOCKED</div><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-[0.3em] transition-colors bg-emerald-500/20 border-emerald-400/60 text-emerald-200">Camera: ONLINE</div></div><div class="bg-black/40 border border-cyan-500/30 px-4 md:px-6 py-4 rounded-xl mx-4"><p class="text-white font-mono text-xs md:text-sm tracking-widest uppercase">HOLD STEADY</p></div><div class="mt-6 flex flex-col md:flex-row justify-center gap-3 md:gap-4 items-center"></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] md:w-[40%] h-[40%] border-2 border-cyan-500/30 rounded-lg animate-pulse"></div></div></div>"`);
  });

  it('renders calibration overlay when camera access is blocked', () => {
    const markup = renderPhase('CALIBRATING', {
      calibrationStatus: { stalled: false, cameraReady: false },
    });

    expect(markup).toMatchInlineSnapshot(`"<div class="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-md z-50 p-4"><div class="text-center relative w-full max-w-2xl"><div class="flex flex-col items-center gap-3 mb-6 md:mb-8"><div class="px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-500/40 text-[11px] uppercase tracking-[0.25em] text-cyan-200 flex items-center gap-2"><span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>Calibrating Neural Link</div><p class="text-xs uppercase tracking-[0.3em] text-white/60">Hold your left-hand pinch steady to lock in</p></div><div class="mb-8 md:mb-12 relative flex flex-col items-center justify-center scale-75 md:scale-100"><svg viewBox="0 0 200 200" class="w-64 h-64 rotate-[-90deg]"><circle cx="100" cy="100" r="85" fill="transparent" stroke="rgba(0, 255, 255, 0.1)" stroke-width="4"></circle><circle cx="100" cy="100" r="85" fill="transparent" stroke="#00ffff" stroke-width="8" stroke-dasharray="534.0707511102648" stroke-dashoffset="309.7610356439536" class="transition-all duration-100 ease-linear"></circle></svg><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-black text-3xl">42%</div></div><h2 class="text-2xl md:text-4xl font-black italic text-cyan-400 mb-4 md:mb-8 uppercase tracking-tighter">Neural Sync Required</h2><div class="flex flex-col md:flex-row gap-2 md:gap-4 justify-center mb-4 md:mb-8"><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-red-500/10 border-red-500/30 text-red-500">Left Hand: WAITING</div><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-cyan-500/20 border-cyan-500 text-cyan-400">Right Hand: LOCKED</div><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-[0.3em] transition-colors bg-red-500/10 border-red-500/30 text-red-400">Camera: OFFLINE</div></div><div class="bg-black/40 border border-cyan-500/30 px-4 md:px-6 py-4 rounded-xl mx-4"><p class="text-white font-mono text-xs md:text-sm tracking-widest uppercase">Camera offline. Plug in a webcam, verify privacy permissions, then press Re-request to try again.</p></div><div class="mt-6 flex flex-col md:flex-row justify-center gap-3 md:gap-4 items-center"></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] md:w-[40%] h-[40%] border-2 border-cyan-500/30 rounded-lg animate-pulse"></div></div></div>"`);
  });

  it('renders calibration overlay fallback CTA when provided', () => {
    const markup = renderPhase('CALIBRATING', {
      calibrationStatus: { stalled: true, cameraReady: true, fallbackCta: true },
      onStartWithoutTracking: () => {},
    });

    expect(markup).toMatchInlineSnapshot(`"<div class="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-md z-50 p-4"><div class="text-center relative w-full max-w-2xl"><div class="flex flex-col items-center gap-3 mb-6 md:mb-8"><div class="px-3 py-1 rounded-full bg-cyan-900/50 border border-cyan-500/40 text-[11px] uppercase tracking-[0.25em] text-cyan-200 flex items-center gap-2"><span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>Calibrating Neural Link</div><p class="text-xs uppercase tracking-[0.3em] text-white/60">Hold your left-hand pinch steady to lock in</p></div><div class="mb-8 md:mb-12 relative flex flex-col items-center justify-center scale-75 md:scale-100"><svg viewBox="0 0 200 200" class="w-64 h-64 rotate-[-90deg]"><circle cx="100" cy="100" r="85" fill="transparent" stroke="rgba(0, 255, 255, 0.1)" stroke-width="4"></circle><circle cx="100" cy="100" r="85" fill="transparent" stroke="#00ffff" stroke-width="8" stroke-dasharray="534.0707511102648" stroke-dashoffset="309.7610356439536" class="transition-all duration-100 ease-linear"></circle></svg><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 font-black text-3xl">42%</div></div><h2 class="text-2xl md:text-4xl font-black italic text-cyan-400 mb-4 md:mb-8 uppercase tracking-tighter">Neural Sync Required</h2><div class="flex flex-col md:flex-row gap-2 md:gap-4 justify-center mb-4 md:mb-8"><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-red-500/10 border-red-500/30 text-red-500">Left Hand: WAITING</div><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-widest transition-colors bg-cyan-500/20 border-cyan-500 text-cyan-400">Right Hand: LOCKED</div><div class="px-4 py-2 rounded border font-bold uppercase text-[10px] tracking-[0.3em] transition-colors bg-emerald-500/20 border-emerald-400/60 text-emerald-200">Camera: ONLINE</div></div><div class="bg-black/40 border border-cyan-500/30 px-4 md:px-6 py-4 rounded-xl mx-4"><p class="text-white font-mono text-xs md:text-sm tracking-widest uppercase">We cannot see your hands. Move them into the guide box or adjust lighting.</p></div><div class="mt-6 flex flex-col md:flex-row justify-center gap-3 md:gap-4 items-center"></div><div class="mt-6 flex flex-col gap-3 items-center pointer-events-auto"><button class="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded shadow-lg transition">Start without hand tracking</button><p class="text-[11px] text-white/60 uppercase tracking-[0.2em]">Mouse + keyboard controls will be enabled.</p></div><div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] md:w-[40%] h-[40%] border-2 border-cyan-500/30 rounded-lg animate-pulse"></div></div></div>"`);
  });

  it('shows actionable messaging when no device is detected', () => {
    const message = 'No camera detected. Plug in a webcam or enable it in system settings, then press Re-request to scan again.';
    const markup = renderPhase('CALIBRATING', {
      calibrationStatus: { stalled: false, cameraReady: false, message },
    });

    expect(markup).toContain(message);
  });

  it('shows actionable messaging when permission is denied', () => {
    const message = 'Camera permission denied. Allow access in your browser and OS privacy settings, then hit Re-request.';
    const markup = renderPhase('CALIBRATING', {
      calibrationStatus: { stalled: false, cameraReady: false, message },
    });

    expect(markup).toContain(message);
  });

  it('shows actionable messaging when a device is lost mid-session', () => {
    const message = 'Camera disconnected during capture. Reseat the cable or select another device, then Retry.';
    const markup = renderPhase('CALIBRATING', {
      calibrationStatus: { stalled: false, cameraReady: false, message },
    });

    expect(markup).toContain(message);
  });

  it('renders a re-request control when camera is offline and handler is provided', () => {
    const markup = renderPhase('CALIBRATING', {
      calibrationStatus: { stalled: false, cameraReady: false },
      onRetryCamera: () => {},
    });

    expect(markup).toContain('Re-request camera access');
  });

  it('renders ready overlay with hud', () => {
    const markup = renderPhase('READY');
    expect(markup).toMatchInlineSnapshot(`"<div class="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center w-56 md:w-64 pointer-events-none z-30 transition-all"><div class="w-full h-2 md:h-2 bg-gray-900/80 border border-cyan-500/30 rounded-full overflow-hidden transition-colors duration-300"><div class="h-full transition-all duration-100 ease-linear bg-gradient-to-r from-cyan-500 via-cyan-300 to-red-500" style="width:15%"></div></div><div class="flex justify-between w-full mt-1 px-1 mb-2 md:mb-3"><span class="text-[9px] uppercase font-bold tracking-widest text-cyan-600">Thermal Load</span></div><div class="w-full h-1.5 md:h-1.5 bg-gray-900/80 border border-orange-500/30 rounded-full overflow-hidden"><div class="h-full transition-all duration-100 ease-linear bg-orange-800/60" style="width:50%"></div></div><div class="flex justify-between w-full mt-1 px-1"><span class="text-[9px] uppercase font-bold tracking-widest text-orange-600">Proximity Missile</span><span class="text-[9px] uppercase font-bold text-orange-900 tracking-widest">CHARGING</span></div></div><div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-40"><h1 class="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 uppercase tracking-[0.2em] drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]">Ready</h1><p class="mt-2 md:mt-4 text-sm md:text-lg text-cyan-400 font-bold uppercase tracking-widest animate-bounce">Shoot Target to Start</p></div>"`);
  });

  it('renders playing overlay hud state', () => {
    const markup = renderPhase('PLAYING');
    expect(markup).toMatchInlineSnapshot(`"<div class="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center w-56 md:w-64 pointer-events-none z-30 transition-all"><div class="w-full h-2 md:h-2 bg-gray-900/80 border border-cyan-500/30 rounded-full overflow-hidden transition-colors duration-300"><div class="h-full transition-all duration-100 ease-linear bg-gradient-to-r from-cyan-500 via-cyan-300 to-red-500" style="width:15%"></div></div><div class="flex justify-between w-full mt-1 px-1 mb-2 md:mb-3"><span class="text-[9px] uppercase font-bold tracking-widest text-cyan-600">Thermal Load</span></div><div class="w-full h-1.5 md:h-1.5 bg-gray-900/80 border border-orange-500/30 rounded-full overflow-hidden"><div class="h-full transition-all duration-100 ease-linear bg-orange-800/60" style="width:50%"></div></div><div class="flex justify-between w-full mt-1 px-1"><span class="text-[9px] uppercase font-bold tracking-widest text-orange-600">Proximity Missile</span><span class="text-[9px] uppercase font-bold text-orange-900 tracking-widest">CHARGING</span></div></div>"`);
  });

  it('renders pause overlay panel', () => {
    const markup = renderPhase('PAUSED');
    expect(markup).toMatchInlineSnapshot(`"<div class="absolute inset-0 z-50 pointer-events-none overflow-hidden"><div class="absolute top-16 md:top-24 left-0 w-full text-center space-y-2"><h2 class="text-5xl md:text-8xl font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">Paused</h2><div class="w-64 h-1 bg-cyan-500 mx-auto rounded-full shadow-[0_0_15px_#06b6d4]"></div><p class="text-cyan-400 font-mono text-sm tracking-widest uppercase">System Halted</p></div><div class="absolute top-[54%] left-0 w-full h-0"><div class="absolute left-[15%] -translate-x-1/2 flex flex-col items-center w-24 md:w-32 group"><div class="h-6 md:h-10 w-0.5 bg-gradient-to-b from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 mb-2"></div><div class="bg-yellow-900/30 border border-yellow-500/30 p-2 rounded w-full text-center backdrop-blur-md shadow-[0_0_10px_rgba(234,179,8,0.1)]"><span class="text-yellow-500 font-bold uppercase tracking-widest text-[10px] md:text-xs block">Reset</span><span class="text-yellow-700 font-bold uppercase text-[8px] tracking-wider block">Simulation</span></div></div><div class="absolute left-[38%] -translate-x-1/2 flex flex-col items-center w-24 md:w-32 group"><div class="h-6 md:h-10 w-0.5 bg-gradient-to-b from-purple-500/0 via-purple-500/50 to-purple-500/0 mb-2"></div><div class="bg-purple-900/30 border border-purple-500/30 p-2 rounded w-full text-center backdrop-blur-md shadow-[0_0_10px_rgba(168,85,247,0.1)]"><span class="text-purple-400 font-bold uppercase tracking-widest text-[10px] md:text-xs block">Recalibrate</span><span class="text-purple-600 font-bold uppercase text-[8px] tracking-wider block">Sensors</span></div></div><div class="absolute left-[62%] -translate-x-1/2 flex flex-col items-center w-24 md:w-32 group"><div class="h-6 md:h-10 w-0.5 bg-gradient-to-b from-blue-500/0 via-blue-500/50 to-blue-500/0 mb-2"></div><div class="bg-blue-900/30 border border-blue-500/30 p-2 rounded w-full text-center backdrop-blur-md shadow-[0_0_10px_rgba(59,130,246,0.1)]"><span class="text-blue-400 font-bold uppercase tracking-widest text-[10px] md:text-xs block">Database</span><span class="text-blue-600 font-bold uppercase text-[8px] tracking-wider block">Intel</span></div></div><div class="absolute left-[85%] -translate-x-1/2 flex flex-col items-center w-28 md:w-40 group"><div class="h-6 md:h-10 w-0.5 bg-gradient-to-b from-green-500/0 via-green-500/50 to-green-500/0 mb-2"></div><div class="bg-green-900/40 border border-green-500/80 p-3 rounded w-full text-center backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.2)]"><span class="text-green-400 font-black uppercase tracking-widest text-xs md:text-sm block">Resume</span><span class="text-green-600 font-bold uppercase text-[8px] tracking-wider block">Mission</span></div></div></div></div>"`);
  });

  it('renders help overlay page', () => {
    const markup = renderPhase('HELP', { helpState: { page: 1, enemyIndex: 0 } });
    expect(markup).toMatchInlineSnapshot(`"<div class="absolute inset-0 z-40 flex pointer-events-none"><div class="w-full h-full p-4 md:p-12 relative"><div class="absolute top-8 left-8"><h2 class="text-4xl font-black text-cyan-500 uppercase tracking-widest mb-1">Database</h2><div class="h-1 w-24 bg-cyan-500"></div></div><div class="absolute bottom-[25%] left-8 md:left-12 max-w-md bg-black/80 p-6 border-l-4 border-cyan-500"><h3 class="text-3xl text-white font-black uppercase tracking-widest mb-2">Standard</h3><p class="text-cyan-400 text-xs font-bold mb-4">HP: Low | SPD: Avg</p><p class="text-cyan-100/80 text-sm leading-relaxed">Common drone. Spinning kinetic rim.</p></div><div class="absolute top-1/2 right-12 md:right-24 -translate-y-1/2 flex items-center animate-pulse"><span class="text-cyan-400 font-black uppercase tracking-widest text-xl mr-4">MANUAL &gt;</span><div class="w-16 h-0.5 bg-cyan-500"></div></div><div class="absolute top-1/2 left-12 md:left-24 -translate-y-1/2 flex items-center animate-pulse"><div class="w-16 h-0.5 bg-purple-500"></div><span class="text-purple-400 font-black uppercase tracking-widest text-xl ml-4">&lt; CYCLE</span></div><div class="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-pulse"><span class="text-orange-500 font-black uppercase tracking-widest text-xl mb-2">EXIT</span><div class="w-0.5 h-16 bg-orange-500"></div></div></div></div>"`);
  });

  it('renders game over overlay with score', () => {
    const markup = renderPhase('GAMEOVER', { score: 9876 });
    expect(markup).toMatchInlineSnapshot(`"<div class="absolute inset-0 bg-red-900/20 backdrop-blur-md z-50 flex items-center justify-center pointer-events-none"><div class="text-center"><h2 class="text-5xl md:text-8xl font-black text-red-500 uppercase tracking-tighter mb-2 md:mb-4 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">Critical Failure</h2><div class="bg-black/80 border border-red-500/50 p-4 md:p-8 rounded-lg mb-6 md:mb-8 inline-block shadow-2xl"><p class="text-red-400 text-xs md:text-sm uppercase tracking-widest mb-1 md:mb-2">Final Score</p><p class="text-4xl md:text-6xl font-mono text-white tabular-nums font-bold">9,876</p></div><p class="text-white/80 uppercase tracking-widest font-bold animate-pulse text-xs md:text-sm">Shoot <span class="text-red-500 font-black">Red Target</span> to Reboot</p></div></div>"`);
  });
});
