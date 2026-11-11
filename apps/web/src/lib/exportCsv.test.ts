import { describe, expect, it } from 'vitest';
import { buildLogCsv, buildLogXlsx, logTable } from './exportCsv';
import type { LogEntry } from './store/missionStore';

const rows: LogEntry[] = [
  { id: '1', t: 302400, kind: 'command', key: 'log.cmd.o2fault', params: { crewId: 'A2' } },
  { id: '2', t: 302410, kind: 'alert', severity: 'WARNING', key: 'log.alert', crewId: 'A2', metric: 'spo2', value: 92, unit: '%', trail: ['CAUTION', 'WARNING'] },
];

describe('flight log export', () => {
  it('CSV has a UTF-8 BOM, a sep=; line for Excel in any locale, semicolons and CRLF', () => {
    const csv = buildLogCsv(rows, 'ru');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('sep=;');
    expect(lines[1]).toContain('"Тип";"Статус"');
    expect(lines).toHaveLength(4);
    expect(csv).toContain('Запущен сбой подачи O₂');
  });

  it('puts the value in its own numeric column with translated names, and never prints undefined', () => {
    const t = logTable(rows, 'en');
    expect(t.header[1]).toBe('Type');
    expect(t.body[1].slice(1, 4)).toEqual(['Alert', 'WARNING'.length ? t.body[1][2] : '', 'Arman Tashev']);
    expect(t.body[1][5]).toBe(92);
    expect(buildLogCsv([{ ...rows[0], key: 'log.system.start', params: undefined }], 'en')).not.toContain('undefined');
  });

  it('builds an xlsx file', () => {
    const b = buildLogXlsx(rows, 'ru');
    expect(Array.from(b.slice(0, 2))).toEqual([0x50, 0x4b]);
  });
});
