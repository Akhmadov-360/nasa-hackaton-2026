import { describe, expect, it } from 'vitest';
import { buildReport, type EngineEvent } from '@astro/engine';
import { baseCfg } from './engineConfig';
import { buildReportSheets } from './exportReport';

const entry = (t: number, metric: string, value: number, id: string, at?: number): EngineEvent => ({
  t, type: 'measurement', crewId: 'A1', params: { metric, value, id, ...(at ? { at } : {}) },
});

describe('self-check in the Excel report', () => {
  const log: EngineEvent[] = [
    entry(302400, 'glucose', 52, 'g1', 1.78e12),
    entry(302410, 'hydration', 0.5, 'w1', 1.78e12 + 10000),
    entry(302420, 'hydration', 5, 'w2'), // invalid: dropped
    entry(302430, 'mood', 4, 'm1'),
    entry(302440, 'sleep', 6, 's1'),
    { t: 302500, type: 'measurement', crewId: 'A1', params: { metric: 'sleep', retract: 's1' } }, // removed
  ];
  const report = buildReport({ ...baseCfg, log }, { fromT: 302300, toT: 302700 });

  it('has a Self-check sheet with one row per valid entry, with a date, the unit and the status against its limits', () => {
    const sheet = buildReportSheets(report, 'en').find((s) => s.name === 'Self-check')!;
    expect(sheet.rows[0]).toEqual(['Crew member', 'Reading', 'Value', 'Unit', 'Status', 'Date and time (local)', 'MET', 'Entered by']);
    const body = sheet.rows.slice(1);
    expect(body.map((r) => r[1])).toEqual(['blood glucose', 'water intake', 'mood rating']);
    const glucose = body[0];
    expect(glucose[2]).toBe(52);
    expect(glucose[3]).toBe('mg/dL');
    expect(glucose[4]).toBe('Warning');
    expect(String(glucose[5])).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(glucose[6]).toBe('003:12:00:00');
    expect(body[1][4]).toBe(''); // water has no limits
    expect(body[2][2]).toBe('4 (Good)');
    expect(body[2][5]).toBe(''); // no wall-clock time recorded for this one
  });

  it('keeps the entries out of the Events sheet and is translated', () => {
    const sheets = buildReportSheets(report, 'ru');
    expect(sheets.find((s) => s.name === 'События')!.rows.some((r) => String(r[1]).includes('Ввод самоконтроля'))).toBe(false);
    const sc = sheets.find((s) => s.name === 'Самоконтроль')!;
    expect(sc.rows[1][4]).toBe('Тревога');
  });
});
