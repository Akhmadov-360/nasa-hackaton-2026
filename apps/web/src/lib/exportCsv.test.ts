import { describe, expect, it } from 'vitest';
import { buildLogCsv } from './exportCsv';
import type { LogEntry } from './store/missionStore';

const rows: LogEntry[] = [
  { id: '1', t: 302400, kind: 'command', key: 'log.cmd.o2fault', params: { crewId: 'A2' } },
  { id: '2', t: 302410, kind: 'alert', severity: 'WARNING', key: 'log.alert', crewId: 'A2', metric: 'spo2', value: 92, unit: '%', trail: ['CAUTION', 'WARNING'] },
];

describe('buildLogCsv', () => {
  it('starts with a UTF-8 BOM so Excel reads Cyrillic correctly, and uses CRLF rows', () => {
    const csv = buildLogCsv(rows, 'ru');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Запущен сбой подачи O₂');
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('splits an alert into separate columns and escapes quotes', () => {
    const csv = buildLogCsv(rows, 'en');
    const alert = csv.split('\r\n')[2];
    expect(alert).toContain('"alert","WARNING","Arman Tashev","spo2","92","%"');
    expect(buildLogCsv([{ ...rows[0], key: 'log.system.start', params: undefined }], 'en')).not.toContain('undefined');
  });
});
