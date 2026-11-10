import { translate } from './i18n';
import type { Locale } from './store/missionStore';

/** "4 min 30 s", "1 h 05 min": at most two units, in the interface language. */
export function formatDuration(totalSec: number, locale: Locale): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const part = (key: 'dur.h' | 'dur.m' | 'dur.s', n: number) => translate(locale, key, { n });
  if (h > 0) return m ? `${part('dur.h', h)} ${part('dur.m', m)}` : part('dur.h', h);
  if (m > 0) return sec ? `${part('dur.m', m)} ${part('dur.s', sec)}` : part('dur.m', m);
  return part('dur.s', sec);
}
