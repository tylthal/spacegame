/**
 * Shared AudioContext for the entire application.
 * Ensures we only use one AudioContext to prevent browser limits and synchronization issues.
 */

let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
    if (!sharedContext) {
        // Support standard and webkit prefix (for Safari)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        sharedContext = new AudioContextClass();
    }
    return sharedContext;
}

/**
 * Resumes the shared audio context if it's suspended.
 * Should be called on user interaction (click/touch).
 */
export async function resumeAudioContext(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.warn('[AudioContext] Failed to resume:', e);
        }
    }
}
