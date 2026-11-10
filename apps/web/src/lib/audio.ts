import type { Status } from '@astro/engine';
import { useMissionStore, type Locale } from './store/missionStore';

let ctx: AudioContext | null = null;
let enabled = false;
let voices: SpeechSynthesisVoice[] = [];

function loadVoices(): void {
  try {
    voices = window.speechSynthesis?.getVoices() ?? [];
  } catch {
    voices = [];
  }
}

/** Must be called from a user gesture: browsers block audio and speech until then. */
export function enableAudio(): boolean {
  try {
    ctx = ctx ?? new AudioContext();
    void ctx.resume();
    window.speechSynthesis?.cancel();
    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    enabled = true;
  } catch {
    enabled = false;
  }
  return enabled;
}

export const audioEnabled = () => enabled;
const soundOn = () => enabled && useMissionStore.getState().soundOn;

/** Short synth tone: two pulses for WARNING, three lower ones for CRITICAL. */
export function beep(severity: Status): void {
  if (!soundOn() || !ctx) return;
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

const LANG: Record<Locale, string> = { en: 'en', ru: 'ru', uz: 'ru' }; // browsers rarely ship an Uzbek voice

/** Best installed voice for the language, preferring local (offline) voices. */
export function pickVoice(locale: Locale): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices();
  const prefix = LANG[locale];
  const match = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  return match.find((v) => v.localService) ?? match[0];
}

interface Queued {
  text: string;
  priority: number;
  locale: Locale;
}
let queue: Queued[] = [];
let speakingPriority = -1;

function next(): void {
  const item = queue.shift();
  if (!item) {
    speakingPriority = -1;
    return;
  }
  const u = new SpeechSynthesisUtterance(item.text);
  const voice = pickVoice(item.locale);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? (item.locale === 'en' ? 'en-US' : 'ru-RU');
  u.rate = 0.95;
  u.onend = u.onerror = () => next();
  speakingPriority = item.priority;
  window.speechSynthesis.speak(u);
}

/**
 * Speak in the interface language. An emergency (priority 2) interrupts a lower-priority message;
 * a lower-priority message waits instead of cutting an emergency short. The queue is short on purpose.
 */
export function speak(text: string, opts: { locale: Locale; priority?: number } = { locale: 'en' }): void {
  if (!soundOn() || typeof window === 'undefined' || !window.speechSynthesis) return;
  const priority = opts.priority ?? 1;
  const item: Queued = { text, priority, locale: opts.locale };
  const busy = window.speechSynthesis.speaking || window.speechSynthesis.pending;
  if (busy && priority > speakingPriority) {
    queue = [item];
    window.speechSynthesis.cancel(); // fires onend/onerror, which starts the queue
    return;
  }
  queue = [...queue, item].slice(-3);
  if (!busy) next();
}
