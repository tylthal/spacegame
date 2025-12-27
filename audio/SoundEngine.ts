/**
 * SoundEngine - Web Audio API wrapper for synthesized game sounds
 * 
 * Uses procedural audio generation for retro-style sound effects.
 * No external audio files required - all sounds are generated in real-time.
 */

import { getAudioContext, resumeAudioContext } from './AudioContext';

export type SoundType =
    | 'menuHover'
    | 'buttonPress'
    | 'laser'
    | 'explosion'
    | 'missileLaunch'
    | 'missileDetonate'
    | 'playerHit'
    | 'shieldHit'
    | 'calibrationTick'
    | 'calibrationSuccess'
    // Phase 1: Essential Polish
    | 'gameOver'
    | 'tierWarning'
    | 'shieldBreak'
    | 'scorePickup'
    // Phase 2: Weapons
    | 'overheat'
    | 'heatWarning'
    | 'weaponReady'
    | 'missileBeep'
    // Phase 3: Enemies
    | 'weaverSpawn'
    | 'shieldedSpawn'
    | 'bomberSpawn'
    | 'enemyFire'
    | 'bomberProjectileHit'
    | 'explosionSmall'
    | 'explosionLarge'
    | 'shockwave';

class SoundEngineClass {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private _muted = false;
    private _volume = 0.5;
    private _initialized = false;

    // Atmosphere state
    private ambienceOsc: OscillatorNode | null = null;
    private ambienceLFO: OscillatorNode | null = null;
    private ambienceGain: GainNode | null = null;
    private alarmTimer: any | null = null;

    /** Check if audio is initialized and ready */
    get isInitialized(): boolean {
        return this._initialized && this.audioContext !== null && this.audioContext.state === 'running';
    }

    /** 
     * Initialize the audio context (must be called after user interaction)
     * Returns true if successfully initialized, false otherwise
     */
    init(): boolean {
        if (this._initialized && this.audioContext?.state === 'running') return true;

        try {
            if (!this.audioContext) {
                this.audioContext = getAudioContext();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = this._volume;
                this.masterGain.connect(this.audioContext.destination);
            }

            // Try to resume if suspended
            if (this.audioContext.state === 'suspended') {
                resumeAudioContext().then(() => {
                    this._initialized = true;
                }).catch(() => {
                    // Will retry on next user interaction
                });
            } else {
                this._initialized = true;
            }

            return this._initialized;
        } catch (e) {
            console.warn('[SoundEngine] Failed to initialize AudioContext:', e);
            return false;
        }
    }

    /**
     * Try to initialize on user interaction - call this from click/touch handlers
     * This is safe to call repeatedly
     */
    tryInit(): void {
        if (!this._initialized) {
            this.init();
        }
    }

    /** Ensure context is running (only resumes if already created) */
    private ensureRunning(): boolean {
        if (!this.audioContext || !this.masterGain) return false;

        if (this.audioContext.state === 'suspended') {
            resumeAudioContext();
        }

        return this.audioContext.state === 'running';
    }

    /** Play a sound effect */
    play(type: SoundType): void {
        if (this._muted) return;
        if (!this.ensureRunning()) return;
        if (!this.audioContext || !this.masterGain) return;

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        switch (type) {
            case 'menuHover':
                this.playMenuHover(ctx, now);
                break;
            case 'buttonPress':
                this.playButtonPress(ctx, now);
                break;
            case 'laser':
                this.playLaser(ctx, now);
                break;
            case 'explosion':
                this.playExplosion(ctx, now);
                break;
            case 'missileLaunch':
                this.playMissileLaunch(ctx, now);
                break;
            case 'missileDetonate':
                this.playMissileDetonate(ctx, now);
                break;
            case 'playerHit':
                this.playPlayerHit(ctx, now);
                break;
            case 'shieldHit':
                this.playShieldHit(ctx, now);
                break;
            case 'calibrationTick':
                this.playCalibrationTick(ctx, now);
                break;
            case 'calibrationSuccess':
                this.playCalibrationSuccess(ctx, now);
                break;
            // Phase 1: Essential Polish
            case 'gameOver':
                this.playGameOver(ctx, now);
                break;
            case 'tierWarning':
                this.playTierWarning(ctx, now);
                break;
            case 'shieldBreak':
                this.playShieldBreak(ctx, now);
                break;
            case 'scorePickup':
                this.playScorePickup(ctx, now);
                break;
            // Phase 2: Weapons
            case 'overheat':
                this.playOverheat(ctx, now);
                break;
            case 'heatWarning':
                this.playHeatWarning(ctx, now);
                break;
            case 'weaponReady':
                this.playWeaponReady(ctx, now);
                break;
            case 'missileBeep':
                this.playMissileBeep(ctx, now);
                break;
            // Phase 3: Enemies
            case 'weaverSpawn':
                this.playWeaverSpawn(ctx, now);
                break;
            case 'shieldedSpawn':
                this.playShieldedSpawn(ctx, now);
                break;
            case 'bomberSpawn':
                this.playBomberSpawn(ctx, now);
                break;
            case 'enemyFire':
                this.playEnemyFire(ctx, now);
                break;
            case 'bomberProjectileHit':
                this.playBomberProjectileHit(ctx, now);
                break;
            case 'explosionSmall':
                this.playExplosionSmall(ctx, now);
                break;
            case 'explosionLarge':
                this.playExplosionLarge(ctx, now);
                break;
            case 'shockwave':
                this.playShockwave(ctx, now);
                break;
        }
    }

    /** Soft, high-pitched blip for menu hover */
    private playMenuHover(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 800;

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /** Satisfying dual-tone beep for button press */
    private playButtonPress(ctx: AudioContext, now: number): void {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'square';
        osc1.frequency.value = 600;
        osc2.type = 'square';
        osc2.frequency.value = 800;

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain!);

        osc1.start(now);
        osc2.start(now + 0.03);
        osc1.stop(now + 0.1);
        osc2.stop(now + 0.1);
    }

    /** Quick "pew" sound for laser fire - Enhanced */
    private playLaser(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth'; // Punchier than sine/triangle
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15); // Faster drop

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now); // Slightly louder
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Add a high-pass filter for "zap" quality
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    /** Retro explosion burst */
    private playExplosion(ctx: AudioContext, now: number): void {
        // Noise burst
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.75, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        // Low rumble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.65, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.connect(noiseGain);
        osc.connect(oscGain);
        noiseGain.connect(this.masterGain!);
        oscGain.connect(this.masterGain!);

        noise.start(now);
        osc.start(now);
        noise.stop(now + 0.2);
        osc.stop(now + 0.2);
    }

    /** Small, quick explosion */
    private playExplosionSmall(ctx: AudioContext, now: number): void {
        // Noise burst
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        // Low rumble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(noiseGain);
        osc.connect(oscGain);
        noiseGain.connect(this.masterGain!);
        oscGain.connect(this.masterGain!);

        noise.start(now);
        osc.start(now);
        noise.stop(now + 0.15);
        osc.stop(now + 0.15);
    }

    /** Large, sustained explosion */
    private playExplosionLarge(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.6);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 0.6);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.6);
        noise.start(now);
        noise.stop(now + 0.6);
    }

    /** Deep Boom + Sweep for Shockwave */
    private playShockwave(ctx: AudioContext, now: number): void {
        // Deep sub-bass boom
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 1.0);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        // White noise sweep
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.linearRampToValueAtTime(2000, now + 0.5); // Sweep up
        filter.frequency.exponentialRampToValueAtTime(100, now + 1.5); // Then fade down

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0, now);
        noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.2);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 1.5);
        noise.start(now);
        noise.stop(now + 1.5);
    }

    /** Deep rocket launch with bass rumble and filtered noise */
    private playMissileLaunch(ctx: AudioContext, now: number): void {
        // Deep bass rumble (the core rocket sound)
        const bassOsc = ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(40, now);
        bassOsc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
        bassOsc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.55, now);
        bassGain.gain.linearRampToValueAtTime(0.6, now + 0.15);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        // Low-pass filter to make it rumbly
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 120;
        bassFilter.Q.value = 2;

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.masterGain!);

        // Noise layer for rocket exhaust hiss
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(200, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        noiseFilter.Q.value = 1;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain!);

        // Sub-bass thump for initial ignition
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(50, now);
        subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.15);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.6, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain!);

        bassOsc.start(now);
        noise.start(now);
        subOsc.start(now);
        bassOsc.stop(now + 0.5);
        noise.stop(now + 0.5);
        subOsc.stop(now + 0.15);
    }

    /** Big boom for missile detonation */
    private playMissileDetonate(ctx: AudioContext, now: number): void {
        // Heavy noise burst
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.75, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        // Deep bass rumble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        osc.connect(oscGain);
        noiseGain.connect(this.masterGain!);
        oscGain.connect(this.masterGain!);

        noise.start(now);
        osc.start(now);
        noise.stop(now + 0.4);
        osc.stop(now + 0.4);
    }

    /** Warning buzz for player damage */
    private playPlayerHit(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    /** Metallic ping for shield impact */
    private playShieldHit(ctx: AudioContext, now: number): void {
        // High-pitched metallic ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /** Short ascending blip for calibration progress */
    private playCalibrationTick(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.08);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /** Triumphant success arpeggio for calibration complete */
    private playCalibrationSuccess(ctx: AudioContext, now: number): void {
        // Play a quick ascending arpeggio C-E-G-C
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const spacing = 0.08;

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.value = freq;

            const startTime = now + i * spacing;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    /** Dramatic defeat stinger - descending minor chord with distortion */
    private playGameOver(ctx: AudioContext, now: number): void {
        // Descending doom chord
        const notes = [440, 349.23, 293.66, 220]; // A4, F4, D4, A3 (Am chord descent)

        notes.forEach((freq, i) => {
            const startTime = now + i * 0.15;

            // Main tone
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.4);

            // Distortion via waveshaper
            const shaper = ctx.createWaveShaper();
            const curve = new Float32Array(256);
            for (let j = 0; j < 256; j++) {
                const x = (j / 128) - 1;
                curve[j] = Math.tanh(x * 3);
            }
            shaper.curve = curve;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.3 - i * 0.05, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

            osc.connect(shaper);
            shaper.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });

        // Low rumble underneath
        const rumble = ctx.createOscillator();
        rumble.type = 'sine';
        rumble.frequency.setValueAtTime(55, now);
        rumble.frequency.exponentialRampToValueAtTime(30, now + 0.8);

        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.4, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1);

        rumble.connect(rumbleGain);
        rumbleGain.connect(this.masterGain!);

        rumble.start(now);
        rumble.stop(now + 1.2);
    }

    /** Alert alarm for tier transitions - rising emergency siren */
    private playTierWarning(ctx: AudioContext, now: number): void {
        // Two-tone siren
        for (let i = 0; i < 2; i++) {
            const startTime = now + i * 0.25;

            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, startTime);
            osc.frequency.linearRampToValueAtTime(900, startTime + 0.12);
            osc.frequency.linearRampToValueAtTime(600, startTime + 0.25);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.05, startTime);
            gain.gain.setValueAtTime(0.05, startTime + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        }
    }

    /** Shield overload crackle - electrical discharge */
    private playShieldBreak(ctx: AudioContext, now: number): void {
        // Noise burst for crackle
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // Crackling noise with decay
            const decay = 1 - (i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * decay * decay;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass filter for electrical sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.3);
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        noise.start(now);

        // Descending zap
        const zap = ctx.createOscillator();
        zap.type = 'sawtooth';
        zap.frequency.setValueAtTime(1200, now);
        zap.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        const zapGain = ctx.createGain();
        zapGain.gain.setValueAtTime(0.2, now);
        zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        zap.connect(zapGain);
        zapGain.connect(this.masterGain!);

        zap.start(now);
        zap.stop(now + 0.25);
    }

    /** Satisfying point collection chime - bright ascending */
    private playScorePickup(ctx: AudioContext, now: number): void {
        // Quick 3-note ascending arpeggio
        const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 (A major)

        notes.forEach((freq, i) => {
            const startTime = now + i * 0.05;

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Add subtle shimmer
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = freq * 1.005; // Slight detune for shimmer

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + 0.2);
            osc2.start(startTime);
            osc2.stop(startTime + 0.2);
        });
    }

    /** Overheat sizzle - intense warning */
    private playOverheat(ctx: AudioContext, now: number): void {
        // Harsh buzzing alarm
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);

        // Add tremolo for intensity
        const tremolo = ctx.createOscillator();
        tremolo.frequency.value = 20;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.3;

        tremolo.connect(tremoloGain);
        tremoloGain.connect(osc.frequency);

        // Filter sweep
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(200, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.6);
        tremolo.start(now);
        tremolo.stop(now + 0.6);
    }

    /** Heat warning beep at threshold */
    private playHeatWarning(ctx: AudioContext, now: number): void {
        // Quick double beep
        for (let i = 0; i < 2; i++) {
            const startTime = now + i * 0.1;

            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 440;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + 0.08);
        }
    }

    /** Weapon ready ping - cool-down complete */
    private playWeaponReady(ctx: AudioContext, now: number): void {
        // Pleasant high ping
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1046.50; // C6

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /** Missile target lock / tracking beep */
    private playMissileBeep(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    /** Eerie warble for Weaver spawn */
    private playWeaverSpawn(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        osc.frequency.linearRampToValueAtTime(300, now + 1.0);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.5);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 1.0);
    }

    /** Heavy hum for Shielded Drone spawn */
    private playShieldedSpawn(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.5);
    }

    /** Ominous deep drone for Bomber spawn */
    private playBomberSpawn(ctx: AudioContext, now: number): void {
        // Deep rumbling bass
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;

        // Add subtle tremolo
        const tremolo = ctx.createOscillator();
        tremolo.frequency.value = 8;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.1;
        tremolo.connect(tremoloGain);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        tremoloGain.connect(gain.gain);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.6);
        tremolo.start(now);
        tremolo.stop(now + 0.6);
    }

    /** Distinctive enemy weapon fire - different from player laser */
    private playEnemyFire(ctx: AudioContext, now: number): void {
        // Low-pitched aggressive zap (inverse of player laser)
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Notch filter for alien sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    /** Heavy explosion for bomber projectile impact */
    private playBomberProjectileHit(ctx: AudioContext, now: number): void {
        // 1. Low frequency boom (Impact)
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(40, now + 0.3);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.8, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc1.connect(gain1);
        gain1.connect(this.masterGain!);

        osc1.start(now);
        osc1.stop(now + 0.4);

        // 2. Crackle/Lightning noise (The "Electrical" part)
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 800;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain!);

        noise.start(now);
    }

    /** Set master volume (0-1) */
    setVolume(volume: number): void {
        this._volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this._volume;
        }
    }

    /** Get current volume */
    get volume(): number {
        return this._volume;
    }

    /** Mute/unmute all sounds */
    setMuted(muted: boolean): void {
        this._muted = muted;
        if (this.masterGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.setValueAtTime(muted ? 0 : this._volume, now);
        }

        // Handle ambience mute separately if needed, but masterGain handles it all
    }

    /** Check if muted */
    get muted(): boolean {
        return this._muted;
    }

    /** Toggle mute state */
    toggleMute(): boolean {
        this.setMuted(!this._muted);
        return this._muted;
    }

    // ===== ATMOSPHERE CONTROLS =====

    /** Start persistent background space drone */
    startAmbience(): void {
        if (this.ambienceOsc || !this.ensureRunning()) return;
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        // Deep drone
        this.ambienceOsc = ctx.createOscillator();
        this.ambienceOsc.type = 'sine';
        this.ambienceOsc.frequency.value = 60; // B1

        // Modulation for "movement"
        this.ambienceLFO = ctx.createOscillator();
        this.ambienceLFO.type = 'sine';
        this.ambienceLFO.frequency.value = 0.1; // Slow breathing

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 5; // Modulate pitch slightly

        this.ambienceGain = ctx.createGain();
        this.ambienceGain.gain.value = 0; // Start silent
        this.ambienceGain.gain.linearRampToValueAtTime(0.05, now + 2.0); // Slow fade in

        // Connections
        this.ambienceLFO.connect(lfoGain);
        lfoGain.connect(this.ambienceOsc.frequency);

        this.ambienceOsc.connect(this.ambienceGain);
        this.ambienceGain.connect(this.masterGain!);

        this.ambienceLFO.start(now);
        this.ambienceOsc.start(now);
    }

    /** Stop ambient drone */
    stopAmbience(): void {
        if (this.ambienceOsc) {
            const now = this.audioContext?.currentTime || 0;
            if (this.ambienceGain) {
                this.ambienceGain.gain.cancelScheduledValues(now);
                this.ambienceGain.gain.linearRampToValueAtTime(0, now + 2.0);
            }

            const osc = this.ambienceOsc;
            const lfo = this.ambienceLFO;
            const gain = this.ambienceGain;

            setTimeout(() => {
                try {
                    osc.stop();
                    lfo?.stop();
                    osc.disconnect();
                    lfo?.disconnect();
                    gain?.disconnect();
                } catch (e) { }
            }, 2100);

            this.ambienceOsc = null;
            this.ambienceLFO = null;
            this.ambienceGain = null;
        }
    }

    /** Start low hull alarm loop */
    startLowHullAlarm(): void {
        if (this.alarmTimer) return;

        const playBeep = () => {
            if (!this.audioContext || this._muted) return;
            const now = this.audioContext.currentTime;

            const osc = this.audioContext.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.linearRampToValueAtTime(440, now + 0.3);

            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(now);
            osc.stop(now + 0.3);
        };

        playBeep();
        this.alarmTimer = setInterval(playBeep, 1000);
    }

    /** Stop low hull alarm */
    stopLowHullAlarm(): void {
        if (this.alarmTimer) {
            clearInterval(this.alarmTimer);
            this.alarmTimer = null;
        }
    }
}

// Singleton instance
export const SoundEngine = new SoundEngineClass();
