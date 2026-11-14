import { evaluateMetric, manualEntries, MANUAL, type MissionReport } from '@astro/engine';
import { formatClock } from '@/components/selfcheck/time';
import { crewName, crewSex } from './engineConfig';
import { metricName, statusWord, translate, type DictKey } from './i18n';
import { formatMet } from './metrics';
import { allIncidents, causeText, incidentTitle, peakText } from './reportText';
import type { Locale } from './store/missionStore';
import { buildXlsx, downloadBytes, XLSX_MIME, type Cell, type Sheet } from './xlsx';

const T = {
  en: {
    sheets: { summary: 'Summary', crew: 'Crew', incidents: 'Incidents', events: 'Events', limits: 'Limits and sources', selfcheck: 'Self-check' },
    summary: ['Item', 'Value'],
    s: {
      period: 'Period (MET)', incidents: 'Incidents', affected: 'Crew affected', o2: 'Lowest blood oxygen, %', radAdded: 'Radiation added in the period, mSv',
      radTotal: 'Radiation accumulated in total, mSv', earlier: 'Incidents earlier in the session', demo: 'Note',
      demoText: 'Demo report. Limits come from NASA documents, clinical references or our own choice (sheet "Limits and sources"). Protocols are illustrative.',
    },
    crew: ['Crew member', 'Sex', 'Worst status', 'Incidents', 'Lowest SpO2, %', 'Heart rate min', 'Heart rate max', 'Radiation in period, mSv', 'Accumulated total, mSv', 'Peak dose rate, µSv/h'],
    incidents: ['Crew member', 'Start (MET)', 'End (MET)', 'Duration, s', 'Worst status', 'Reading', 'Peak', 'Likely cause', 'Protocol'],
    events: ['MET', 'Event', 'Crew', 'Parameters'],
    selfcheck: ['Crew member', 'Reading', 'Value', 'Unit', 'Status', 'Date and time (local)', 'MET', 'Entered by'],
    byHand: 'Entered by hand',
    mood: ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Very good'],
    limits: ['Reading', 'Unit', 'Caution low', 'Warning low', 'Critical low', 'Caution high', 'Warning high', 'Critical high', 'Basis', 'Source'],
    tier: { nasa: 'NASA-STD-3001', derived: 'Other NASA document', clinical: 'Clinical reference', engineering: 'Our choice', provisional: 'Placeholder' },
    ev: { flare: 'Solar flare', exertion: 'Exertion', o2fault: 'Oxygen supply fault', normalize: 'Return to normal', measurement: 'Self-check entry' },
    all: 'All crew', file: 'mission-report',
  },
  ru: {
    sheets: { summary: 'Сводка', crew: 'Экипаж', incidents: 'Инциденты', events: 'События', limits: 'Пороги и источники', selfcheck: 'Самоконтроль' },
    summary: ['Показатель', 'Значение'],
    s: {
      period: 'Период (MET)', incidents: 'Инциденты', affected: 'Затронуто астронавтов', o2: 'Минимум кислорода в крови, %', radAdded: 'Набрано радиации за период, mSv',
      radTotal: 'Накоплено радиации всего, mSv', earlier: 'Инцидентов раньше в сессии', demo: 'Примечание',
      demoText: 'Демо-отчёт. Пороги взяты из документов NASA, клинической нормы или выбраны нами (лист «Пороги и источники»). Протоколы иллюстративные.',
    },
    crew: ['Астронавт', 'Пол', 'Худшее состояние', 'Инциденты', 'Мин. SpO2, %', 'Пульс мин', 'Пульс макс', 'Радиация за период, mSv', 'Накоплено всего, mSv', 'Пик мощности дозы, µSv/h'],
    incidents: ['Астронавт', 'Начало (MET)', 'Конец (MET)', 'Длительность, с', 'Худшее состояние', 'Показатель', 'Пик', 'Вероятная причина', 'Протокол'],
    events: ['MET', 'Событие', 'Экипаж', 'Параметры'],
    selfcheck: ['Астронавт', 'Показатель', 'Значение', 'Ед.', 'Состояние', 'Дата и время (местные)', 'MET', 'Кем введено'],
    byHand: 'Вручную',
    mood: ['', 'Очень плохо', 'Плохо', 'Нормально', 'Хорошо', 'Очень хорошо'],
    limits: ['Показатель', 'Ед.', 'Внимание ниже', 'Тревога ниже', 'Критично ниже', 'Внимание выше', 'Тревога выше', 'Критично выше', 'Основание', 'Источник'],
    tier: { nasa: 'NASA-STD-3001', derived: 'Другой документ NASA', clinical: 'Клиническая норма', engineering: 'Наш выбор', provisional: 'Временное значение' },
    ev: { flare: 'Вспышка на Солнце', exertion: 'Физическая нагрузка', o2fault: 'Сбой подачи O₂', normalize: 'Возврат к норме', measurement: 'Ввод самоконтроля' },
    all: 'Весь экипаж', file: 'medicinskij-otchet',
  },
} as const;

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** The report as an Excel workbook: a summary, the crew, every incident, the scenario events and the limits with their sources. */
export function buildReportSheets(report: MissionReport, locale: Locale): Sheet[] {
  const l = locale === 'en' ? T.en : T.ru;
  const incidents = allIncidents(report);
  const n = report.crew.length || 1;
  const o2 = Math.min(...report.crew.map((c) => c.stats.spo2?.min ?? Infinity));
  const summary: Cell[][] = [
    [...l.summary],
    [l.s.period, `${formatMet(report.fromT)} – ${formatMet(report.toT)}`],
    [l.s.incidents, incidents.length],
    [l.s.affected, `${report.crew.filter((c) => c.incidents.length).length} / ${report.crew.length}`],
    [l.s.o2, Number.isFinite(o2) ? Math.round(o2 * 10) / 10 : ''],
    [l.s.radAdded, r3(report.crew.reduce((a, c) => a + c.radiation.deltaMSv, 0) / n)],
    [l.s.radTotal, r3(report.crew.reduce((a, c) => a + c.radiation.endMSv, 0) / n)],
    ...(report.earlier ? [[l.s.earlier, report.earlier.incidents.length] as Cell[]] : []),
    [l.s.demo, l.s.demoText],
  ];
  const crew: Cell[][] = [
    [...l.crew],
    ...report.crew.map((c): Cell[] => [
      crewName(c.crewId), crewSex(c.crewId) ? translate(locale, `sex.${crewSex(c.crewId)}` as DictKey) : '', c.worst, c.incidents.length,
      c.stats.spo2 ? Math.round(c.stats.spo2.min * 10) / 10 : '', c.stats.hr ? Math.round(c.stats.hr.min) : '', c.stats.hr ? Math.round(c.stats.hr.max) : '',
      r3(c.radiation.deltaMSv), r3(c.radiation.endMSv), Math.round(c.radiation.peakRateUSvH),
    ]),
  ];
  const inc: Cell[][] = [
    [...l.incidents],
    ...incidents.map((i): Cell[] => [
      crewName(i.crewId), formatMet(i.startT), formatMet(i.endT), Math.round(i.durationSec), i.worst,
      metricName(i.primaryMetric, locale), peakText(i), causeText(i, locale), incidentTitle(i, locale),
    ]),
  ];
  const events: Cell[][] = [
    [...l.events],
    ...report.events.filter((e) => e.type !== 'measurement').map((e): Cell[] => [
      formatMet(e.t), (l.ev as Record<string, string>)[e.type] ?? e.type, e.crewId === 'ALL' ? l.all : crewName(e.crewId),
      e.params ? Object.entries(e.params).map(([k, v]) => `${k}: ${v}`).join(', ') : '',
    ]),
  ];
  // self-check entries, corrections applied: one row each, with the status the value had against its limits
  const limitOf = new Map((report.limits ?? []).map((x) => [x.metric, x]));
  const selfcheck: Cell[][] = [
    [...l.selfcheck],
    ...manualEntries(report.events)
      .sort((a, b) => a.crewId.localeCompare(b.crewId) || a.t - b.t)
      .map((e): Cell[] => {
        const lim = limitOf.get(e.metric);
        const status = lim ? statusWord(evaluateMetric(e.value, { unit: lim.unit, low: lim.low, high: lim.high, hysteresis: 0 }), locale) : '';
        const value = e.metric === 'mood' ? `${e.value} (${l.mood[e.value]})` : e.value;
        return [crewName(e.crewId), metricName(e.metric, locale), value, MANUAL[e.metric].unit, status, e.at ? formatClock(e.at) : '', formatMet(e.t), l.byHand];
      }),
  ];
  const limits: Cell[][] = [
    [...l.limits],
    ...(report.limits ?? []).map((x): Cell[] => [
      metricName(x.metric, locale), x.unit,
      x.low?.caution, x.low?.warning, x.low?.critical, x.high?.caution, x.high?.warning, x.high?.critical,
      l.tier[x.tier], x.source,
    ]),
  ];
  return [
    { name: l.sheets.summary, rows: summary, widths: [38, 58] },
    { name: l.sheets.crew, rows: crew, widths: [18, 16, 11, 14, 13, 13, 20, 20, 20] },
    { name: l.sheets.incidents, rows: inc, widths: [18, 14, 14, 14, 16, 22, 16, 40, 34] },
    { name: l.sheets.events, rows: events, widths: [14, 26, 16, 36] },
    { name: l.sheets.selfcheck, rows: selfcheck, widths: [18, 18, 14, 9, 14, 24, 14, 18] },
    { name: l.sheets.limits, rows: limits, widths: [24, 9, 11, 11, 11, 11, 11, 11, 22, 90] },
  ];
}

export function downloadReportXlsx(report: MissionReport, locale: Locale): string {
  const name = `${(locale === 'en' ? T.en : T.ru).file}-${formatMet(report.toT).replace(/:/g, '-')}.xlsx`;
  downloadBytes(buildXlsx(buildReportSheets(report, locale)), name, XLSX_MIME);
  return name;
}
