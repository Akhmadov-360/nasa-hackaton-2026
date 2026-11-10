import { describe, expect, it, vi } from 'vitest';
import type { Alert } from '@astro/engine';
import { notifyAlert, voiceText } from './alertCenter';
import { useMissionStore } from '../store/missionStore';

const alert: Alert = { id: 'a', t: 1, crewId: 'A2', metric: 'spo2', severity: 'CRITICAL', message: 'spo2 critical (86.0 %)' };

describe('notifyAlert', () => {
  it('still shows the toast and logs once when voice/audio throws', () => {
    const toast = vi.fn();
    const log = vi.fn();
    const speak = vi.fn(() => { throw new Error('speechSynthesis blocked'); });
    const beep = vi.fn(() => { throw new Error('AudioContext blocked'); });
    expect(() => notifyAlert(alert, { toast, log, speak, beep })).not.toThrow();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('does not toast or speak CAUTION, but still logs it', () => {
    const d = { toast: vi.fn(), log: vi.fn(), speak: vi.fn(), beep: vi.fn() };
    notifyAlert({ ...alert, severity: 'CAUTION' }, d);
    expect(d.toast).not.toHaveBeenCalled();
    expect(d.speak).not.toHaveBeenCalled();
    expect(d.log).toHaveBeenCalledTimes(1);
  });

  it('speaks in the interface language with the value and unit spelled out', () => {
    const a: Alert = { ...alert, metric: 'spo2', value: 87.9, unit: '%', severity: 'CRITICAL' };
    useMissionStore.setState({ locale: 'ru' });
    expect(voiceText(a)).toBe('Авария. Arman Tashev: кислород в крови, 88 процентов.');
    useMissionStore.setState({ locale: 'en' });
    expect(voiceText(a)).toBe('Emergency. Arman Tashev: blood oxygen, 88 percent.');
  });
});
