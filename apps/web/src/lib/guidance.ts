import type { Status } from '@astro/engine';
import raw from '@astro/data/guidance.json';
import { baseCfg } from './engineConfig';
import type { Locale } from './store/missionStore';

interface Text { en: string; ru?: string; uz?: string }
type Level = 'caution' | 'warning' | 'critical';
type Side = 'high' | 'low';
type Entry = Partial<Record<Side, Record<Level, Text>>>;
const metrics = (raw as unknown as { metrics: Record<string, Entry> }).metrics;
export const guidanceProvisional = !!(raw as { provisional?: boolean }).provisional;

/** Blood pressure systolic and diastolic share one text. */
const ALIAS: Record<string, string> = { bpSys: 'bp', bpDia: 'bp' };

/** Uzbek falls back to Russian (like the voice), then to English. */
const pick = (t: Text, locale: Locale) => t[locale] ?? (locale === 'uz' ? t.ru : undefined) ?? t.en;

/** Which side of its range a reading is on: the nearer first-caution limit wins (also while a status is held by hysteresis). */
function sideOf(metric: string, value: number | undefined): Side | undefined {
  const th = baseCfg.thresholds.metrics[metric];
  if (!th) return undefined;
  if (th.high && !th.low) return 'high';
  if (th.low && !th.high) return 'low';
  if (!th.high || !th.low) return undefined;
  if (value === undefined || !Number.isFinite(value)) return 'high';
  return Math.abs(value - th.high.caution) <= Math.abs(value - th.low.caution) ? 'high' : 'low';
}

/**
 * One or two sentences: what to do first, for a reading that is out of range. Undefined for a nominal reading
 * or a metric without guidance. Illustrative, not validated by flight surgeons.
 */
export function guidanceFor(metric: string, status: Status, value: number | undefined, locale: Locale): string | undefined {
  if (status === 'NOMINAL') return undefined;
  const entry = metrics[ALIAS[metric] ?? metric];
  const side = sideOf(metric, value);
  const text = entry && side ? entry[side]?.[status.toLowerCase() as Level] : undefined;
  return text ? pick(text, locale) : undefined;
}
