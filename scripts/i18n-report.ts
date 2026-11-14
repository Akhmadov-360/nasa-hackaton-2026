/**
 * Translation coverage report: `pnpm i18n:report`. Lists, per language, the keys with no text (they fall back: Uzbek to
 * Russian, then English) and the strings equal to the English text. Exit code 1 when Russian is incomplete.
 * The Uzbek texts are a draft for a native speaker to read, especially the medical terms.
 */
import { dictionaries } from '../apps/web/src/lib/i18n';
import { coverage, groupMissing } from '../apps/web/src/lib/i18nCoverage';

const en = dictionaries.en as Record<string, string>;
let failed = false;
for (const loc of ['ru', 'uz'] as const) {
  const c = coverage(en, dictionaries[loc] as Record<string, string>);
  const pct = Math.round((c.translated / c.total) * 100);
  console.log(`\n${loc}: ${c.translated}/${c.total} translated (${pct} %), ${c.missing.length} missing, ${c.sameAsEnglish.length} equal to English`);
  if (c.missing.length) {
    console.log('  missing by group: ' + groupMissing(c.missing).map(([g, n]) => `${g} ${n}`).join(', '));
    if (process.argv.includes('--keys')) console.log('  ' + c.missing.join('\n  '));
  }
  if (c.sameAsEnglish.length) console.log('  equal to English: ' + c.sameAsEnglish.join(', '));
  if (loc === 'ru' && c.missing.length) failed = true;
}
console.log('\nUzbek falls back to Russian, then English. Voice alerts are spoken in Russian for Uzbek.');
process.exit(failed ? 1 : 0);
