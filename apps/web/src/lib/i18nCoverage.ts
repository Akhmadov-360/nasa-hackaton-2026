/** How much of a language is translated, from the dictionaries. Pure; used by the test and by `pnpm i18n:report`. */
export interface Coverage {
  total: number;
  translated: number;
  /** keys with no text in this language (they fall back: Uzbek to Russian, the rest to English) */
  missing: string[];
  /** keys whose text equals the English one: untranslated, or fine (units, names like "MET") */
  sameAsEnglish: string[];
}

export function coverage(en: Record<string, string | undefined>, other: Record<string, string | undefined>): Coverage {
  const keys = Object.keys(en);
  const missing = keys.filter((k) => !other[k]);
  const sameAsEnglish = keys.filter((k) => other[k] !== undefined && other[k] === en[k]);
  return { total: keys.length, translated: keys.length - missing.length, missing, sameAsEnglish };
}

/** "report.title" -> "report": a group to read the gaps by. */
export function groupMissing(keys: string[]): Array<[string, number]> {
  const by: Record<string, number> = {};
  for (const k of keys) by[k.split('.')[0]] = (by[k.split('.')[0]] ?? 0) + 1;
  return Object.entries(by).sort((a, b) => b[1] - a[1]);
}
