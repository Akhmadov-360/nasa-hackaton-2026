import type { Incident, MissionReport } from '@astro/engine';
import { crewName } from './engineConfig';
import { metricName, statusWord, translate, type DictKey } from './i18n';
import { formatDuration } from './duration';
import { formatValue } from './logText';
import { formatMet, STATUS_RANK } from './metrics';
import { getProtocol } from './protocols';
import type { Locale } from './store/missionStore';

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const incidentTitle = (inc: Incident, locale: Locale) => getProtocol(inc.protocol, locale).title;

export const causeText = (inc: Incident, locale: Locale): string => {
  const c = inc.causes[0];
  return c ? translate(locale, `report.cause.${c.type}` as DictKey, { t: formatMet(c.t) }) : translate(locale, 'report.inc.noCause');
};

export const peakText = (inc: Incident): string => {
  const ep = inc.episodes.find((e) => e.metric === inc.primaryMetric) ?? inc.episodes[0];
  return ep ? formatValue(ep.metric, ep.peak, ep.unit) : '';
};

export function allIncidents(report: MissionReport, crewIds?: string[]): Incident[] {
  return report.crew
    .filter((c) => !crewIds || crewIds.includes(c.crewId))
    .flatMap((c) => c.incidents)
    .sort((a, b) => a.startT - b.startT);
}

export function mostSerious(incidents: Incident[]): Incident | undefined {
  return [...incidents].sort((a, b) => STATUS_RANK[b.worst] - STATUS_RANK[a.worst] || a.startT - b.startT)[0];
}

/** One-sentence summary of the period. */
export function headline(report: MissionReport, locale: Locale, crewIds?: string[]): string {
  const incidents = allIncidents(report, crewIds);
  if (!incidents.length) return translate(locale, 'report.headline.none');
  const worst = mostSerious(incidents)!;
  const crew = report.crew.filter((c) => !crewIds || crewIds.includes(c.crewId));
  return translate(locale, 'report.headline.some', {
    n: incidents.length,
    c: crew.filter((c) => c.incidents.length).length,
    total: crew.length,
    crew: crewName(worst.crewId),
    title: incidentTitle(worst, locale).toLowerCase(),
    state: statusWord(worst.worst, locale).toLowerCase(),
  });
}

/** The whole report as plain text, for the clipboard and for pasting into a radio message. */
export function reportPlainText(report: MissionReport, locale: Locale, crewIds?: string[]): string {
  const t = (key: DictKey, params?: Record<string, string | number>) => translate(locale, key, params);
  const lines: string[] = [
    t('report.title'),
    t('report.range', { from: formatMet(report.fromT), to: formatMet(report.toT) }),
    '',
    headline(report, locale, crewIds),
    '',
  ];
  let radTotal = 0;
  let radPeak = 0;
  for (const c of report.crew.filter((x) => !crewIds || crewIds.includes(x.crewId))) {
    radTotal += c.radiation.deltaMSv;
    radPeak = Math.max(radPeak, c.radiation.peakRateUSvH);
    if (!c.incidents.length) {
      lines.push(t('report.text.crewOk', { crew: crewName(c.crewId) }));
      continue;
    }
    const w = mostSerious(c.incidents)!;
    lines.push(t('report.text.crewLine', {
      crew: crewName(c.crewId), n: c.incidents.length, title: incidentTitle(w, locale), t: formatMet(w.startT),
      metric: sentence(metricName(w.primaryMetric, locale)), peak: peakText(w), cause: causeText(w, locale),
    }));
    for (const inc of c.incidents) {
      lines.push(`  - MET ${formatMet(inc.startT)}, ${formatDuration(inc.durationSec, locale)}: ${incidentTitle(inc, locale)} (${statusWord(inc.worst, locale)})`);
    }
  }
  const n = report.crew.filter((x) => !crewIds || crewIds.includes(x.crewId)).length || 1;
  lines.push('', t('report.text.rad', { mSv: (radTotal / n).toFixed(3), rate: Math.round(radPeak) }), '', t('report.prov.disclaimer'));
  return lines.join('\n');
}
