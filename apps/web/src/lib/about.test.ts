import { describe, expect, it } from 'vitest';
import thresholds from '../../../../packages/data/thresholds.json';
import { aboutFor, aboutKeyOf, aboutTitleKey, hazardIndex, organAbout, pickText, RISK_URL } from './about';
import { translate } from './i18n';
import { ORGANS } from './metrics';

const HAZARDS = ['radiation', 'isolation', 'distance', 'gravity', 'closed'];
const FIELDS = ['why', 'inSpace', 'how', 'redFlags'] as const;

describe('about this indicator', () => {
  it('covers every metric that has limits, plus the two radiation readings', () => {
    for (const metric of [...Object.keys(thresholds.metrics), 'doseRate', 'dose']) {
      expect(aboutFor(metric), `about for ${metric}`).toBeDefined();
    }
  });

  it('has English and Russian text in every field, known hazards and at least one HRP risk', () => {
    const keys = new Set([...Object.keys(thresholds.metrics), 'doseRate', 'dose'].map(aboutKeyOf));
    for (const k of keys) {
      const a = aboutFor(k)!;
      for (const f of FIELDS) {
        expect(a[f].en.length, `${k}.${f} en`).toBeGreaterThan(20);
        expect(a[f].ru?.length, `${k}.${f} ru`).toBeGreaterThan(20);
      }
      expect(a.hazards.length, `${k} hazards`).toBeGreaterThan(0);
      for (const h of a.hazards) expect(HAZARDS, `${k} hazard ${h}`).toContain(h);
      expect(a.risks.length, `${k} risks`).toBeGreaterThan(0);
    }
  });

  it('describes every organ of the body scan in both languages', () => {
    for (const o of ORGANS) {
      expect(organAbout(o.id, 'en')?.text.length, `${o.id} en`).toBeGreaterThan(20);
      expect(organAbout(o.id, 'ru')?.text.length, `${o.id} ru`).toBeGreaterThan(20);
    }
  });

  it('shares one entry for both blood-pressure numbers and falls back from Uzbek to Russian', () => {
    expect(aboutFor('bpSys')).toBe(aboutFor('bpDia'));
    const a = aboutFor('hr')!;
    expect(pickText(a.why, 'uz')).toBe(a.why.ru);
    expect(pickText(a.why, 'en')).toBe(a.why.en);
  });

  it('points to the NASA Human Research Program', () => {
    expect(RISK_URL).toMatch(/^https:\/\/www\.nasa\.gov\/hrp\//);
  });

  it('lists every hazard with at least one indicator, and every indicator has a title', () => {
    const index = hazardIndex();
    expect(Object.keys(index).sort()).toEqual(['closed', 'distance', 'gravity', 'isolation', 'radiation']);
    for (const [h, keys] of Object.entries(index)) {
      expect(keys.length, `indicators for ${h}`).toBeGreaterThan(0);
      for (const k of keys) {
        expect(translate('en', aboutTitleKey(k)), `title of ${k}`).not.toBe(aboutTitleKey(k));
        expect(translate('ru', aboutTitleKey(k)), `ru title of ${k}`).not.toBe(aboutTitleKey(k));
      }
      for (const loc of ['en', 'ru'] as const) {
        expect(translate(loc, `hazard.desc.${h}` as never).length).toBeGreaterThan(20);
      }
    }
  });
});
