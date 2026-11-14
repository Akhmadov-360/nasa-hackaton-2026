import type { Status } from '@astro/engine';
import { translate, type DictKey } from './i18n';
import { missions, missionOf, type MissionContext, type Text } from './missionData';
import type { Locale } from './store/missionStore';

export { missions, missionOf, DEFAULT_MISSION, isMissionId, type MissionContext } from './missionData';

/** Uzbek falls back to Russian, then to English (like the voice and the guidance). */
const pick = (t: Text, locale: Locale) => t[locale] ?? (locale === 'uz' ? t.ru : undefined) ?? t.en;
export const missionLabel = (m: MissionContext, locale: Locale) => pick(m.label, locale);
export const missionPlace = (m: MissionContext, locale: Locale) => pick(m.place, locale);

const num = (v: number) => (v < 10 ? String(Math.round(v * 100) / 100) : String(Math.round(v)));

/** "0.25–0.5 s", "1.28 s", "3–22 min": seconds under two minutes, minutes above. */
export function delayText(range: [number, number], locale: Locale): string {
  const [lo, hi] = range;
  const minutes = hi >= 120;
  const unit = translate(locale, minutes ? 'mission.unit.min' : 'mission.unit.s');
  const f = (v: number) => num(minutes ? v / 60 : v);
  return `${lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`} ${unit}`;
}

export const roundTripText = (m: MissionContext, locale: Locale) => delayText([m.delaySec[0] * 2, m.delaySec[1] * 2], locale);

export function gravityText(m: MissionContext): string {
  return `${m.gravityG} g`;
}

/**
 * What asking the ground means here, for a warning or a critical reading (nothing for a caution or a normal one).
 * Near the Earth the ground answers in seconds; far away the crew acts on the checklist first.
 */
export function escalationFor(m: MissionContext, status: Status, locale: Locale): string | undefined {
  if (status !== 'WARNING' && status !== 'CRITICAL') return undefined;
  const key: DictKey = m.reply === 'live' ? 'mission.esc.live' : 'mission.esc.delayed';
  return translate(locale, key, { oneWay: delayText(m.delaySec, locale), round: roundTripText(m, locale) });
}
