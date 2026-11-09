import { sileo } from 'sileo';
import type { Alert } from '@astro/engine';
import { beep, speak } from '../audio';
import { crewIndex, crewName } from '../engineConfig';
import { METRICS, metricLabel, STATUS_WORD } from '../metrics';

export interface AlertDeps {
  toast: (a: Alert) => void;
  log: (a: Alert) => void;
  speak: (text: string) => void;
  beep: (a: Alert['severity']) => void;
}

export const voiceText = (a: Alert) =>
  `Warning: Crew Member ${crewIndex(a.crewId)} ${metricLabel(a.metric)} ${a.severity === 'CRITICAL' ? 'critical' : 'warning'}`;

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Readable value line, e.g. "WARNING · 92 %". */
export function alertValueText(a: Alert): string {
  const m = METRICS[a.metric];
  const v = typeof a.value === 'number' && Number.isFinite(a.value) ? a.value.toFixed(m?.decimals ?? 1) : '';
  return `${STATUS_WORD[a.severity]}${v ? ` · ${v} ${a.unit ?? m?.unit ?? ''}` : ''}`;
}

const defaultDeps = (log: (a: Alert) => void): AlertDeps => ({
  log,
  speak: (text) => speak(text),
  beep: (s) => beep(s),
  toast: (a) => {
    const opts = { title: `${crewName(a.crewId)} · ${sentence(metricLabel(a.metric))}`, description: alertValueText(a) };
    if (a.severity === 'CRITICAL') sileo.error(opts);
    else sileo.warning(opts);
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
  try { d.speak(voiceText(a)); } catch { /* speech unavailable */ }
}
