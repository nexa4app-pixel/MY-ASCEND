/**
 * Web Audio API Chime & Sound Synthesizer — MY ASCEND
 * Generates pure mathematical tones without external audio file dependencies.
 */

class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a pleasant harmonic completion chime (Pomodoro / Session Finished).
   * Tone 1: 587.33 Hz (D5) -> Tone 2: 880 Hz (A5) -> Tone 3: 1174.66 Hz (D6)
   */
  public playCompletionChime(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 587.33, start: 0.0, dur: 0.8 },
        { freq: 880.0, start: 0.15, dur: 1.0 },
        { freq: 1174.66, start: 0.35, dur: 1.4 },
      ];

      const now = ctx.currentTime;

      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        // Envelope: soft attack, exponential decay
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
    } catch {
      // Ignore audio synthesis errors on headless environments
    }
  }

  /**
   * Plays a subtle, tactile pulse sound when logging an interruption.
   */
  public playInterruptionPulse(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
