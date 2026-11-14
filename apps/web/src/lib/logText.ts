import { crewName } from './engineConfig';
import { metricName, statusWord, translate } from './i18n';
import { METRICS } from './metrics';
import type { LogEntry, Locale } from './store/missionStore';

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatValue(metric: string | undefined, value: number | undefined, unit?: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const m = metric ? METRICS[metric] : undefined;
  return `${value.toFixed(m?.decimals ?? 1)} ${unit ?? m?.unit ?? ''}`.trim();
}

/** Human text of a flight-log row in the given language (built at display time, so switching language re-translates). */
export function logText(e: LogEntry, locale: Locale): string {
  if (e.key === 'log.alert' && e.crewId && e.metric && e.severity) {
    const states = (e.trail ?? [e.severity]).map((s) => statusWord(s, locale)).join(' → ');
    const value = formatValue(e.metric, e.value, e.unit);
    return translate(locale, 'log.alert', {
      crew: crewName(e.crewId),
      metric: sentence(metricName(e.metric, locale)),
      trail: states,
      value: value ? ` · ${value}` : '',
    }).replace(' · {trail}', '');
  }
  if (e.key === 'log.cmd.measurement' && e.params?.metric) {
    const metric = String(e.params.metric);
    const crew = e.params.crewId;
    return translate(locale, 'log.cmd.measurement', {
      label: sentence(metricName(metric, locale)),
      target: crew === undefined ? '' : crewName(String(crew)),
      value: formatValue(metric, Number(e.params.value)),
    });
  }
  const crewId = e.params?.crewId;
  const target =
    crewId === undefined ? '' : crewId === 'ALL' ? translate(locale, 'deck.target.all') : crewName(String(crewId));
  return translate(locale, e.key, { ...(e.params ?? {}), target });
}
