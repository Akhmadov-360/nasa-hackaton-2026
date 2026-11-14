import { describe, expect, it } from 'vitest';
import guidance from '../../../../packages/data/guidance.json';
import thresholds from '../../../../packages/data/thresholds.json';
import { guidanceFor } from './guidance';

type Text = { en: string; ru?: string };
const metrics = (guidance as unknown as { metrics: Record<string, Partial<Record<'high' | 'low', Record<string, Text>>>> }).metrics;
const alias: Record<string, string> = { bpSys: 'bp', bpDia: 'bp' };

describe('do-now guidance', () => {
  it('covers every limit of every metric that has thresholds (EEG has none), at all three levels, in English and Russian', () => {
    for (const [metric, th] of Object.entries(thresholds.metrics as Record<string, { high?: unknown; low?: unknown }>)) {
      const entry = metrics[alias[metric] ?? metric];
      expect(entry, `guidance for ${metric}`).toBeDefined();
      for (const side of ['high', 'low'] as const) {
        if (!th[side]) continue;
        for (const level of ['caution', 'warning', 'critical']) {
          const t = entry[side]?.[level];
          expect(t?.en?.length, `${metric}.${side}.${level} en`).toBeGreaterThan(10);
          expect(t?.ru?.length, `${metric}.${side}.${level} ru`).toBeGreaterThan(10);
        }
      }
    }
  });

  it('is empty for a normal reading, picks the side of the range, and falls back from Uzbek to Russian', () => {
    expect(guidanceFor('hr', 'NOMINAL', 70, 'en')).toBeUndefined();
    expect(guidanceFor('hr', 'WARNING', 130, 'en')).toMatch(/Stop all activity/);
    expect(guidanceFor('hr', 'WARNING', 40, 'en')).toMatch(/Lie down/);
    expect(guidanceFor('co2', 'CAUTION', 3.2, 'ru')).toMatch(/CO₂/);
    expect(guidanceFor('co2', 'CAUTION', 3.2, 'uz')).toBe(guidanceFor('co2', 'CAUTION', 3.2, 'ru'));
    expect(guidanceFor('eeg', 'WARNING', 5, 'en')).toBeUndefined();
  });
});
