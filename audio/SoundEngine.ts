/**
 * SoundEngine - Web Audio API wrapper for synthesized game sounds
 * 
 * Uses procedural audio generation for retro-style sound effects.
 * No external audio files required - all sounds are generated in real-time.
 */

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
    | 'calibrationSuccess';

class SoundEngineClass {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private _muted = false;
    private _volume = 0.5;
    private _initialized = false;

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
                this.audioContext = new AudioContext();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = this._volume;
                this.masterGain.connect(this.audioContext.destination);
            }

            // Try to resume if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
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
            this.audioContext.resume();
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

    /** Quick "pew" sound for laser fire */
    private playLaser(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.08);
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
    }

    /** Check if muted */
    get muted(): boolean {
        return this._muted;
    }

    /** Toggle mute state */
    toggleMute(): boolean {
        this._muted = !this._muted;
        return this._muted;
    }
}

// Singleton instance
export const SoundEngine = new SoundEngineClass();
