import { crewName } from './engineConfig';
import { formatMet } from './metrics';
import { logText, formatValue } from './logText';
import type { LogEntry, Locale } from './store/missionStore';

const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Flight log as CSV that Excel opens correctly: UTF-8 with a BOM (otherwise Excel assumes ANSI and garbles
 * Cyrillic) and CRLF row endings. Alerts get their own crew / metric / value / unit columns.
 */
export function buildLogCsv(rows: LogEntry[], locale: Locale): string {
  const header = ['MET', 'type', 'status', 'crew', 'metric', 'value', 'unit', 'text'].map(esc).join(',');
  const body = rows.map((e) =>
    [
      formatMet(e.t),
      e.kind,
      e.severity ?? '',
      e.crewId ? crewName(e.crewId) : '',
      e.metric ?? '',
      e.value !== undefined ? formatValue(e.metric, e.value, e.unit).split(' ')[0] : '',
      e.unit ?? '',
      logText(e, locale),
    ].map(esc).join(','),
  );
  return '﻿' + [header, ...body].join('\r\n');
}

export function downloadLogCsv(rows: LogEntry[], locale: Locale): void {
  const blob = new Blob([buildLogCsv(rows, locale)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flight-log.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
