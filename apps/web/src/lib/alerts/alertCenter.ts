import { sileo } from 'sileo';
import type { Alert } from '@astro/engine';
import { beep, speak } from '../audio';
import { crewName } from '../engineConfig';
import { formatValue } from '../logText';
import { metricName, spokenUnit, statusWord, tr, type DictKey } from '../i18n';
import { METRICS } from '../metrics';
import { useMissionStore } from '../store/missionStore';

export interface AlertDeps {
  toast: (a: Alert) => void;
  log: (a: Alert) => void;
  speak: (text: string, priority: number) => void;
  beep: (a: Alert['severity']) => void;
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "WARNING · 92 %" in the interface language. */
export function alertValueText(a: Alert): string {
  const v = formatValue(a.metric, a.value, a.unit);
  return `${statusWord(a.severity)}${v ? ` · ${v}` : ''}`;
}

/** Spoken sentence in the interface language, with the number and unit spelled out for the voice. */
export function voiceText(a: Alert): string {
  const locale = useMissionStore.getState().locale;
  const dec = METRICS[a.metric]?.decimals ?? 1;
  const num = typeof a.value === 'number' && Number.isFinite(a.value)
    ? new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: dec }).format(a.value)
    : '';
  const unit = spokenUnit(a.unit ?? METRICS[a.metric]?.unit ?? '', locale);
  return tr('voice.alert', {
    state: tr(`voice.${a.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING'}` as DictKey),
    crew: crewName(a.crewId),
    metric: metricName(a.metric),
    value: num ? `${num} ${unit}` : '',
  }).replace(/,\s*\./, '.');
}

const defaultDeps = (log: (a: Alert) => void): AlertDeps => ({
  log,
  speak: (text, priority) => speak(text, { locale: useMissionStore.getState().locale, priority }),
  beep: (s) => beep(s),
  toast: (a) => {
    const critical = a.severity === 'CRITICAL';
    let id = '';
    const opts = {
      title: `${crewName(a.crewId)} · ${sentence(metricName(a.metric))}`,
      description: alertValueText(a),
      // an emergency stays until acknowledged; a warning leaves on its own
      duration: critical ? null : 6000,
      ...(critical ? { button: { title: tr('toast.ack'), onClick: () => sileo.dismiss(id) } } : {}),
    };
    id = critical ? sileo.error(opts) : sileo.warning(opts);
  },
});

/**
 * One alert -> toast + sound + voice + flight-log entry.
 * Each channel is isolated: a blocked speaker never prevents the toast or the log.
 * CAUTION is logged only, so the operator is not flooded.
 */
export function notifyAlert(a: Alert, deps: AlertDeps | ((a: Alert) => void)): void {
  const d = typeof deps === 'function' ? defaultDeps(deps) : deps;
  try { d.log(a); } catch (e) { console.error('[alert] log failed', e); }
  if (a.severity === 'CAUTION' || a.severity === 'NOMINAL') return;
  try { d.toast(a); } catch (e) { console.error('[alert] toast failed', e); }
  try { d.beep(a.severity); } catch { /* audio unavailable */ }
  try { d.speak(voiceText(a), a.severity === 'CRITICAL' ? 2 : 1); } catch { /* speech unavailable */ }
}
