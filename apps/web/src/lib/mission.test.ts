import { describe, expect, it } from 'vitest';
import { delayText, escalationFor, gravityText, missionLabel, missionOf, missionPlace, missions, roundTripText } from './mission';
import { DEFAULT_MISSION, isMissionId } from './missionData';
import { useMissionStore } from './store/missionStore';

describe('mission contexts', () => {
  it('describes every context in English and Russian with sane numbers', () => {
    expect(missions.map((m) => m.id)).toEqual(['leo', 'gateway', 'moonSurface', 'marsTransit', 'marsSurface']);
    for (const m of missions) {
      expect(m.label.en.length).toBeGreaterThan(3);
      expect(m.label.ru?.length).toBeGreaterThan(3);
      expect(m.place.en.length).toBeGreaterThan(10);
      expect(m.place.ru?.length).toBeGreaterThan(10);
      expect(m.delaySec[0]).toBeGreaterThan(0);
      expect(m.delaySec[1]).toBeGreaterThanOrEqual(m.delaySec[0]);
      expect(m.gravityG).toBeGreaterThanOrEqual(0);
      expect(m.gravityG).toBeLessThan(1);
    }
  });

  it('uses the documented delays and gravity: the station is not 1.3 s away, the Moon is, Mars is minutes', () => {
    expect(delayText(missionOf('leo').delaySec, 'en')).toBe('0.25–0.5 s');
    expect(delayText(missionOf('moonSurface').delaySec, 'en')).toBe('1.28 s');
    expect(roundTripText(missionOf('moonSurface'), 'en')).toBe('2.56 s');
    expect(delayText(missionOf('marsTransit').delaySec, 'en')).toBe('3–22 min');
    expect(delayText(missionOf('marsSurface').delaySec, 'ru')).toBe('3–22 мин');
    expect(gravityText(missionOf('leo'))).toBe('0 g');
    expect(gravityText(missionOf('moonSurface'))).toBe('0.165 g');
    expect(missionOf('moonSurface').gravityG).toBe(0.165);
    expect(missionOf('marsSurface').gravityG).toBe(0.38);
    expect(missionOf('gateway').gravityG).toBe(0);
    expect(missionOf('marsTransit').gravityG).toBe(0);
  });

  it('gives escalation advice only for a warning or a critical reading, live near the Earth and delayed at Mars', () => {
    const leo = missionOf('leo');
    const mars = missionOf('marsSurface');
    expect(escalationFor(leo, 'NOMINAL', 'en')).toBeUndefined();
    expect(escalationFor(leo, 'CAUTION', 'en')).toBeUndefined();
    expect(escalationFor(leo, 'WARNING', 'en')).toMatch(/Call Mission Control now/);
    expect(escalationFor(mars, 'CRITICAL', 'en')).toMatch(/Act on the checklist/);
    expect(escalationFor(mars, 'CRITICAL', 'en')).toMatch(/6–45 min/);
    expect(escalationFor(mars, 'WARNING', 'ru')).toMatch(/чек-листу/);
    expect(escalationFor(mars, 'WARNING', 'uz')).toBe(escalationFor(mars, 'WARNING', 'en')); // no Uzbek text yet: English
  });

  it('falls back from Uzbek to Russian for names', () => {
    const m = missionOf('gateway');
    expect(missionLabel(m, 'uz')).toBe(m.label.ru);
    expect(missionPlace(m, 'en')).toBe(m.place.en);
  });

  it('starts at the station, rejects unknown ids, and replays at 1x by default', () => {
    expect(isMissionId('nowhere')).toBe(false);
    expect(useMissionStore.getState().missionId).toBe(DEFAULT_MISSION);
    useMissionStore.getState().setMission('nowhere');
    expect(useMissionStore.getState().missionId).toBe(DEFAULT_MISSION);
    useMissionStore.getState().setMission('marsTransit');
    expect(useMissionStore.getState().missionId).toBe('marsTransit');
    expect(useMissionStore.getState().replaySpeed).toBe(1);
  });
});
