import { describe, expect, it } from 'vitest';
import { dictionaries, translate } from './i18n';
import { coverage, groupMissing } from './i18nCoverage';

describe('i18n', () => {
  it('Russian is complete and no dictionary has keys that English lacks', () => {
    const en = Object.keys(dictionaries.en);
    expect(en.filter((k) => !(k in dictionaries.ru))).toEqual([]);
    for (const l of ['ru', 'uz'] as const) {
      expect(Object.keys(dictionaries[l]).filter((k) => !(k in dictionaries.en))).toEqual([]);
    }
  });

  it('Uzbek falls back to Russian, then English, and never shows a raw key', () => {
    const missing = Object.keys(dictionaries.en).filter((k) => !(k in dictionaries.uz));
    expect(missing.length).toBeGreaterThan(0); // the draft is not complete yet: the fallback is in use
    for (const k of missing) {
      expect(translate('uz', k as never)).toBe(dictionaries.ru[k as never] ?? dictionaries.en[k as never]);
      expect(translate('uz', k as never)).not.toBe(k);
    }
    expect(translate('uz', 'selfcheck.save')).toBe('Saqlash');
  });

  it('Uzbek has no empty text and keeps the placeholders of the English text', () => {
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const [k, v] of Object.entries(dictionaries.uz)) {
      expect(v, k).toBeTruthy();
      expect(holes(v as string), `placeholders of ${k}`).toBe(holes(dictionaries.en[k as never] as string));
    }
  });

  it('says in every language that the voice is Russian for Uzbek', () => {
    for (const l of ['en', 'ru', 'uz'] as const) expect(translate(l, 'voice.note').length).toBeGreaterThan(20);
  });

  it('measures coverage: what is missing and what equals English', () => {
    const c = coverage({ a: 'x', b: 'y', c: 'z' }, { a: 'x', b: 'Y2' });
    expect(c).toEqual({ total: 3, translated: 2, missing: ['c'], sameAsEnglish: ['a'] });
    expect(groupMissing(['report.a', 'report.b', 'unit.c'])).toEqual([['report', 2], ['unit', 1]]);
  });
});
