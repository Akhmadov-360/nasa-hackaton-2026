import { crewName } from './engineConfig';
import { metricName, statusWord } from './i18n';
import { formatMet } from './metrics';
import { logText } from './logText';
import type { LogEntry, Locale } from './store/missionStore';
import { buildXlsx, downloadBytes, XLSX_MIME, type Cell } from './xlsx';

const L = {
  en: { head: ['MET', 'Type', 'Status', 'Crew member', 'Reading', 'Value', 'Unit', 'Event'], kind: { alert: 'Alert', command: 'Command', link: 'Link', system: 'System' }, sheet: 'Flight log' },
  ru: { head: ['MET', 'Тип', 'Статус', 'Астронавт', 'Показатель', 'Значение', 'Ед.', 'Событие'], kind: { alert: 'Тревога', command: 'Команда', link: 'Связь', system: 'Система' }, sheet: 'Бортовой журнал' },
} as const;
const pick = (locale: Locale) => (locale === 'en' ? L.en : L.ru);

/** The log as a table of cells: real numbers in the value column, translated type / status / reading names. */
export function logTable(rows: LogEntry[], locale: Locale): { header: string[]; body: Cell[][] } {
  const l = pick(locale);
  const body = rows.map((e): Cell[] => [
    formatMet(e.t),
    (l.kind as Record<string, string>)[e.kind] ?? e.kind,
    e.severity ? statusWord(e.severity, locale) : '',
    e.crewId ? crewName(e.crewId) : '',
    e.metric ? metricName(e.metric, locale) : '',
    e.value !== undefined && Number.isFinite(e.value) ? Math.round(e.value * 1000) / 1000 : '',
    e.unit ?? '',
    logText(e, locale),
  ]);
  return { header: [...l.head], body };
}

const esc = (v: Cell) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * CSV that Excel opens in columns in every regional setting: UTF-8 BOM (Cyrillic), a `sep=;` first line
 * (Excel then ignores the computer's list separator) and semicolons between fields.
 */
export function buildLogCsv(rows: LogEntry[], locale: Locale): string {
  const { header, body } = logTable(rows, locale);
  const lines = [header, ...body].map((r) => r.map(esc).join(';'));
  return '﻿sep=;\r\n' + lines.join('\r\n');
}

export function buildLogXlsx(rows: LogEntry[], locale: Locale): Uint8Array {
  const { header, body } = logTable(rows, locale);
  return buildXlsx([{ name: pick(locale).sheet, rows: [header, ...body], widths: [14, 12, 14, 18, 22, 10, 8, 70] }]);
}

export function downloadLogCsv(rows: LogEntry[], locale: Locale): void {
  downloadBytes(new TextEncoder().encode(buildLogCsv(rows, locale)), 'flight-log.csv', 'text/csv;charset=utf-8');
}

export function downloadLogXlsx(rows: LogEntry[], locale: Locale): void {
  downloadBytes(buildLogXlsx(rows, locale), 'flight-log.xlsx', XLSX_MIME);
}
