import { describe, expect, it } from 'vitest';
import thresholds from '../../data/thresholds.json';
import { evaluateMetric, worstStatus } from './status';
import type { MetricThreshold } from './schemas';

const spo2 = (thresholds.metrics as Record<string, MetricThreshold>).spo2;

describe('status', () => {
  it('escalates immediately and releases only past the hysteresis band', () => {
    expect(evaluateMetric(91, spo2, 'NOMINAL')).toBe('WARNING');
    expect(evaluateMetric(92.5, spo2, 'WARNING')).toBe('WARNING'); // inside band
    expect(evaluateMetric(93.6, spo2, 'WARNING')).toBe('CAUTION'); // released one level
    expect(evaluateMetric(97, spo2, 'CAUTION')).toBe('NOMINAL');
  });
  it('worstStatus picks the highest severity', () => {
    expect(worstStatus(['NOMINAL', 'CRITICAL', 'CAUTION'])).toBe('CRITICAL');
    expect(worstStatus([])).toBe('NOMINAL');
  });
});
