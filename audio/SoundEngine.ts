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
    | 'playerHit';

class SoundEngineClass {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private _muted = false;
    private _volume = 0.5;

    /** Initialize the audio context (must be called after user interaction) */
    init(): void {
        if (this.audioContext) return;

        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this._volume;
        this.masterGain.connect(this.audioContext.destination);
    }

    /** Ensure context is running (browsers suspend until user interaction) */
    private ensureRunning(): void {
        if (!this.audioContext) this.init();
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /** Play a sound effect */
    play(type: SoundType): void {
        if (this._muted) return;
        this.ensureRunning();
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

        gain.gain.setValueAtTime(0.2, now);
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
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        // Low rumble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.25, now);
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

    /** Ascending whoosh for missile launch */
    private playMissileLaunch(ctx: AudioContext, now: number): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.3);
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
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        // Deep bass rumble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.35, now);
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
