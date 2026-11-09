import type { Status } from '@astro/engine';

let ctx: AudioContext | null = null;
let enabled = false;

/** Must be called from a user gesture: browsers block audio and speech until then. */
export function enableAudio(): boolean {
  try {
    ctx = ctx ?? new AudioContext();
    void ctx.resume();
    window.speechSynthesis?.cancel();
    enabled = true;
  } catch {
    enabled = false;
  }
  return enabled;
}

export const audioEnabled = () => enabled;

/** Short synth tone: two pulses for WARNING, three lower ones for CRITICAL. */
export function beep(severity: Status): void {
  if (!enabled || !ctx) return;
  const pulses = severity === 'CRITICAL' ? 3 : 2;
  const freq = severity === 'CRITICAL' ? 520 : 760;
  for (let i = 0; i < pulses; i++) {
    const start = ctx.currentTime + i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  }
}

export function speak(text: string): void {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
