/**
 * MusicEngine - Procedural retro music synthesizer
 * 
 * Generates 8-bit style music using Web Audio API.
 * Features loopable title theme and battle music.
 */

type MusicTrack = 'title' | 'battle' | 'none';

interface Note {
    freq: number;    // Frequency in Hz
    duration: number; // Duration in beats
    type?: OscillatorType;
}

// Musical note frequencies (A4 = 440Hz tuning)
const NOTES: Record<string, number> = {
    // Octave 2
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    // Octave 3
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    // Octave 4
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    // Octave 5
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    // Sharp notes
    'C#3': 138.59, 'D#3': 155.56, 'F#3': 185.00, 'G#3': 207.65, 'A#3': 233.08,
    'C#4': 277.18, 'D#4': 311.13, 'F#4': 369.99, 'G#4': 415.30, 'A#4': 466.16,
    'C#5': 554.37, 'D#5': 622.25, 'F#5': 739.99, 'G#5': 830.61,
    // Rest
    REST: 0,
};

class MusicEngineClass {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private currentTrack: MusicTrack = 'none';
    private isPlaying = false;
    private scheduledNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    private loopTimeoutId: number | null = null;
    private _volume = 0.12; // Quieter background music
    private _muted = false;

    /** Initialize audio context */
    private init(): void {
        if (this.audioContext) return;
        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this._muted ? 0 : this._volume;
        this.masterGain.connect(this.audioContext.destination);
    }

    /** Ensure context is running */
    private ensureRunning(): void {
        if (!this.audioContext) this.init();
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /** Play a specific track */
    play(track: MusicTrack): void {
        if (track === this.currentTrack && this.isPlaying) return;

        this.stop();
        if (track === 'none') return;

        this.ensureRunning();
        this.currentTrack = track;
        this.isPlaying = true;

        if (track === 'title') {
            this.playTitleTheme();
        } else if (track === 'battle') {
            this.playBattleMusic();
        }
    }

    /** Stop all music */
    stop(): void {
        this.isPlaying = false;
        this.currentTrack = 'none';

        // Clear scheduled loop
        if (this.loopTimeoutId !== null) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }

        // Stop all scheduled oscillators
        this.scheduledNodes.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch { }
        });
        this.scheduledNodes = [];
    }

    /** Title theme - epic synth melody */
    private playTitleTheme(): void {
        if (!this.audioContext || !this.masterGain) return;

        const ctx = this.audioContext;
        const bpm = 120;
        const beatDuration = 60 / bpm;

        // Melody line - heroic synth theme (16 bars = 64 beats)
        const melody: Note[] = [
            // Bar 1-2: Opening fanfare
            { freq: NOTES.E4, duration: 1 }, { freq: NOTES.G4, duration: 1 },
            { freq: NOTES.A4, duration: 2 }, { freq: NOTES.B4, duration: 2 },
            { freq: NOTES.A4, duration: 1 }, { freq: NOTES.G4, duration: 1 },
            // Bar 3-4
            { freq: NOTES.E4, duration: 2 }, { freq: NOTES.D4, duration: 2 },
            { freq: NOTES.E4, duration: 4 },
            // Bar 5-6: Rising action
            { freq: NOTES.E4, duration: 1 }, { freq: NOTES.G4, duration: 1 },
            { freq: NOTES.A4, duration: 2 }, { freq: NOTES.B4, duration: 2 },
            { freq: NOTES.C5, duration: 2 },
            // Bar 7-8: Climax
            { freq: NOTES.D5, duration: 2 }, { freq: NOTES.C5, duration: 1 },
            { freq: NOTES.B4, duration: 1 }, { freq: NOTES.A4, duration: 4 },
            // Bar 9-12: Answer phrase
            { freq: NOTES.G4, duration: 2 }, { freq: NOTES.A4, duration: 2 },
            { freq: NOTES.B4, duration: 2 }, { freq: NOTES.G4, duration: 2 },
            { freq: NOTES.E4, duration: 2 }, { freq: NOTES.D4, duration: 2 },
            { freq: NOTES.E4, duration: 4 },
            // Bar 13-16: Bridge back to loop
            { freq: NOTES.A4, duration: 2 }, { freq: NOTES.G4, duration: 2 },
            { freq: NOTES.E4, duration: 2 }, { freq: NOTES.D4, duration: 2 },
            { freq: NOTES.E4, duration: 2 }, { freq: NOTES.REST, duration: 2 },
            { freq: NOTES.REST, duration: 4 },
        ];

        // Bass line - driving pulse
        const bass: Note[] = [
            // Repeating pattern (8 beats per set, 8 sets = 64 beats)
            { freq: NOTES.E2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
            { freq: NOTES.G2, duration: 2 }, { freq: NOTES.A2, duration: 2 },
            { freq: NOTES.E2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
            { freq: NOTES.B2, duration: 2 }, { freq: NOTES.A2, duration: 2 },
            { freq: NOTES.E2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
            { freq: NOTES.G2, duration: 2 }, { freq: NOTES.A2, duration: 2 },
            { freq: NOTES.E2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
            { freq: NOTES.D2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
            // Second half
            { freq: NOTES.A2, duration: 2 }, { freq: NOTES.A2, duration: 2 },
            { freq: NOTES.G2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
            { freq: NOTES.A2, duration: 2 }, { freq: NOTES.A2, duration: 2 },
            { freq: NOTES.G2, duration: 2 }, { freq: NOTES.E2, duration: 2 },
        ];

        const now = ctx.currentTime;
        let totalDuration = 0;

        // Schedule melody
        let melodyTime = 0;
        melody.forEach(note => {
            if (note.freq > 0) {
                this.scheduleNote(ctx, note.freq, now + melodyTime, note.duration * beatDuration, 'square', 0.15);
            }
            melodyTime += note.duration * beatDuration;
        });
        totalDuration = Math.max(totalDuration, melodyTime);

        // Schedule bass
        let bassTime = 0;
        bass.forEach(note => {
            if (note.freq > 0) {
                this.scheduleNote(ctx, note.freq, now + bassTime, note.duration * beatDuration * 0.8, 'triangle', 0.2);
            }
            bassTime += note.duration * beatDuration;
        });

        // Add arpeggiated pad for atmosphere
        this.scheduleArpeggio(ctx, now, totalDuration, [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.E4], beatDuration / 2, 0.08);

        // Schedule loop
        this.loopTimeoutId = window.setTimeout(() => {
            if (this.isPlaying && this.currentTrack === 'title') {
                this.playTitleTheme();
            }
        }, totalDuration * 1000 - 100); // Slight overlap for seamless loop
    }

    /** Battle music - faster, more intense */
    private playBattleMusic(): void {
        if (!this.audioContext || !this.masterGain) return;

        const ctx = this.audioContext;
        const bpm = 140; // Faster tempo
        const beatDuration = 60 / bpm;

        // Driving melody - more aggressive
        const melody: Note[] = [
            // Bar 1-2: Intense opening
            { freq: NOTES.E4, duration: 0.5 }, { freq: NOTES.E4, duration: 0.5 },
            { freq: NOTES.G4, duration: 0.5 }, { freq: NOTES.A4, duration: 0.5 },
            { freq: NOTES.B4, duration: 1 }, { freq: NOTES.A4, duration: 1 },
            { freq: NOTES.G4, duration: 0.5 }, { freq: NOTES.E4, duration: 0.5 },
            { freq: NOTES.D4, duration: 1 }, { freq: NOTES.E4, duration: 1 },
            // Bar 3-4
            { freq: NOTES.E4, duration: 0.5 }, { freq: NOTES.E4, duration: 0.5 },
            { freq: NOTES.G4, duration: 0.5 }, { freq: NOTES.A4, duration: 0.5 },
            { freq: NOTES.B4, duration: 1 }, { freq: NOTES.C5, duration: 1 },
            { freq: NOTES.B4, duration: 0.5 }, { freq: NOTES.A4, duration: 0.5 },
            { freq: NOTES.G4, duration: 1 }, { freq: NOTES.E4, duration: 1 },
            // Bar 5-6: Variation
            { freq: NOTES.A4, duration: 0.5 }, { freq: NOTES.A4, duration: 0.5 },
            { freq: NOTES.B4, duration: 0.5 }, { freq: NOTES.C5, duration: 0.5 },
            { freq: NOTES.D5, duration: 1 }, { freq: NOTES.C5, duration: 1 },
            { freq: NOTES.B4, duration: 0.5 }, { freq: NOTES.A4, duration: 0.5 },
            { freq: NOTES.G4, duration: 2 },
            // Bar 7-8: Return phrase
            { freq: NOTES.E4, duration: 0.5 }, { freq: NOTES.G4, duration: 0.5 },
            { freq: NOTES.A4, duration: 0.5 }, { freq: NOTES.B4, duration: 0.5 },
            { freq: NOTES.A4, duration: 1 }, { freq: NOTES.G4, duration: 1 },
            { freq: NOTES.E4, duration: 2 },
        ];

        // Pulsing bass
        const bass: Note[] = [];
        const bassPattern = [NOTES.E2, NOTES.E2, NOTES.E2, NOTES.G2, NOTES.A2, NOTES.A2, NOTES.G2, NOTES.E2];
        for (let i = 0; i < 4; i++) {
            bassPattern.forEach(freq => {
                bass.push({ freq, duration: 0.5 });
            });
        }

        const now = ctx.currentTime;
        let totalDuration = 0;

        // Schedule melody with sawtooth for edgier sound
        let melodyTime = 0;
        melody.forEach(note => {
            if (note.freq > 0) {
                this.scheduleNote(ctx, note.freq, now + melodyTime, note.duration * beatDuration * 0.9, 'sawtooth', 0.12);
            }
            melodyTime += note.duration * beatDuration;
        });
        totalDuration = Math.max(totalDuration, melodyTime);

        // Schedule bass with pulse
        let bassTime = 0;
        bass.forEach(note => {
            if (note.freq > 0) {
                this.scheduleNote(ctx, note.freq, now + bassTime, note.duration * beatDuration * 0.7, 'triangle', 0.18);
            }
            bassTime += note.duration * beatDuration;
        });

        // Add rhythmic hi-hat pattern
        this.scheduleHiHat(ctx, now, totalDuration, beatDuration / 2, 0.05);

        // Schedule loop
        this.loopTimeoutId = window.setTimeout(() => {
            if (this.isPlaying && this.currentTrack === 'battle') {
                this.playBattleMusic();
            }
        }, totalDuration * 1000 - 50);
    }

    /** Schedule a single note */
    private scheduleNote(
        ctx: AudioContext,
        freq: number,
        startTime: number,
        duration: number,
        type: OscillatorType,
        volume: number
    ): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        // ADSR envelope
        const attack = 0.02;
        const decay = 0.1;
        const sustain = volume * 0.7;
        const release = Math.min(0.1, duration * 0.3);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + attack);
        gain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);
        gain.gain.setValueAtTime(sustain, startTime + duration - release);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);

        this.scheduledNodes.push(osc);
    }

    /** Schedule arpeggio pattern */
    private scheduleArpeggio(
        ctx: AudioContext,
        startTime: number,
        totalDuration: number,
        notes: number[],
        noteLength: number,
        volume: number
    ): void {
        let time = startTime;
        let noteIndex = 0;

        while (time < startTime + totalDuration) {
            this.scheduleNote(ctx, notes[noteIndex], time, noteLength * 0.8, 'sine', volume);
            noteIndex = (noteIndex + 1) % notes.length;
            time += noteLength;
        }
    }

    /** Schedule hi-hat pattern using noise */
    private scheduleHiHat(
        ctx: AudioContext,
        startTime: number,
        totalDuration: number,
        interval: number,
        volume: number
    ): void {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        let time = startTime;
        while (time < startTime + totalDuration) {
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 8000;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain!);

            noise.start(time);
            noise.stop(time + 0.05);

            this.scheduledNodes.push(noise);
            time += interval;
        }
    }

    /** Set volume */
    setVolume(volume: number): void {
        this._volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this._muted) {
            this.masterGain.gain.value = this._volume;
        }
    }

    /** Mute/unmute */
    setMuted(muted: boolean): void {
        this._muted = muted;
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : this._volume;
        }
    }

    get muted(): boolean {
        return this._muted;
    }

    get volume(): number {
        return this._volume;
    }

    /** Fade out current track */
    fadeOut(durationMs: number = 1000): Promise<void> {
        return new Promise(resolve => {
            if (!this.masterGain || !this.isPlaying) {
                resolve();
                return;
            }

            const ctx = this.audioContext!;
            const now = ctx.currentTime;
            this.masterGain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

            setTimeout(() => {
                this.stop();
                if (this.masterGain) {
                    this.masterGain.gain.value = this._muted ? 0 : this._volume;
                }
                resolve();
            }, durationMs);
        });
    }

    /** Cross-fade to new track */
    async crossFadeTo(track: MusicTrack, durationMs: number = 500): Promise<void> {
        await this.fadeOut(durationMs);
        this.play(track);
    }
}

// Singleton
export const MusicEngine = new MusicEngineClass();
